#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

MANIFEST="${1:-examples/karna-short.json}"

command -v node >/dev/null 2>&1 || { echo "[error] Node.js 20+ is required."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "[error] npm is required."; exit 1; }

if [ ! -f "$MANIFEST" ]; then
  echo "[error] Manifest not found: $MANIFEST" >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[setup] Installing dependencies..."
  npm install
fi

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo "== Mythic Video Studio =="
echo "Manifest: $MANIFEST"
echo

npm run produce -- "$MANIFEST"
