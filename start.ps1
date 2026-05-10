# ╔══════════════════════════════════════════════════════════╗
# ║         College Corner — Dev Startup Script              ║
# ║   Starts: PostgreSQL · Backend · Frontend · Print Client ║
# ╚══════════════════════════════════════════════════════════╝

$root = $PSScriptRoot

Write-Host ""
Write-Host "  College Corner — Starting all services..." -ForegroundColor Cyan
Write-Host ""

# ─── 1. PostgreSQL ────────────────────────────────────────────────────────────
$pgService = "postgresql-x64-17"
$pg = Get-Service -Name $pgService -ErrorAction SilentlyContinue

if ($null -eq $pg) {
    Write-Host "  [PG] Service '$pgService' not found — skipping." -ForegroundColor Yellow
} elseif ($pg.Status -eq 'Running') {
    Write-Host "  [PG] PostgreSQL already running." -ForegroundColor Green
} else {
    Write-Host "  [PG] Starting PostgreSQL..." -ForegroundColor Yellow
    Start-Service -Name $pgService
    Start-Sleep -Seconds 2
    Write-Host "  [PG] PostgreSQL started." -ForegroundColor Green
}

# ─── 2. Backend (Express) ─────────────────────────────────────────────────────
Write-Host "  [BE] Launching backend dev server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Write-Host '[ BACKEND ]' -ForegroundColor Magenta; Set-Location '$root\backend'; npm run dev" `
    -WindowStyle Normal

# ─── 3. Frontend (Next.js) ────────────────────────────────────────────────────
Write-Host "  [FE] Launching frontend dev server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Write-Host '[ FRONTEND ]' -ForegroundColor Blue; Set-Location '$root\frontend'; npm run dev" `
    -WindowStyle Normal

# ─── 4. Print Client (optional) ───────────────────────────────────────────────
$envFile = Join-Path $root "print-client\.env"

if (Test-Path $envFile) {
    # Read PRINTER_ID from the .env to check if it has been configured
    $printerId = (Get-Content $envFile | Where-Object { $_ -match "^PRINTER_ID=" }) -replace "PRINTER_ID=", ""

    if ($printerId -and $printerId -ne "your-printer-uuid-here") {
        Write-Host "  [PC] Launching print client..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList "-NoExit", "-Command",
            "Write-Host '[ PRINT CLIENT ]' -ForegroundColor Yellow; Set-Location '$root\print-client'; npm run dev" `
            -WindowStyle Normal
    } else {
        Write-Host "  [PC] Print client skipped — set PRINTER_ID in print-client\.env first." -ForegroundColor DarkYellow
    }
} else {
    Write-Host "  [PC] Print client skipped — copy print-client\.env.example to .env and configure it." -ForegroundColor DarkYellow
}

# ─── Done ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  All services launched." -ForegroundColor Green
Write-Host "  Frontend  →  http://localhost:3000" -ForegroundColor White
Write-Host "  Backend   →  http://localhost:5000" -ForegroundColor White
Write-Host ""
