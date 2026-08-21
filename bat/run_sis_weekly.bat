@echo off
chcp 65001 >nul
cd /d C:\Users\h.kadoya\Desktop\slocri

set XLS=Z:\01_SISデータ\PS\週毎SISデータ一覧_2026.xlsm
set STAMP=logs\sis_weekly_stamp.txt

if not exist logs mkdir logs

python scripts\misc\check_mtime.py "%XLS%" "%STAMP%" > logs\sis_weekly_check.txt 2>&1
findstr "CHANGED" logs\sis_weekly_check.txt > nul
if errorlevel 1 (
    echo [%date% %time%] weekly: no change, skip >> logs\sis_import.log
    exit /b 0
)

echo [%date% %time%] weekly import start >> logs\sis_import.log 2>&1
python scripts\import\import_sis_weekly.py >> logs\sis_import.log 2>&1
echo [%date% %time%] weekly import done >> logs\sis_import.log 2>&1

echo [%date% %time%] machine_review prediction update... >> logs\sis_import.log 2>&1
python scripts\misc\update_machine_review_predictions.py >> logs\sis_import.log 2>&1

echo [%date% %time%] machine_review outcome update... >> logs\sis_import.log 2>&1
python scripts\misc\update_review_outcome.py >> logs\sis_import.log 2>&1

echo [%date% %time%] sisRecord update... >> logs\sis_import.log 2>&1
python scripts\misc\update_sis_record.py >> logs\sis_import.log 2>&1

echo [%date% %time%] contribution forecast update... >> logs\sis_import.log 2>&1
python scripts\misc\update_forecast.py >> logs\sis_import.log 2>&1

git diff --quiet src\columnData.json
if errorlevel 1 (
    echo [%date% %time%] columnData.json updated, pushing... >> logs\sis_import.log 2>&1
    git add src\columnData.json
    git commit -m "SIS週次データ反映・機種評価予測更新 %date%"
    git push
    echo [%date% %time%] push done >> logs\sis_import.log 2>&1
)
