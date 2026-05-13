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
