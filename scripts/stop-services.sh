#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"
if command -v docker >/dev/null 2>&1; then
  compose stop server minio mongo postgres || true
  echo "Docker services stopped"
fi
if [[ -f "$PID_DIR/server.pid" ]]; then
  kill "$(cat "$PID_DIR/server.pid")" 2>/dev/null || true
  rm -f "$PID_DIR/server.pid"
  echo "Local server stopped"
fi
