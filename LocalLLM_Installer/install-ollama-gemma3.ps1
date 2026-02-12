# ============================================================
#  Ollama + Gemma3 (4B / 12B) Installer for Windows
#  Requires: Windows 10+, DRAM 8GB+ (16GB recommended)
# ============================================================

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

function Write-Step  { param([string]$msg) Write-Host "`n[$((Get-Date).ToString('HH:mm:ss'))] $msg" -ForegroundColor Cyan }
function Write-Ok    { param([string]$msg) Write-Host "  OK: $msg" -ForegroundColor Green }
function Write-Warn  { param([string]$msg) Write-Host "  WARN: $msg" -ForegroundColor Yellow }
function Write-Err   { param([string]$msg) Write-Host "  ERROR: $msg" -ForegroundColor Red }

# ── 1. System check ──────────────────────────────────────────
Write-Step "System check"

$totalMemGB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
Write-Host "  RAM: ${totalMemGB} GB"
if ($totalMemGB -lt 8) {
    Write-Err "RAM 8GB or more is required (detected: ${totalMemGB} GB)"
    Read-Host "Press Enter to exit"
    exit 1
}
if ($totalMemGB -lt 16) {
    Write-Warn "16GB RAM recommended. With ${totalMemGB} GB, only 4B model may work reliably."
}

# ── 2. Check if Ollama is already installed ──────────────────
Write-Step "Checking Ollama installation"

$ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
if ($ollamaCmd) {
    $ollamaVersion = & ollama --version 2>&1
    Write-Ok "Ollama is already installed: $ollamaVersion"
} else {
    Write-Step "Downloading Ollama installer"
    $installerUrl = "https://ollama.com/download/OllamaSetup.exe"
    $installerPath = Join-Path $root "OllamaSetup.exe"

    try {
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
        Write-Ok "Downloaded to $installerPath"
    } catch {
        Write-Err "Failed to download Ollama installer: $_"
        Write-Host "  Please download manually from: https://ollama.com/download/windows"
        Read-Host "Press Enter to exit"
        exit 1
    }

    Write-Step "Installing Ollama"
    Write-Host "  The installer window will open. Please follow the installation wizard."
    Start-Process -FilePath $installerPath -Wait
    Remove-Item $installerPath -ErrorAction SilentlyContinue

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    $ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
    if (-not $ollamaCmd) {
        Write-Err "Ollama command not found after installation."
        Write-Host "  Please restart this script after Ollama installation completes."
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Ok "Ollama installed successfully"
}

# ── 3. Ensure Ollama service is running ──────────────────────
Write-Step "Ensuring Ollama service is running"

try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Ok "Ollama service is running"
} catch {
    Write-Host "  Starting Ollama service..."
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:11434/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Ok "Ollama service started"
    } catch {
        Write-Err "Failed to start Ollama service. Please start it manually."
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# ── 4. Pull Gemma3 models ───────────────────────────────────
Write-Step "Downloading Gemma3 models"

$models = @(
    @{ Tag = "gemma3:4b";   Desc = "Gemma3 4B (approx 3.3 GB)";  MinRAM = 8 },
    @{ Tag = "gemma3:12b";  Desc = "Gemma3 12B (approx 8.1 GB)";  MinRAM = 16 }
)

$installedModels = @()

foreach ($model in $models) {
    Write-Host ""
    Write-Host "  Model: $($model.Desc)" -ForegroundColor White

    if ($totalMemGB -lt $model.MinRAM) {
        Write-Warn "Skipped: requires at least $($model.MinRAM) GB RAM"
        continue
    }

    Write-Host "  Pulling $($model.Tag) ..."
    try {
        & ollama pull $model.Tag
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "$($model.Tag) downloaded successfully"
            $installedModels += $model.Tag
        } else {
            Write-Err "Failed to pull $($model.Tag)"
        }
    } catch {
        Write-Err "Failed to pull $($model.Tag): $_"
    }
}

# ── 5. Verify installed models ───────────────────────────────
Write-Step "Verifying installed models"

$listOutput = & ollama list 2>&1
Write-Host $listOutput

foreach ($tag in $installedModels) {
    if ($listOutput -match [regex]::Escape($tag)) {
        Write-Ok "$tag verified"
    } else {
        Write-Warn "$tag may not be properly installed"
    }
}

# ── 6. Summary ───────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Installation Complete" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Installed models:" -ForegroundColor White
foreach ($tag in $installedModels) {
    Write-Host "    - $tag" -ForegroundColor Green
}
if ($installedModels.Count -eq 0) {
    Write-Host "    (no models installed)" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  Usage in this app:" -ForegroundColor White
Write-Host "    Model selection in the UI will show these as:" -ForegroundColor Gray
foreach ($tag in $installedModels) {
    Write-Host "      ollama:$($tag.Split(':')[1])" -ForegroundColor Gray
}
Write-Host ""
Write-Host "  To start the app, run: start.bat" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to close"
