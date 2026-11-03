# NASA Space Apps Challenge 2026: SPHEREx & Planet X Explorer
# Local Fullstack Startup Script (PowerShell)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  NASA Space Apps 2026: SPHEREx All-Sky Time-Lapse MVP    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$CondaPython = "C:\Users\LENOVO\miniconda3\envs\pds301m\python.exe"

if (-not (Test-Path $CondaPython)) {
    Write-Host "[!] Conda environment 'pds301m' not found at default path. Checking system python..." -ForegroundColor Yellow
    $CondaPython = "python"
}

Write-Host "`n[1/2] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
$BackendJob = Start-Process -FilePath $CondaPython -ArgumentList "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "127.0.0.1", "--port", "8000", "--reload" -PassThru

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting Vite React Frontend on http://localhost:3000..." -ForegroundColor Green
Set-Location "frontend"
Start-Process "npm" -ArgumentList "run", "dev"

Write-Host "`n[+] Fullstack MVP is running!" -ForegroundColor Cyan
Write-Host "    - Web App: http://localhost:3000" -ForegroundColor White
Write-Host "    - API Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "`nPress Ctrl+C or close windows to terminate." -ForegroundColor Gray
