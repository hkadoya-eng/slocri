@echo off
cd /d C:\Users\h.kadoya\Desktop\slocri

set XLS=Z:\01_SISデータ\PS\週毎SISデータ一覧_2026.xlsm
set STAMP=logs\sis_weekly_stamp.txt

python -c "
import os, sys
xls = r'%XLS%'
stamp = r'%STAMP%'
if not os.path.exists(xls):
    print('FILE_NOT_FOUND'); sys.exit(1)
mtime = str(os.path.getmtime(xls))
prev = open(stamp).read().strip() if os.path.exists(stamp) else ''
if mtime == prev:
    print('NO_CHANGE'); sys.exit(0)
open(stamp, 'w').write(mtime)
print('CHANGED')
" > logs\sis_weekly_check.txt 2>&1

findstr "CHANGED" logs\sis_weekly_check.txt > nul
if errorlevel 1 (
    echo [%date% %time%] weekly: no change, skip >> logs\sis_import.log
    exit /b 0
)

echo [%date% %time%] weekly import start >> logs\sis_import.log 2>&1
python import_sis_weekly.py >> logs\sis_import.log 2>&1
echo [%date% %time%] weekly import done >> logs\sis_import.log 2>&1

:: 機種評価予測を更新（貢献週超過チェック含む）
echo [%date% %time%] machine_review prediction update... >> logs\sis_import.log 2>&1
python update_machine_review_predictions.py >> logs\sis_import.log 2>&1

git diff --quiet src\columnData.json
if errorlevel 1 (
    echo [%date% %time%] columnData.json updated, pushing... >> logs\sis_import.log 2>&1
    git add src\columnData.json
    git commit -m "SIS週次データ反映・機種評価予測更新 %date%"
    git push
    echo [%date% %time%] push done >> logs\sis_import.log 2>&1
)
