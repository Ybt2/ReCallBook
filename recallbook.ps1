#Requires -Version 5.1
# ═══════════════════════════════════════════════════════════
# ReCallBook Control Script (Windows)
# ═══════════════════════════════════════════════════════════

param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet("start","stop","status","logs","service","help")]
    [string]$Command,

    [Parameter(Position=1)]
    [string]$SubCommand,

    [switch]$Daemon
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Resolve-Path $ScriptDir
$PidDir = Join-Path $ProjectRoot "data\pids"
$LogDir = Join-Path $ProjectRoot "data\logs"
$AppDir = Join-Path $ProjectRoot "app"
$EnvFile = Join-Path $ProjectRoot ".env"

function Info { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Warn { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Ok   { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Err  { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

# ─── Ensure directories exist ───────────────────────────
function Ensure-Dirs {
    New-Item -ItemType Directory -Force -Path $PidDir | Out-Null
    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
}

# ─── Check if process is running by PID file ──────────────
function Is-Running {
    param([string]$PidFile)
    if (Test-Path $PidFile) {
        $pidValue = Get-Content $PidFile -ErrorAction SilentlyContinue
        if ($pidValue) {
            try {
                $proc = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
                if ($proc) { return $true }
            } catch { }
        }
    }
    return $false
}

# ─── Get service status ─────────────────────────────────
function Get-ServiceStatus {
    param([string]$CheckUrl)
    try {
        $resp = Invoke-WebRequest -Uri $CheckUrl -UseBasicParsing -ErrorAction Stop -TimeoutSec 3
        if ($resp.StatusCode -eq 200) {
            return "running"
        }
    } catch { }
    return "stopped"
}

# ─── Start data containers ──────────────────────────────
function Start-Data {
    Info "Starting data services..."
    Push-Location $ProjectRoot
    docker compose -f docker-compose.data.yml up -d
    Pop-Location

    Info "Waiting for MySQL..."
    $attempts = 0
    $mysqlReady = $false
    while (-not $mysqlReady -and $attempts -lt 30) {
        Start-Sleep -Seconds 2
        try {
            docker compose -f (Join-Path $ProjectRoot "docker-compose.data.yml") exec -T mysql mysqladmin ping -h localhost --silent 2>$null | Out-Null
            $mysqlReady = $true
        } catch { $attempts++ }
    }
    if ($mysqlReady) { Ok "MySQL ready" } else { Warn "MySQL healthcheck timed out" }

    Info "Waiting for Qdrant..."
    $attempts = 0
    $qdrantReady = $false
    while (-not $qdrantReady -and $attempts -lt 30) {
        Start-Sleep -Seconds 2
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:6333/healthz" -UseBasicParsing -ErrorAction Stop -TimeoutSec 3
            if ($resp.StatusCode -eq 200) { $qdrantReady = $true }
        } catch { $attempts++ }
    }
    if ($qdrantReady) { Ok "Qdrant ready" } else { Warn "Qdrant healthcheck timed out" }
}

# ─── Stop data containers ───────────────────────────────
function Stop-Data {
    Info "Stopping data services..."
    Push-Location $ProjectRoot
    docker compose -f docker-compose.data.yml down
    Pop-Location
    Ok "Data services stopped"
}

# ─── Ensure Ollama is running ───────────────────────────
function Ensure-Ollama {
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -ErrorAction Stop -TimeoutSec 3
        return
    } catch { }

    Info "Starting Ollama..."
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden

    $attempts = 0
    while ($attempts -lt 30) {
        Start-Sleep -Seconds 2
        try {
            $null = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -ErrorAction Stop -TimeoutSec 3
            Ok "Ollama ready"
            return
        } catch { $attempts++ }
    }
    Err "Ollama failed to start"
    exit 1
}

# ─── Start the app ──────────────────────────────────────
function Start-App {
    param([switch]$AsDaemon)
    $pidfile = Join-Path $PidDir "app.pid"
    $logfile = Join-Path $LogDir "app.log"

    if (Is-Running -PidFile $pidfile) {
        Warn "App is already running (PID: $(Get-Content $pidfile))"
        return
    }

    Info "Starting ReCallBook app..."
    Push-Location $AppDir

    if ($AsDaemon) {
        $proc = Start-Process -FilePath "node" -ArgumentList "src/app.js" -WindowStyle Hidden -PassThru -RedirectStandardOutput $logfile -RedirectStandardError $logfile
        $proc.Id | Set-Content $pidfile
        Ok "App started in background (PID: $($proc.Id))"
        Info "Logs: $logfile"
    } else {
        Ok "App starting (interactive mode -- press Ctrl+C to stop)"
        Write-Host ""
        try {
            & node src/app.js
        } finally {
            Stop-Data
        }
    }
    Pop-Location
}

# ─── Stop the app ───────────────────────────────────────
function Stop-App {
    $pidfile = Join-Path $PidDir "app.pid"
    if (Is-Running -PidFile $pidfile) {
        $pidValue = Get-Content $pidfile
        Info "Stopping app (PID: $pidValue)..."
        try {
            Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
        } catch { }
        Remove-Item $pidfile -Force -ErrorAction SilentlyContinue
        Ok "App stopped"
    } else {
        Warn "App is not running"
    }
}

# ─── Status ─────────────────────────────────────────────
function Show-Status {
    Write-Host ""
    Write-Host "┌─ ReCallBook Status ─────────────────────────┐" -ForegroundColor Cyan

    $mysqlStatus = Get-ServiceStatus -CheckUrl "http://localhost:3306"
    $qdrantStatus = Get-ServiceStatus -CheckUrl "http://localhost:6333/healthz"
    $ollamaStatus = Get-ServiceStatus -CheckUrl "http://localhost:11434/api/tags"
    $appStatus = Get-ServiceStatus -CheckUrl "http://localhost:3000/api/health"

    # MySQL check via docker
    try {
        $dockerPs = docker compose -f (Join-Path $ProjectRoot "docker-compose.data.yml") ps mysql --format json 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($dockerPs.State -eq "running") { $mysqlStatus = "running" } else { $mysqlStatus = "stopped" }
    } catch { $mysqlStatus = "stopped" }

    $statusColor = @{ "running" = "Green"; "stopped" = "Red" }

    Write-Host "│ MySQL    " -NoNewline; Write-Host "● $mysqlStatus" -ForegroundColor $statusColor[$mysqlStatus] -NoNewline; Write-Host "                           │" -ForegroundColor Cyan
    Write-Host "│ Qdrant   " -NoNewline; Write-Host "● $qdrantStatus" -ForegroundColor $statusColor[$qdrantStatus] -NoNewline; Write-Host "                           │" -ForegroundColor Cyan
    Write-Host "│ Ollama   " -NoNewline; Write-Host "● $ollamaStatus" -ForegroundColor $statusColor[$ollamaStatus] -NoNewline; Write-Host "                           │" -ForegroundColor Cyan
    Write-Host "│ App      " -NoNewline; Write-Host "● $appStatus" -ForegroundColor $statusColor[$appStatus] -NoNewline; Write-Host "                           │" -ForegroundColor Cyan
    Write-Host "└──────────────────────────────────────────────┘" -ForegroundColor Cyan
    Write-Host ""
}

# ─── Logs ───────────────────────────────────────────────
function Show-Logs {
    param([string]$Service)
    $logfile = Join-Path $LogDir "app.log"

    if ($Service -and $Service -ne "app") {
        Err "Unknown service: $Service"
        Err "Available: app"
        exit 1
    }

    if (-not (Test-Path $logfile)) {
        Warn "No log file found: $logfile"
        Info "The app may not have been started in daemon mode yet."
        return
    }

    Get-Content $logfile -Wait -Tail 50
}

# ─── Start ──────────────────────────────────────────────
function Invoke-Start {
    Ensure-Dirs
    Start-Data
    Ensure-Ollama

    if ($Daemon) {
        Start-App -AsDaemon
        Write-Host ""
        Ok "All services started in background"
        Show-Status
    } else {
        Start-App
    }
}

# ─── Stop ───────────────────────────────────────────────
function Invoke-Stop {
    Ensure-Dirs
    Stop-App
    Stop-Data
    Write-Host ""
    Ok "All services stopped"
}

# ─── Service Install ────────────────────────────────────
function Install-Service {
    Info "Installing ReCallBook as a Windows scheduled task..."

    $taskName = "ReCallBook"
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File `"$ProjectRoot\recallbook.ps1`" start -Daemon"
    $trigger = New-ScheduledTaskTrigger -AtLogon
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive

    try {
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
        Ok "Scheduled task '$taskName' installed. ReCallBook will start on login."
        Info "To disable: .\recallbook.ps1 service uninstall"
    } catch {
        Err "Failed to register scheduled task: $_"
        exit 1
    }
}

# ─── Service Uninstall ──────────────────────────────────
function Uninstall-Service {
    Info "Removing ReCallBook scheduled task..."
    $taskName = "ReCallBook"
    try {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
        Ok "Scheduled task removed"
    } catch {
        Warn "Scheduled task not found or already removed"
    }
}

# ─── Help ───────────────────────────────────────────────
function Show-Help {
    @"
ReCallBook Control Script

Usage: .\recallbook.ps1 <Command> [SubCommand] [options]

Commands:
  start [-Daemon]     Start all services (interactive or background)
  stop                Stop all services
  status              Show status of all services
  logs [app]          Tail logs (currently only 'app' supported)
  service install     Enable auto-start on login
  service uninstall   Disable auto-start on login
  help                Show this help message

Examples:
  .\recallbook.ps1 start              # Interactive mode (Ctrl+C to stop)
  .\recallbook.ps1 start -Daemon      # Background mode
  .\recallbook.ps1 status             # Check what's running
  .\recallbook.ps1 logs               # Tail app logs
  .\recallbook.ps1 service install   # Auto-start on login

"@
}

# ─── Main ───────────────────────────────────────────────
switch ($Command) {
    "start" {
        Invoke-Start
    }
    "stop" {
        Invoke-Stop
    }
    "status" {
        Show-Status
    }
    "logs" {
        Show-Logs -Service $SubCommand
    }
    "service" {
        switch ($SubCommand) {
            "install"   { Install-Service }
            "uninstall" { Uninstall-Service }
            default {
                Err "Unknown service subcommand: $SubCommand"
                Show-Help
                exit 1
            }
        }
    }
    "help" {
        Show-Help
    }
}
