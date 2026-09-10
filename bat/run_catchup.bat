@echo off
chcp 65001 > nul
rem Launched by run_hidden.vbs from SlocriCatchupOnLogon.
rem Runs the catch-up decision script that restarts only the occurrences dropped
rem while nobody was logged on.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0catchup_missed.ps1"
exit /b %errorlevel%