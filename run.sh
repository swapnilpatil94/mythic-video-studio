#!/usr/bin/env bash
set -euo pipefail

MANIFEST="${1:-examples/karna-short.json}"
OUTPUT="${2:-}"

command -v node >/dev/null 2>&1 || { echo "Node.js 20+ is required."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required."; exit 1; }

if [ ! -d node_modules ]; then
  echo "[setup] Installing dependencies..."
  npm install
fi

if [ -n "$OUTPUT" ]; then
  npm run produce -- "$MANIFEST" "$OUTPUT"
else
  npm run produce -- "$MANIFEST"
fi
