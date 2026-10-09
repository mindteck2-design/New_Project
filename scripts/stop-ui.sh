#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"
if [[ -f "$PID_DIR/ui.pid" ]]; then
  kill "$(cat "$PID_DIR/ui.pid")" 2>/dev/null || true
  # also kill vite child if needed
  pkill -f "vite --host 127.0.0.1 --port" 2>/dev/null || true
  rm -f "$PID_DIR/ui.pid"
  echo "UI stopped"
else
  pkill -f "vite --host 127.0.0.1 --port" 2>/dev/null || true
  echo "No UI pid file; attempted pkill"
fi
