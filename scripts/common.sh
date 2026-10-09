#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export ROOT
PID_DIR="$ROOT/scripts/.pids"
mkdir -p "$PID_DIR"

load_env() {
  # Prompt: top-level .env is primary; config/.env may override for local overlays
  if [[ -f "$ROOT/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/.env"
    set +a
  fi
  if [[ -f "$ROOT/config/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/config/.env"
    set +a
  fi
}

compose() {
  load_env
  local env_file="$ROOT/.env"
  if [[ ! -f "$env_file" ]]; then
    env_file="$ROOT/config/.env"
  fi
  docker compose --env-file "$env_file" -f "$ROOT/docker/docker-compose.yml" "$@"
}
