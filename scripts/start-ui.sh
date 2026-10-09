#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"
load_env
export VITE_API_URL="${VITE_API_URL:-http://127.0.0.1:18080/api/v1}"
UI_PORT="${UI_PORT:-15173}"
cd "$ROOT/ui"
if [[ ! -d node_modules ]]; then
  npm install
fi
nohup npm run dev -- --host 127.0.0.1 --port "$UI_PORT" >"$ROOT/.data/ui.log" 2>&1 &
echo $! >"$PID_DIR/ui.pid"
echo "UI starting on http://127.0.0.1:${UI_PORT} (pid $(cat "$PID_DIR/ui.pid"))"
