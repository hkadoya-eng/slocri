@echo off
chcp 65001 >nul
cd /d C:\Users\h.kadoya\Desktop\slocri
if not exist logs mkdir logs

rem --- tmp/ scratch cleanup: the cron jobs dump ~150-220 curl/py scratch files per day
rem --- (about 13-20MB) and never clean up, so keep only a 14-day rolling window.
rem --- Files only (@isdir==FALSE) so subdirs like tmp\fscan survive. Nothing reads
rem --- these back - each job regenerates its own dumps - so deletion is safe.
if exist tmp forfiles /p tmp /m *.* /d -14 /c "cmd /c if @isdir==FALSE del /q @path" >nul 2>&1

set PROMPT=bat\prompts\%1
set LOG=logs\claude_task_%1.log

rem --- log rotation: chat_tick/req_tick append every 10-30min and grow forever.
rem --- over 5MB, the current log becomes .log.1 (one generation kept) and a fresh log starts.
set LOGSIZE=
for %%F in ("%LOG%") do set LOGSIZE=%%~zF
if not defined LOGSIZE set LOGSIZE=0
if %LOGSIZE% GTR 5242880 (
    if exist "%LOG%.1" del "%LOG%.1"
    move /y "%LOG%" "%LOG%.1" >nul
)

if not exist "%PROMPT%" (
    echo [%date% %time%] ERROR prompt not found: %PROMPT% >> "%LOG%"
    exit /b 1
)

echo [%date% %time%] START %1 >> "%LOG%" 2>&1
type "%PROMPT%" | "C:\Users\h.kadoya\.local\bin\claude.exe" -p --dangerously-skip-permissions >> "%LOG%" 2>&1
echo [%date% %time%] DONE %1 exit=%errorlevel% >> "%LOG%" 2>&1
