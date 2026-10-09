#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export ROOT
PID_DIR="$ROOT/scripts/.pids"
mkdir -p "$PID_DIR"

load_env() {
  if [[ -f "$ROOT/config/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/config/.env"
    set +a
  fi
}

compose() {
  load_env
  docker compose --env-file "$ROOT/config/.env" -f "$ROOT/docker/docker-compose.yml" "$@"
}
