@echo off
chcp 65001 >nul
cd /d "C:\Users\h.kadoya\Desktop\slocri"
python scripts\import\import_sis.py >> logs\sis_import.log 2>&1
