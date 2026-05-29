@echo off
chcp 65001 >nul
cd /d C:\Users\h.kadoya\Desktop\slocri
if not exist logs mkdir logs

set PROMPT=bat\prompts\%1
set LOG=logs\claude_task_%1.log

if not exist "%PROMPT%" (
    echo [%date% %time%] ERROR prompt not found: %PROMPT% >> "%LOG%"
    exit /b 1
)

echo [%date% %time%] START %1 >> "%LOG%" 2>&1
type "%PROMPT%" | "C:\Users\h.kadoya\.local\bin\claude.exe" -p --dangerously-skip-permissions >> "%LOG%" 2>&1
echo [%date% %time%] DONE %1 exit=%errorlevel% >> "%LOG%" 2>&1
