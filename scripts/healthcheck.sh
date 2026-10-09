#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"
load_env
PORT="${SERVER_PORT:-18080}"
UI="${UI_PORT:-15173}"
ok=0
if curl -sf "http://127.0.0.1:${PORT}/actuator/health" >/dev/null; then
  echo "OK server health :${PORT}"
else
  echo "FAIL server health :${PORT}"
  ok=1
fi
if curl -sf "http://127.0.0.1:${UI}/" >/dev/null; then
  echo "OK ui :${UI}"
else
  echo "WARN ui not responding :${UI}"
fi
exit $ok
