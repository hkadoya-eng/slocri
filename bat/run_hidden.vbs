' Generic hidden launcher for Slocri scheduled tasks.
' Usage (scheduled task action): wscript.exe "...\bat\run_hidden.vbs" <batFileName> [args...]
'   arg0      = bat file name located in the same folder as this script (e.g. run_claude_task.bat)
'   arg1..    = arguments passed through to that bat
' Runs the bat in a fully hidden window (style 0) so no console pops up and focus is never stolen.
' bWaitOnReturn = True keeps the scheduled task "Running" until the bat finishes
' (preserves MultipleInstances=IgnoreNew overlap protection).
Dim sh, fso, batDir, cmd, i, a
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
batDir = fso.GetParentFolderName(WScript.ScriptFullName)
cmd = ""
For i = 0 To WScript.Arguments.Count - 1
  a = WScript.Arguments(i)
  If i = 0 Then
    cmd = """" & batDir & "\" & a & """"
  Else
    cmd = cmd & " " & a
  End If
Next
sh.Run cmd, 0, True
