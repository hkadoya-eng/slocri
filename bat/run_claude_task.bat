@echo off
chcp 65001 >nul
cd /d C:\Users\h.kadoya\Desktop\slocri
if not exist logs mkdir logs

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
