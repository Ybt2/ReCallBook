#!/bin/sh
set -e

OVERRIDE_FILE="docker-compose.override.yml"
HAS_GPU=0

# ─── Helpers ────────────────────────────────────────────

vga_device_line() {
  lspci 2>/dev/null | grep -iE "vga compatible|3d controller|display controller" | head -1
}

vga_vendor() {
  line=$(vga_device_line)
  [ -z "$line" ] && return 1
  echo "$line"
}

has_nvidia() {
  line=$(vga_vendor)
  echo "$line" | grep -qiE "nvidia" && return 0

  if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

has_amd() {
  line=$(vga_vendor)
  [ -z "$line" ] && return 1

  # Match whole-word "amd" or "ati" only, plus known AMD vendor strings
  echo "$line" | grep -qiE "\[amd\]|advanced micro|\[1002\]|\[1022\]" && return 0
  echo "$line" | grep -qiE "(^|[^a-z])amd([^a-z]|$)" && return 0
  echo "$line" | grep -qiE "(^|[^a-z])ati([^a-z]|$)" && return 0

  return 1
}

has_intel() {
  line=$(vga_vendor)
  [ -z "$line" ] && return 1

  echo "$line" | grep -qiE "intel" && return 0
  return 1
}

has_dri() {
  [ -e /dev/dri/renderD128 ] && ls /dev/dri/card* >/dev/null 2>&1
}

get_render_gid() {
  if command -v getent >/dev/null 2>&1; then
    getent group render 2>/dev/null | cut -d: -f3
  elif [ -f /etc/group ]; then
    grep -E "^render:" /etc/group 2>/dev/null | cut -d: -f3
  fi
}

# ─── Main ───────────────────────────────────────────────

main() {
  echo "=== GPU Detection ==="

  if has_nvidia; then
    echo "Detected: NVIDIA GPU"
    HAS_GPU=1

    nvidia_smi_output=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
    echo "  GPU: ${nvidia_smi_output:-$(vga_vendor)}"

    if ! docker info 2>/dev/null | grep -qi "nvidia"; then
      echo ""
      echo "  WARNING: nvidia-container-toolkit may not be configured."
      echo "  Install and configure for GPU acceleration:"
      echo ""
      echo "    sudo apt install nvidia-container-toolkit"
      echo "    sudo nvidia-ctk runtime configure --runtime=docker"
      echo "    sudo systemctl restart docker"
      echo ""
    fi

    cat > "$OVERRIDE_FILE" << 'OVERRIDE'
services:
  ollama:
    runtime: nvidia
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
OVERRIDE
    echo "Generated: $OVERRIDE_FILE (NVIDIA)"

  elif has_amd; then
    echo "Detected: AMD GPU"
    HAS_GPU=1

    line=$(vga_vendor)
    [ -n "$line" ] && echo "  GPU: ${line#*: }"

    echo ""
    echo "  NOTE: Ensure ROCm is installed on the host:"
    echo "    https://rocm.docs.amd.com/en/latest/deploy/linux/install.html"
    echo ""

    RENDER_GID=$(get_render_gid)
    RENDER_GID="${RENDER_GID:-992}"

    cat > "$OVERRIDE_FILE" << OVERRIDE
services:
  ollama:
    devices:
      - /dev/dri:/dev/dri
    group_add:
      - "44"
      - "$RENDER_GID"
OVERRIDE
    echo "Generated: $OVERRIDE_FILE (AMD ROCm)"

  elif has_intel; then
    echo "Detected: Intel GPU"
    HAS_GPU=1

    line=$(vga_vendor)
    [ -n "$line" ] && echo "  GPU: ${line#*: }"

    if ! dpkg -l 2>/dev/null | grep -qi intel-compute-runtime; then
      echo ""
      echo "  NOTE: intel-compute-runtime recommended for GPU acceleration:"
      echo ""
      echo "    sudo apt install intel-opencl-icd intel-compute-runtime"
      echo ""
    fi

    RENDER_GID=$(get_render_gid)
    RENDER_GID="${RENDER_GID:-992}"

    cat > "$OVERRIDE_FILE" << EOF
services:
  ollama:
    devices:
      - /dev/dri:/dev/dri
    group_add:
      - "44"
      - "$RENDER_GID"
EOF
    echo "Generated: $OVERRIDE_FILE (Intel /dev/dri)"

  elif has_dri; then
    echo "Detected: Unknown GPU (has /dev/dri, assuming Intel)"
    HAS_GPU=1

    RENDER_GID=$(get_render_gid)
    RENDER_GID="${RENDER_GID:-992}"

    cat > "$OVERRIDE_FILE" << EOF
services:
  ollama:
    devices:
      - /dev/dri:/dev/dri
    group_add:
      - "44"
      - "$RENDER_GID"
EOF
    echo "Generated: $OVERRIDE_FILE (Generic /dev/dri)"

  else
    echo "Detected: No supported GPU found"
    if [ -f "$OVERRIDE_FILE" ]; then
      rm "$OVERRIDE_FILE"
      echo "Removed stale: $OVERRIDE_FILE"
    fi
    echo "Ollama will run on CPU."
  fi

  echo ""
  echo "=== Done ==="
  if [ "$HAS_GPU" = "1" ]; then
    echo "Run 'docker compose up -d' — the override is loaded automatically."
  fi
}

main "$@"
