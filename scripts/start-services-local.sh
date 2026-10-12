#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"
load_env

mkdir -p "$ROOT/.data/attachments" "$ROOT/.data/mongo"
export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-local}"
export SERVER_PORT="${SERVER_PORT:-8080}"
export AMMS_WORKFLOWS_DIR="$ROOT/docs/workflows"
export AMMS_ATTACHMENTS_DIR="$ROOT/.data/attachments"
export MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/amms}"

# Prefer Mongo for dynamic forms (ADR-002). Fall back to PG JSONB only if mongod cannot start.
MONGO_BIN="$ROOT/.tools/mongodb-linux-x86_64-ubuntu2204-7.0.14/bin/mongod"
mongo_up=0
if pgrep -f "mongod --dbpath $ROOT/.data/mongo" >/dev/null 2>&1 || pgrep -x mongod >/dev/null 2>&1; then
  mongo_up=1
elif [[ -x "$MONGO_BIN" ]]; then
  nohup "$MONGO_BIN" --dbpath "$ROOT/.data/mongo" --port 27017 --bind_ip 127.0.0.1 \
    >"$ROOT/.data/mongod.log" 2>&1 &
  echo $! >"$PID_DIR/mongo.pid"
  sleep 2
  mongo_up=1
fi

if [[ -z "${AMMS_FORMS_STORE:-}" ]]; then
  if [[ "$mongo_up" == "1" ]]; then
    export AMMS_FORMS_STORE=mongo
  else
    export AMMS_FORMS_STORE=postgres
    echo "WARN: mongod not available — forms store falling back to postgres JSONB"
  fi
fi
echo "Forms store: ${AMMS_FORMS_STORE} (Mongo URI: ${MONGODB_URI})"

cd "$ROOT/server"
MVN_CMD=(mvn)
if ! command -v mvn >/dev/null 2>&1; then
  MVN_CMD=(./mvnw)
fi
nohup "${MVN_CMD[@]}" -q spring-boot:run -Dspring-boot.run.jvmArguments="-Dserver.port=${SERVER_PORT}" \
  >"$ROOT/.data/server.log" 2>&1 &
echo $! >"$PID_DIR/server.pid"
echo "Local server starting (pid $(cat "$PID_DIR/server.pid")) on :${SERVER_PORT} — log: .data/server.log"
