#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
if command -v docker >/dev/null 2>&1; then
  "$DIR/start-services.sh"
else
  "$DIR/start-services-local.sh"
fi
"$DIR/start-ui.sh"
