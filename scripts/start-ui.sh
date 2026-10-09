#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"
load_env

# Prefer config/ui Vite env (enterprise). Fall back to root config/.env / defaults.
export UI_PORT="${UI_PORT:-15173}"
# Do not override VITE_API_URL here when config/ui/.env.development sets same-origin /api/v1
if [[ -z "${VITE_API_URL:-}" ]]; then
  export VITE_API_URL="/api/v1"
fi
export VITE_API_PROXY_TARGET="${VITE_API_PROXY_TARGET:-http://127.0.0.1:${SERVER_PORT:-18080}}"

mkdir -p "$ROOT/.data"
cd "$ROOT/ui"
if [[ ! -d node_modules ]]; then
  npm install
fi
# Bind all interfaces so Cursor cloud / forwarded browser can open the UI
nohup npm run dev -- --host 0.0.0.0 --port "$UI_PORT" >"$ROOT/.data/ui.log" 2>&1 &
echo $! >"$PID_DIR/ui.pid"
echo "UI starting on http://0.0.0.0:${UI_PORT} (open http://127.0.0.1:${UI_PORT}) — API via Vite proxy ${VITE_API_PROXY_TARGET}"
