#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=common.sh
source "$(cd "$(dirname "$0")" && pwd)/common.sh"
load_env
if command -v docker >/dev/null 2>&1; then
  compose up -d postgres mongo minio server
  echo "Services started via docker compose (server on :${SERVER_PORT:-18080})"
else
  echo "Docker not available — use ./scripts/start-services-local.sh"
  exit 1
fi
