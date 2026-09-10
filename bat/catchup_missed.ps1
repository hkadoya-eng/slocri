# Slocri catch-up runner.
# Fired by SlocriCatchupOnLogon (at logon, 3 min delay).
#
# Why: every Slocri task runs with LogonType=Interactive ("run only when the user
# is logged on"). While nobody is logged on (e.g. a Windows Update reboot at 3:30
# with no logon until 10:20, 2026-09-10) the scheduler silently drops every
# occurrence with event 332 and StartWhenAvailable never fires. This script runs
# once per logon, works out which scheduled occurrences were dropped, and starts
# only those - sequentially, so two headless claude runs never fight over the
# git index lock (see project_sis_task_collision_fix).
#
# A plain -AtLogOn trigger on each task would re-run everything on every logon;
# that is why the decision lives here instead.

$ErrorActionPreference = 'Stop'

$LogFile      = Join-Path $PSScriptRoot '..\logs\catchup.log'
$LockFile     = Join-Path $env:TEMP 'slocri_catchup.lock'
$MaxAgeHours  = 72      # ignore occurrences older than this (long absence != backfill everything)
$WaitMinutes  = 45      # per-task wait before giving up on "still Running"
$TotalMinutes = 180     # overall budget

function Write-Log([string]$msg) {
  $line = "[{0:yyyy/MM/dd HH:mm:ss}] {1}" -f (Get-Date), $msg
  Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8
}

# --- schedules (keep in sync with CLAUDE.md "tasukusukejura kankatsu jobu") ---
# Days: empty array = every day. Otherwise DayOfWeek names.
$Schedules = @(
  @{ Task = 'SlocriGameDesignWeekly'; Time = '07:22'; Days = @() },
  @{ Task = 'SlocriNetaCollect_0900'; Time = '09:00'; Days = @() },
  @{ Task = 'SlocriNetaCollect_1330'; Time = '13:30'; Days = @() },
  @{ Task = 'SlocriColumnWeekly';     Time = '05:00'; Days = @('Monday','Wednesday','Friday') },
  @{ Task = 'SlocriProposalWeekly';   Time = '06:42'; Days = @('Monday','Wednesday','Friday') },
  @{ Task = 'SlocriCalendarWeekly';   Time = '06:12'; Days = @('Tuesday') },
  @{ Task = 'SlocriIdeaColumn';       Time = '08:12'; Days = @('Saturday') },
  # SIS tasks are triply redundant (10/11/12). Catching up one run is enough.
  @{ Task = 'SlocriSisImport_1200';   Time = '12:00'; Days = @('Monday','Tuesday','Wednesday','Thursday','Friday') },
  @{ Task = 'SlocriSisWeekly_1200';   Time = '12:07'; Days = @('Thursday') }
)

function Get-LastOccurrence($sched, [datetime]$now) {
  $hm = $sched.Time.Split(':')
  for ($back = 0; $back -le 8; $back++) {
    $d = $now.Date.AddDays(-$back)
    if ($sched.Days.Count -gt 0 -and ($sched.Days -notcontains $d.DayOfWeek.ToString())) { continue }
    $occ = $d.AddHours([int]$hm[0]).AddMinutes([int]$hm[1])
    if ($occ -le $now) { return $occ }
  }
  return $null
}

# --- single instance guard ---
if (Test-Path -LiteralPath $LockFile) {
  $age = (Get-Date) - (Get-Item -LiteralPath $LockFile).LastWriteTime
  if ($age.TotalMinutes -lt $TotalMinutes) { exit 0 }
}
Set-Content -LiteralPath $LockFile -Value $PID -Encoding ASCII

try {
  $now = Get-Date
  Write-Log "=== catch-up start (logon) ==="

  $missed = @()
  foreach ($s in $Schedules) {
    $occ = Get-LastOccurrence $s $now
    if (-not $occ) { continue }
    if (($now - $occ).TotalHours -gt $MaxAgeHours) { continue }

    $task = Get-ScheduledTask -TaskName $s.Task -ErrorAction SilentlyContinue
    if (-not $task) { Write-Log ("SKIP {0}: task not found" -f $s.Task); continue }
    if ($task.State -eq 'Disabled') { Write-Log ("SKIP {0}: disabled" -f $s.Task); continue }
    if ($task.State -eq 'Running')  { Write-Log ("SKIP {0}: already running" -f $s.Task); continue }

    $last = (Get-ScheduledTaskInfo -TaskName $s.Task).LastRunTime
    if ($last -and $last -ge $occ.AddMinutes(-2)) { continue }   # already ran that occurrence

    $missed += [pscustomobject]@{ Task = $s.Task; Occurrence = $occ; LastRun = $last }
  }

  if ($missed.Count -eq 0) { Write-Log 'nothing missed'; Write-Log '=== catch-up end ==='; exit 0 }

  # oldest occurrence first, so the day's work lands in its natural order
  $missed = $missed | Sort-Object Occurrence
  Write-Log ("missed {0}: {1}" -f $missed.Count, (($missed | ForEach-Object { "$($_.Task)@$($_.Occurrence.ToString('MM/dd HH:mm'))" }) -join ', '))

  $deadline = $now.AddMinutes($TotalMinutes)
  foreach ($m in $missed) {
    if ((Get-Date) -ge $deadline) { Write-Log 'total budget exhausted, stopping'; break }

    Write-Log ("START {0} (missed {1:MM/dd HH:mm}, last run {2})" -f $m.Task, $m.Occurrence, $m.LastRun)
    Start-ScheduledTask -TaskName $m.Task

    # wait for completion so the next headless claude does not collide on git
    $waitUntil = (Get-Date).AddMinutes($WaitMinutes)
    do {
      Start-Sleep -Seconds 20
      Set-Content -LiteralPath $LockFile -Value $PID -Encoding ASCII   # keep the lock fresh
      $state = (Get-ScheduledTask -TaskName $m.Task).State
    } while ($state -eq 'Running' -and (Get-Date) -lt $waitUntil)

    $rc = (Get-ScheduledTaskInfo -TaskName $m.Task).LastTaskResult
    Write-Log ("DONE  {0} state={1} result={2}" -f $m.Task, $state, $rc)
  }

  Write-Log '=== catch-up end ==='
}
catch {
  Write-Log ("ERROR {0}" -f $_.Exception.Message)
  exit 1
}
finally {
  Remove-Item -LiteralPath $LockFile -ErrorAction SilentlyContinue
}
