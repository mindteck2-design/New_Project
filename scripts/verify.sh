#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== server: compile + test =="
(cd server && mvn -q test)

echo "== ui: production build =="
(cd ui && npm run build)

if [[ "${SKIP_HEALTHCHECK:-0}" != "1" ]]; then
  if curl -sf "http://127.0.0.1:${SERVER_PORT:-18080}/actuator/health" >/dev/null 2>&1; then
    echo "== optional healthcheck =="
    "$ROOT/scripts/healthcheck.sh"
  else
    echo "== skip healthcheck (server not running; set SKIP_HEALTHCHECK=1 to silence) =="
  fi
fi

echo "OK verify complete"
