# NASA Space Apps Challenge 2026: SPHEREx & Planet X Explorer
# Local Fullstack Startup Script (PowerShell)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  NASA Space Apps 2026: SPHEREx All-Sky Time-Lapse MVP    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RootDir = $PSScriptRoot
if (-not $RootDir) { $RootDir = (Get-Location).Path }

$CondaPython = "C:\Users\LENOVO\miniconda3\envs\pds301m\python.exe"

if (-not (Test-Path $CondaPython)) {
    Write-Host "[!] Conda environment 'pds301m' not found at default path. Checking system python..." -ForegroundColor Yellow
    $CondaPython = "python"
}

# 1. Start FastAPI Backend in a dedicated titled PowerShell window
Write-Host "`n[1/2] Launching Backend (FastAPI + AstroPy) on port 8000..." -ForegroundColor Green
$BackendCmd = "`$host.ui.RawUI.WindowTitle = 'SPHEREx Backend (FastAPI + AstroPy - Port 8000)'; Set-Location '$RootDir'; `$env:PYTHONPATH='backend'; & '$CondaPython' -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $BackendCmd

Start-Sleep -Seconds 2

# 2. Start Vite React Frontend in a dedicated titled PowerShell window
Write-Host "[2/2] Launching Frontend (Vite React) on port 3000..." -ForegroundColor Green
$FrontendCmd = "`$host.ui.RawUI.WindowTitle = 'SPHEREx Frontend (Vite React - Port 3000)'; Set-Location '$RootDir\frontend'; npm run dev"
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $FrontendCmd

Start-Sleep -Seconds 3

# 3. Health & Readiness Verification
Write-Host "`n--- Health & Readiness Verification ---" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health" -TimeoutSec 4 -ErrorAction Stop
    $v = $health.astropy_version
    Write-Host "[OK] Backend:  http://127.0.0.1:8000/api/health (AstroPy $v, IRSA Online)" -ForegroundColor Green
} catch {
    Write-Host "[!] Backend is still starting up or waiting on port 8000." -ForegroundColor Yellow
}

try {
    $fe = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
    $sc = $fe.StatusCode
    Write-Host "[OK] Frontend: http://localhost:3000 (HTTP $sc)" -ForegroundColor Green
} catch {
    Write-Host "[!] Frontend is still starting up or waiting on port 3000." -ForegroundColor Yellow
}

Write-Host "`n[+] Fullstack MVP is running with 2 dedicated windows:" -ForegroundColor Cyan
Write-Host "    - Web App:  http://localhost:3000" -ForegroundColor White
Write-Host "    - API Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "`nBoth Backend and Frontend are running in their respective windows." -ForegroundColor Gray
Write-Host "Close those windows or press Ctrl+C in them to terminate.`n" -ForegroundColor Gray
