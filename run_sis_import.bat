@echo off
cd /d C:\Users\h.kadoya\Desktop\slocri

set XLS=Z:\01_SISデータ\PS\PS日毎稼働まとめ_2026.xlsm
set XLS_NAT=Z:\01_SISデータ\PS\日毎稼働全体.xlsx
set STAMP=logs\sis_daily_stamp.txt
set STAMP_NAT=logs\sis_national_stamp.txt
set LOG=logs\sis_import.log

if not exist logs mkdir logs

set NEED_PUSH=0

:: 機種別デイリーデータのチェック
python check_mtime.py "%XLS%" "%STAMP%" > logs\sis_daily_check.txt 2>&1
findstr "CHANGED" logs\sis_daily_check.txt > nul
if not errorlevel 1 (
    echo [%date% %time%] daily import start >> %LOG% 2>&1
    python import_sis.py --force >> %LOG% 2>&1
    python build_sis_library.py >> %LOG% 2>&1
    set NEED_PUSH=1
)

:: 全国日次データのチェック
python check_mtime.py "%XLS_NAT%" "%STAMP_NAT%" > logs\sis_national_check.txt 2>&1
findstr "CHANGED" logs\sis_national_check.txt > nul
if not errorlevel 1 (
    echo [%date% %time%] national daily import start >> %LOG% 2>&1
    python import_national_daily.py >> %LOG% 2>&1
    set NEED_PUSH=1
)

if "%NEED_PUSH%"=="0" (
    echo [%date% %time%] no change, skip >> %LOG%
    exit /b 0
)

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