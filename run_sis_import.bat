@echo off
cd /d C:\Users\h.kadoya\Desktop\slocri

set XLS=Z:\01_SISデータ\PS\PS日毎稼働まとめ_2026.xlsm
set STAMP=logs\sis_daily_stamp.txt
set LOG=logs\sis_import.log

if not exist logs mkdir logs

python check_mtime.py "%XLS%" "%STAMP%" > logs\sis_daily_check.txt 2>&1

findstr "CHANGED" logs\sis_daily_check.txt > nul
if errorlevel 1 (
    echo [%date% %time%] daily: no change, skip >> %LOG%
    exit /b 0
)

echo [%date% %time%] daily import start >> %LOG% 2>&1
python import_sis.py --force >> %LOG% 2>&1
python build_sis_library.py >> %LOG% 2>&1

git diff --quiet src\sisLibrary.json
if errorlevel 1 (
    echo [%date% %time%] sisLibrary.json updated, pushing... >> %LOG% 2>&1
    git add src\sisLibrary.json
    git commit -m "SIS稼働データ更新 %date%"
    git push
    echo [%date% %time%] push done >> %LOG% 2>&1
) else (
    echo [%date% %time%] no diff, skip push >> %LOG% 2>&1
)