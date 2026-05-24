#!/bin/sh
set -e

echo "=== Ollama Model Setup ==="
echo "Connecting to Ollama at: ${OLLAMA_HOST:-http://ollama:11434}"

# Wait for Ollama to be ready
until ollama list >/dev/null 2>&1; do
  echo "Waiting for Ollama to be ready..."
  sleep 2
done
echo "Ollama is ready."

# Parse the comma-separated model list
OLLAMA_MODELS="${OLLAMA_MODELS:-bge-m3}"
echo "Models to pull: $OLLAMA_MODELS"

IFS=","
for model in $OLLAMA_MODELS; do
  model=$(echo "$model" | xargs) # trim whitespace
  if [ -z "$model" ]; then
    continue
  fi
  echo ""
  echo "--- Checking model: $model ---"
  if ollama list 2>/dev/null | grep -q "^$model\s"; then
    echo "  Model '$model' is already installed. Skipping."
  else
    echo "  Pulling model '$model' (this may take a while)..."
    ollama pull "$model"
    echo "  Model '$model' pulled successfully."
  fi
done

echo ""
echo "=== Model setup complete ==="
echo "Installed models:"
ollama list
