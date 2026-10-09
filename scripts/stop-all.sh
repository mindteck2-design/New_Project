#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
"$DIR/stop-ui.sh" || true
"$DIR/stop-services.sh" || true
