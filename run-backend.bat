@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PYTHONPATH=%~dp0
echo تشغيل الـ Backend على http://127.0.0.1:5000 ...
python api/app.py
pause
