# تشغيل الـ Backend (Flask) - نظام إدارة مخزون معدات وكالة 007
$projectRoot = $PSScriptRoot
Set-Location $projectRoot
$env:PYTHONPATH = $projectRoot
Write-Host "تشغيل الـ Backend على http://127.0.0.1:5000 ..." -ForegroundColor Green
python api/app.py
