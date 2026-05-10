@echo off
cd /d C:\Users\h.kadoya\Desktop\slocri

set XLS=Z:\01_SISデータ\PS\PS日毎稼働まとめ_2026.xlsm
set STAMP=logs\sis_daily_stamp.txt

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
" > logs\sis_daily_check.txt 2>&1

findstr "CHANGED" logs\sis_daily_check.txt > nul
if errorlevel 1 (
    echo [%date% %time%] daily: no change, skip >> logs\sis_import.log
    exit /b 0
)

echo [%date% %time%] daily import start >> logs\sis_import.log 2>&1
python import_sis.py --force >> logs\sis_import.log 2>&1
python build_sis_library.py >> logs\sis_import.log 2>&1

git diff --quiet src\sisLibrary.json
if errorlevel 1 (
    echo [%date% %time%] sisLibrary.json updated, pushing... >> logs\sis_import.log 2>&1
    git add src\sisLibrary.json
    git commit -m "SIS稼働データ更新 %date%"
    git push
    echo [%date% %time%] push done >> logs\sis_import.log 2>&1
) else (
    echo [%date% %time%] no diff, skip push >> logs\sis_import.log 2>&1
)
