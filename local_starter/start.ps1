$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Backend (port 3001)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; npm run dev" -WindowStyle Normal

# UI (port 3000)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\ui'; pnpm dev" -WindowStyle Normal

Write-Host "Backend (port 3001) and UI (port 3000) started in separate windows." -ForegroundColor Green
