# تشغيل المشروع كاملاً - Backend + Frontend
# يفتح نافذتين: واحدة للـ API وواحدة للواجهة
$projectRoot = $PSScriptRoot

Write-Host "جاري تشغيل المشروع..." -ForegroundColor Cyan
Write-Host ""

# تشغيل Backend في نافذة جديدة
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; `$env:PYTHONPATH = '$projectRoot'; Write-Host 'Backend: http://127.0.0.1:5000' -ForegroundColor Green; python api/app.py"

Start-Sleep -Seconds 2

# تشغيل Frontend في نافذة جديدة
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; Write-Host 'Frontend: http://localhost:5173' -ForegroundColor Green; npm run dev"

Write-Host "تم فتح نافذتين:" -ForegroundColor Green
Write-Host "  1) Backend (API):  http://127.0.0.1:5000"
Write-Host "  2) Frontend:      http://localhost:5173"
Write-Host ""
Write-Host "افتح المتصفح على: http://localhost:5173" -ForegroundColor Yellow
