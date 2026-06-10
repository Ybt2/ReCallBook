#!/usr/bin/env pwsh
#Requires -Version 5.1
# ═══════════════════════════════════════════════════════════
# ReCallBook Native Installation Script (Windows)
# ═══════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")

function Info { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Warn { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Ok   { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Err  { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

# ─── Step 0: Check Prerequisites ─────────────────────────
Info "=== ReCallBook Installation ==="
Info "Project root: $ProjectRoot"

Write-Host ""
Info "Checking prerequisites..."

$Missing = @()

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    $Missing += "git"
}

if (-not (Get-Command curl -ErrorAction SilentlyContinue)) {
    $Missing += "curl"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    $Missing += "docker"
}

if ($Missing.Count -ne 0) {
    Err "Missing required tools: $($Missing -join ', ')"
    Write-Host ""
    Write-Host "Please install them first:"
    Write-Host "  - git:    https://git-scm.com/download/win"
    Write-Host "  - curl:   usually available in PowerShell, or install via winget"
    Write-Host "  - docker: https://docs.docker.com/desktop/install/windows-install/"
    exit 1
}
Ok "Prerequisites OK (git, curl, docker)"

# ─── Step 1: Check Node.js ──────────────────────────────
Info "Checking Node.js..."

$NodeVersion = $null
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($NodeCmd) {
    $NodeVersion = (node -v) -replace "v",""
    $NodeMajor = [int]($NodeVersion -split "\." | Select-Object -First 1)
    if ($NodeMajor -ge 22) {
        Ok "Node.js $NodeVersion found (>= 22 required)"
    } else {
        Warn "Node.js $NodeVersion found, but >= 22 is required"
        $NodeVersion = $null
    }
}

if (-not $NodeVersion) {
    Err "Node.js 22+ is required but not found."
    Write-Host ""
    Write-Host "Install Node.js 22+:"
    Write-Host "  winget install OpenJS.NodeJS.LTS"
    Write-Host "  Or download from: https://nodejs.org/"
    exit 1
}

# ─── Step 2: Check Ollama ────────────────────────────────
Info "Checking Ollama..."

$OllamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
if ($OllamaCmd) {
    Ok "Ollama already installed"
} else {
    Warn "Ollama not found. Installing..."
    $OllamaInstaller = Join-Path $env:TEMP "ollama-installer.exe"
    curl -L -o $OllamaInstaller "https://ollama.com/download/OllamaSetup.exe"
    Start-Process -FilePath $OllamaInstaller -Wait
    Remove-Item $OllamaInstaller -ErrorAction SilentlyContinue
    $OllamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
    if ($OllamaCmd) {
        Ok "Ollama installed successfully"
    } else {
        Err "Ollama installation failed"
        exit 1
    }
}

# ─── Step 3: Create data directories ────────────────────
Info "Creating data directories..."
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "data\uploads") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "data\logs") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "data\pids") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "data\models") | Out-Null
Ok "Data directories ready"

# ─── Step 4: Create .env if missing ──────────────────────
$EnvFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $EnvFile)) {
    Info ".env not found. Creating from .env.example..."
    Copy-Item (Join-Path $ProjectRoot ".env.example") $EnvFile
    Ok ".env created. Please review it before starting the app."
} else {
    Ok ".env already exists"
}

# ─── Step 5: Install npm dependencies ────────────────────
Info "Installing npm dependencies..."

$AppDir = Join-Path $ProjectRoot "app"
if (-not (Test-Path (Join-Path $AppDir "node_modules"))) {
    Info "Installing app dependencies..."
    Push-Location $AppDir
    npm install
    Pop-Location
    Ok "App dependencies installed"
} else {
    Ok "App dependencies already installed"
}

$FrontendDir = Join-Path $ProjectRoot "frontend"
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Info "Installing frontend dependencies..."
    Push-Location $FrontendDir
    npm install
    Pop-Location
    Ok "Frontend dependencies installed"
} else {
    Ok "Frontend dependencies already installed"
}

# ─── Step 6: Build frontend ──────────────────────────────
Info "Building frontend..."
Push-Location $FrontendDir
npm run build
Pop-Location
Ok "Frontend built"

# ─── Step 7: Start data containers ─────────────────────────
Info "Starting data services (MySQL + Qdrant)..."
Push-Location $ProjectRoot
docker compose -f docker-compose.yml up -d
Pop-Location

# Wait for MySQL
Info "Waiting for MySQL to be ready..."
$mysqlReady = $false
$attempts = 0
while (-not $mysqlReady -and $attempts -lt 30) {
    Start-Sleep -Seconds 2
    try {
        docker compose -f (Join-Path $ProjectRoot "docker-compose.yml") exec -T mysql mysqladmin ping -h localhost --silent 2>$null | Out-Null
        $mysqlReady = $true
    } catch {
        $attempts++
    }
}
if ($mysqlReady) {
    Ok "MySQL is ready"
} else {
    Warn "MySQL healthcheck timed out, but it may still be starting..."
}

# Wait for Qdrant
Info "Waiting for Qdrant to be ready..."
$qdrantReady = $false
$attempts = 0
while (-not $qdrantReady -and $attempts -lt 30) {
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:6333/healthz" -UseBasicParsing -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            $qdrantReady = $true
        }
    } catch {
        $attempts++
    }
}
if ($qdrantReady) {
    Ok "Qdrant is ready"
} else {
    Warn "Qdrant healthcheck timed out, but it may still be starting..."
}

# ─── Step 8: Pull Ollama models ──────────────────────────
Info "Pulling Ollama models..."

# Ensure Ollama service is running
try {
    $null = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -ErrorAction Stop
} catch {
    Warn "Ollama service not running. Starting it..."
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 5
}

# Read models from .env
$envContent = Get-Content $EnvFile
$modelsLine = $envContent | Select-String "^OLLAMA_MODELS="
$models = if ($modelsLine) {
    ($modelsLine -replace "^OLLAMA_MODELS=", "").Trim('"')
} else {
    "bge-m3,llama3.2"
}

Write-Host "Models to pull: $models"
foreach ($model in ($models -split ",")) {
    $model = $model.Trim()
    if (-not $model) { continue }
    Write-Host "  Pulling ${model}..."
    & ollama pull $model
    Ok "  ${model} pulled"
}

# ─── Step 9: Done ────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host "  ReCallBook installation complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Review your .env file: ${EnvFile}"
Write-Host "  2. Start everything:      .\recallbook.ps1 start"
Write-Host "  3. Or start in background: .\recallbook.ps1 start -Daemon"
Write-Host "  4. Check status:           .\recallbook.ps1 status"
Write-Host "  5. View logs:              .\recallbook.ps1 logs"
Write-Host ""
Write-Host "To enable auto-start on boot:"
Write-Host "  .\recallbook.ps1 service install"
Write-Host ""
