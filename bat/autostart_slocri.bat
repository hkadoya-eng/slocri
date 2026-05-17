@echo off
chcp 65001 >nul
REM PC起動時にslocriプロジェクトをVS Codeで自動オープン
REM → VS Code内のClaude Code extensionが復元され、cron稼働の足場が立ち上がる
start "" "C:\Users\h.kadoya\AppData\Local\Programs\Microsoft VS Code\Code.exe" "C:\Users\h.kadoya\Desktop\slocri"
