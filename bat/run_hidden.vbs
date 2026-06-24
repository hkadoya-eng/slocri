' Hidden launcher for Slocri headless claude tasks.
' Runs bat\run_claude_task.bat with the given prompt-file arg in a fully hidden window
' (window style 0 = hidden), so no console pops up and focus is never stolen.
' bWaitOnReturn = True so the scheduled task stays "Running" until claude finishes
' (preserves MultipleInstances=IgnoreNew overlap protection).
Dim sh, arg, cmd
Set sh = CreateObject("WScript.Shell")
arg = ""
If WScript.Arguments.Count > 0 Then arg = WScript.Arguments(0)
cmd = """C:\Users\h.kadoya\Desktop\slocri\bat\run_claude_task.bat"" " & arg
sh.Run cmd, 0, True
