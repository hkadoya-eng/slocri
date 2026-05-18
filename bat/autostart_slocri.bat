@echo off
chcp 65001 >nul

REM Open slocri project in VS Code (boots Claude Code extension)
start "" "C:\Users\h.kadoya\AppData\Local\Programs\Microsoft VS Code\Code.exe" "C:\Users\h.kadoya\Desktop\slocri"

REM Wait 5 seconds, then launch Claude Code CLI in minimized cmd window
REM with initial prompt so CLAUDE.md auto-registers all 5 cron jobs.
REM WARNING: Closing the "Claude Auto Cron" window stops all cron jobs!
timeout /t 5 /nobreak >nul
start "Claude Auto Cron - DO NOT CLOSE" /MIN cmd /k "cd /d C:\Users\h.kadoya\Desktop\slocri && C:\Users\h.kadoya\.local\bin\claude.exe セッション開始時の必須動作を実行してください"
