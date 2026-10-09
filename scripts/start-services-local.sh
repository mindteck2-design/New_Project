#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"
load_env

mkdir -p "$ROOT/.data/attachments" "$ROOT/.data/mongo"
export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-local}"
export SERVER_PORT="${SERVER_PORT:-18080}"
export AMMS_WORKFLOWS_DIR="$ROOT/docs/workflows"
export AMMS_ATTACHMENTS_DIR="$ROOT/.data/attachments"
export AMMS_FORMS_STORE="${AMMS_FORMS_STORE:-postgres}"

# Mongo optional
MONGO_BIN="$ROOT/.tools/mongodb-linux-x86_64-ubuntu2204-7.0.14/bin/mongod"
if [[ -x "$MONGO_BIN" ]] && ! curl -sf "http://127.0.0.1:27017" >/dev/null 2>&1; then
  if ! pgrep -f "mongod --dbpath $ROOT/.data/mongo" >/dev/null 2>&1; then
    nohup "$MONGO_BIN" --dbpath "$ROOT/.data/mongo" --port 27017 --bind_ip 127.0.0.1 \
      >"$ROOT/.data/mongod.log" 2>&1 &
    echo $! >"$PID_DIR/mongo.pid"
    sleep 2
  fi
fi

cd "$ROOT/server"
nohup mvn -q spring-boot:run -Dspring-boot.run.jvmArguments="-Dserver.port=${SERVER_PORT}" \
  >"$ROOT/.data/server.log" 2>&1 &
echo $! >"$PID_DIR/server.pid"
echo "Local server starting (pid $(cat "$PID_DIR/server.pid")) on :${SERVER_PORT} — log: .data/server.log"
