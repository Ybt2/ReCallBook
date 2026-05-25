#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# ReCallBook Control Script (Linux / macOS)
# ═══════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

PID_DIR="${PROJECT_ROOT}/data/pids"
LOG_DIR="${PROJECT_ROOT}/data/logs"
APP_DIR="${PROJECT_ROOT}/app"
ENV_FILE="${PROJECT_ROOT}/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Ensure directories exist ───────────────────────────
ensure_dirs() {
  mkdir -p "$PID_DIR" "$LOG_DIR"
}

# ─── Check if a process is running by PID file ──────────
is_running() {
  local pidfile="$1"
  if [ -f "$pidfile" ]; then
    local pid=$(cat "$pidfile" 2>/dev/null)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

# ─── Get status of a service ────────────────────────────
get_service_status() {
  local name="$1"
  local check_cmd="$2"
  if eval "$check_cmd" >/dev/null 2>&1; then
    echo -e "${GREEN}● running${NC}"
  else
    echo -e "${RED}● stopped${NC}"
  fi
}

# ─── Start data containers ──────────────────────────────
start_data() {
  info "Starting data services..."
  cd "$PROJECT_ROOT"
  docker compose -f docker-compose.data.yml up -d

  info "Waiting for MySQL..."
  local attempts=0
  while [ $attempts -lt 30 ]; do
    if docker compose -f docker-compose.data.yml exec -T mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
      ok "MySQL ready"
      break
    fi
    sleep 2
    attempts=$((attempts + 1))
  done
  if [ $attempts -ge 30 ]; then
    warn "MySQL healthcheck timed out"
  fi

  info "Waiting for Qdrant..."
  attempts=0
  while [ $attempts -lt 30 ]; do
    if curl -s http://localhost:6333/healthz >/dev/null 2>&1; then
      ok "Qdrant ready"
      break
    fi
    sleep 2
    attempts=$((attempts + 1))
  done
  if [ $attempts -ge 30 ]; then
    warn "Qdrant healthcheck timed out"
  fi
}

# ─── Stop data containers ───────────────────────────────
stop_data() {
  info "Stopping data services..."
  cd "$PROJECT_ROOT"
  docker compose -f docker-compose.data.yml down
  ok "Data services stopped"
}

# ─── Ensure Ollama is running ───────────────────────────
ensure_ollama() {
  if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    return 0
  fi

  info "Starting Ollama..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ -d "/Applications/Ollama.app" ]; then
      open -a Ollama
    else
      ollama serve &
    fi
  else
    ollama serve &
  fi

  local attempts=0
  while [ $attempts -lt 30 ]; do
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
      ok "Ollama ready"
      return 0
    fi
    sleep 2
    attempts=$((attempts + 1))
  done

  err "Ollama failed to start"
  return 1
}

# ─── Start the app ──────────────────────────────────────
start_app() {
  local daemon="$1"
  local logfile="${LOG_DIR}/app.log"
  local pidfile="${PID_DIR}/app.pid"

  if is_running "$pidfile"; then
    warn "App is already running (PID: $(cat "$pidfile"))"
    return 0
  fi

  info "Starting ReCallBook app..."
  cd "$APP_DIR"

  if [ "$daemon" = "1" ]; then
    nohup node src/app.js > "$logfile" 2>&1 &
    local pid=$!
    echo "$pid" > "$pidfile"
    ok "App started in background (PID: $pid)"
    info "Logs: $logfile"
  else
    ok "App starting (interactive mode — press Ctrl+C to stop)"
    echo ""
    node src/app.js
  fi
}

# ─── Stop the app ───────────────────────────────────────
stop_app() {
  local pidfile="${PID_DIR}/app.pid"
  if is_running "$pidfile"; then
    local pid=$(cat "$pidfile")
    info "Stopping app (PID: $pid)..."
    kill "$pid" 2>/dev/null || true
    rm -f "$pidfile"
    ok "App stopped"
  else
    warn "App is not running"
  fi
}

# ─── Status ─────────────────────────────────────────────
cmd_status() {
  echo ""
  echo -e "${CYAN}┌─ ReCallBook Status ─────────────────────────┐${NC}"

  local mysql_status=$(get_service_status "MySQL" "docker compose -f ${PROJECT_ROOT}/docker-compose.data.yml ps mysql | grep -q healthy")
  local qdrant_status=$(get_service_status "Qdrant" "curl -s http://localhost:6333/healthz")
  local ollama_status=$(get_service_status "Ollama" "curl -s http://localhost:11434/api/tags")
  local app_status=$(get_service_status "App" "curl -s http://localhost:3000/api/health")

  printf "${CYAN}│${NC} %-10s %-35s ${CYAN}│${NC}\n" "MySQL" "$mysql_status"
  printf "${CYAN}│${NC} %-10s %-35s ${CYAN}│${NC}\n" "Qdrant" "$qdrant_status"
  printf "${CYAN}│${NC} %-10s %-35s ${CYAN}│${NC}\n" "Ollama" "$ollama_status"
  printf "${CYAN}│${NC} %-10s %-35s ${CYAN}│${NC}\n" "App" "$app_status"
  echo -e "${CYAN}└──────────────────────────────────────────────┘${NC}"
  echo ""
}

# ─── Logs ───────────────────────────────────────────────
cmd_logs() {
  local service="$1"
  local logfile="${LOG_DIR}/app.log"

  if [ -n "$service" ] && [ "$service" != "app" ]; then
    err "Unknown service: $service"
    err "Available: app"
    exit 1
  fi

  if [ ! -f "$logfile" ]; then
    warn "No log file found: $logfile"
    info "The app may not have been started in daemon mode yet."
    exit 0
  fi

  tail -f "$logfile"
}

# ─── Start ──────────────────────────────────────────────
cmd_start() {
  local daemon="$1"
  ensure_dirs
  start_data
  ensure_ollama

  if [ "$daemon" = "1" ]; then
    start_app 1
    echo ""
    ok "All services started in background"
    cmd_status
  else
    # Interactive mode: trap Ctrl+C to clean up
    trap 'echo ""; info "Stopping..."; stop_app; stop_data; exit 0' INT TERM
    start_app 0
    # If node exits on its own, clean up
    stop_data
  fi
}

# ─── Stop ───────────────────────────────────────────────
cmd_stop() {
  ensure_dirs
  stop_app
  stop_data
  echo ""
  ok "All services stopped"
}

# ─── Service Install ────────────────────────────────────
cmd_service_install() {
  info "Installing ReCallBook as a system service..."

  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS launchd
    local plist="${PROJECT_ROOT}/services/launchd/com.recallbook.app.plist"
    mkdir -p "$(dirname "$plist")"
    cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.recallbook.app</string>
    <key>WorkingDirectory</key>
    <string>${PROJECT_ROOT}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${PROJECT_ROOT}/recallbook.sh</string>
        <string>start</string>
        <string>--daemon</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/service.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/service-error.log</string>
</dict>
</plist>
PLIST
    cp "$plist" ~/Library/LaunchAgents/
    launchctl load ~/Library/LaunchAgents/com.recallbook.app.plist 2>/dev/null || true
    ok "LaunchAgent installed. ReCallBook will start on login."
    info "To disable: ./recallbook.sh service uninstall"

  elif [ -d /run/systemd/system ]; then
    # Linux systemd
    local service_file="${PROJECT_ROOT}/services/systemd/recallbook.service"
    mkdir -p "$(dirname "$service_file")"
    cat > "$service_file" <<SERVICE
[Unit]
Description=ReCallBook Application
After=network.target docker.service
Requires=docker.service

[Service]
Type=forking
WorkingDirectory=${PROJECT_ROOT}
ExecStart=${PROJECT_ROOT}/recallbook.sh start --daemon
ExecStop=${PROJECT_ROOT}/recallbook.sh stop
Restart=on-failure
RestartSec=5
User=%I

[Install]
WantedBy=multi-user.target
SERVICE
    ok "Systemd service file created: $service_file"
    info "To install it system-wide:"
    info "  sudo cp $service_file /etc/systemd/system/"
    info "  sudo systemctl daemon-reload"
    info "  sudo systemctl enable --now recallbook"

  else
    warn "Unknown init system. Cannot install auto-start service."
    warn "You can manually add ${PROJECT_ROOT}/recallbook.sh start --daemon to your startup scripts."
  fi
}

# ─── Service Uninstall ──────────────────────────────────
cmd_service_uninstall() {
  info "Uninstalling ReCallBook system service..."

  if [[ "$OSTYPE" == "darwin"* ]]; then
    local plist_path="$HOME/Library/LaunchAgents/com.recallbook.app.plist"
    if [ -f "$plist_path" ]; then
      launchctl unload "$plist_path" 2>/dev/null || true
      rm -f "$plist_path"
      ok "LaunchAgent removed"
    else
      warn "LaunchAgent not found"
    fi

  elif [ -f /etc/systemd/system/recallbook.service ]; then
    info "To remove the systemd service:"
    info "  sudo systemctl stop recallbook"
    info "  sudo systemctl disable recallbook"
    info "  sudo rm /etc/systemd/system/recallbook.service"
    info "  sudo systemctl daemon-reload"

  else
    warn "No service configuration found"
  fi
}

# ─── Help ───────────────────────────────────────────────
cmd_help() {
  cat <<HELP
ReCallBook Control Script

Usage: ./recallbook.sh <command> [options]

Commands:
  start [--daemon]    Start all services (interactive or background)
  stop                Stop all services
  status              Show status of all services
  logs [app]          Tail logs (currently only 'app' supported)
  service install     Enable auto-start on boot
  service uninstall   Disable auto-start on boot
  help                Show this help message

Examples:
  ./recallbook.sh start              # Interactive mode (Ctrl+C to stop)
  ./recallbook.sh start --daemon     # Background mode
  ./recallbook.sh status             # Check what's running
  ./recallbook.sh logs               # Tail app logs
  ./recallbook.sh service install    # Auto-start on boot

HELP
}

# ─── Main ───────────────────────────────────────────────
main() {
  local cmd="${1:-help}"
  local arg="$2"

  case "$cmd" in
    start)
      if [ "$arg" = "--daemon" ]; then
        cmd_start 1
      else
        cmd_start 0
      fi
      ;;
    stop)
      cmd_stop
      ;;
    status)
      cmd_status
      ;;
    logs)
      cmd_logs "$arg"
      ;;
    service)
      case "$arg" in
        install)
          cmd_service_install
          ;;
        uninstall)
          cmd_service_uninstall
          ;;
        *)
          err "Unknown service subcommand: $arg"
          cmd_help
          exit 1
          ;;
      esac
      ;;
    help|--help|-h)
      cmd_help
      ;;
    *)
      err "Unknown command: $cmd"
      cmd_help
      exit 1
      ;;
  esac
}

main "$@"
