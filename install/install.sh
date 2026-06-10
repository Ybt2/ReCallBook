#!/usr/bin/env bash
set -e

# ═══════════════════════════════════════════════════════════
# ReCallBook Native Installation Script (Linux / macOS)
# ═══════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Helper: command exists ─────────────────────────────
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# ─── Step 0: Check Prerequisites ─────────────────────────
info "=== ReCallBook Installation ==="
info "Project root: ${PROJECT_ROOT}"

echo ""
info "Checking prerequisites..."

MISSING=()

if ! command_exists git; then
  MISSING+=("git")
fi

if ! command_exists curl; then
  MISSING+=("curl")
fi

if ! command_exists docker; then
  MISSING+=("docker")
fi

if [ ${#MISSING[@]} -ne 0 ]; then
  err "Missing required tools: ${MISSING[*]}"
  echo ""
  echo "Please install them first:"
  echo "  - git:    https://git-scm.com/downloads"
  echo "  - curl:   usually pre-installed, or use your package manager"
  echo "  - docker: https://docs.docker.com/get-docker/"
  exit 1
fi
ok "Prerequisites OK (git, curl, docker)"

# ─── Step 1: Check Node.js ──────────────────────────────
info "Checking Node.js..."

NODE_VERSION=""
if command_exists node; then
  NODE_VERSION=$(node -v | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 22 ]; then
    ok "Node.js ${NODE_VERSION} found (>= 22 required)"
  else
    warn "Node.js ${NODE_VERSION} found, but >= 22 is required"
    NODE_VERSION=""
  fi
fi

if [ -z "$NODE_VERSION" ]; then
  err "Node.js 22+ is required but not found."
  echo ""
  echo "Install Node.js 22+:"
  echo "  - Linux:   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs"
  echo "  - macOS:   brew install node@22"
  echo "  - General: https://nodejs.org/"
  exit 1
fi

# ─── Step 2: Check Ollama ────────────────────────────────
info "Checking Ollama..."

if command_exists ollama; then
  ok "Ollama already installed"
else
  warn "Ollama not found. Installing..."
  curl -fsSL https://ollama.com/install.sh | sh
  if command_exists ollama; then
    ok "Ollama installed successfully"
  else
    err "Ollama installation failed"
    exit 1
  fi
fi

# ─── Step 3: Create data directories ────────────────────
info "Creating data directories..."
mkdir -p "${PROJECT_ROOT}/data/uploads"
mkdir -p "${PROJECT_ROOT}/data/logs"
mkdir -p "${PROJECT_ROOT}/data/pids"
mkdir -p "${PROJECT_ROOT}/data/models"
ok "Data directories ready"

# ─── Step 4: Create .env if missing ──────────────────────
ENV_FILE="${PROJECT_ROOT}/.env"
if [ ! -f "$ENV_FILE" ]; then
  info ".env not found. Creating from .env.example..."
  cp "${PROJECT_ROOT}/.env.example" "$ENV_FILE"
  ok ".env created. Please review it before starting the app."
else
  ok ".env already exists"
fi

# ─── Step 5: Install npm dependencies ────────────────────
info "Installing npm dependencies..."

cd "${PROJECT_ROOT}/app"
if [ ! -d "node_modules" ]; then
  info "Installing app dependencies..."
  npm install
  ok "App dependencies installed"
else
  ok "App dependencies already installed"
fi

cd "${PROJECT_ROOT}/frontend"
if [ ! -d "node_modules" ]; then
  info "Installing frontend dependencies..."
  npm install
  ok "Frontend dependencies installed"
else
  ok "Frontend dependencies already installed"
fi

# ─── Step 6: Build frontend ──────────────────────────────
info "Building frontend..."
cd "${PROJECT_ROOT}/frontend"
npm run build
ok "Frontend built"

# ─── Step 7: Start data containers ─────────────────────────
info "Starting data services (MySQL + Qdrant)..."
cd "${PROJECT_ROOT}"
docker compose -f docker-compose.yml up -d

# Wait for MySQL
info "Waiting for MySQL to be ready..."
until docker compose -f docker-compose.yml exec -T mysql mysqladmin ping -h localhost --silent 2>/dev/null; do
  sleep 2
done
ok "MySQL is ready"

# Wait for Qdrant
info "Waiting for Qdrant to be ready..."
until curl -s http://localhost:6333/healthz >/dev/null 2>&1; do
  sleep 2
done
ok "Qdrant is ready"

# ─── Step 8: Pull Ollama models ──────────────────────────
info "Pulling Ollama models..."

# Ensure Ollama service is running
if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
  warn "Ollama service not running. Starting it..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open -a Ollama
  else
    ollama serve &
  fi
  sleep 3
fi

# Read models from .env
OLLAMA_MODELS=$(grep "^OLLAMA_MODELS=" "$ENV_FILE" | cut -d= -f2 | tr -d '"')
OLLAMA_MODELS="${OLLAMA_MODELS:-bge-m3,llama3.2}"

echo "Models to pull: $OLLAMA_MODELS"
IFS=","
for model in $OLLAMA_MODELS; do
  model=$(echo "$model" | xargs)
  [ -z "$model" ] && continue
  echo "  Pulling ${model}..."
  ollama pull "$model"
  ok "  ${model} pulled"
done

# ─── Step 9: Done ────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ${GREEN}ReCallBook installation complete!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Review your .env file: ${PROJECT_ROOT}/.env"
echo "  2. Start everything:      ./recallbook.sh start"
echo "  3. Or start in background: ./recallbook.sh start --daemon"
echo "  4. Check status:           ./recallbook.sh status"
echo "  5. View logs:              ./recallbook.sh logs"
echo ""
echo "To enable auto-start on boot:"
echo "  ./recallbook.sh service install"
echo ""
