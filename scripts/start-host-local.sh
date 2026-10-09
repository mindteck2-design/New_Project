#!/usr/bin/env bash
# Native local start (no Docker Compose). Uses system Postgres/Mongo + host Java/Node.
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/common.sh"
load_env

# Prefer nvm Node (npm) when present
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  source "$HOME/.nvm/nvm.sh"
elif [[ -x /home/bstc/.nvm/versions/node/v24.14.1/bin/npm ]]; then
  export PATH="/home/bstc/.nvm/versions/node/v24.14.1/bin:$PATH"
fi

mkdir -p "$ROOT/.data/attachments" "$PID_DIR"
export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-local}"
export SERVER_PORT="${SERVER_PORT:-18080}"
export UI_PORT="${UI_PORT:-15173}"
export AMMS_WORKFLOWS_DIR="$ROOT/docs/workflows"
export AMMS_ATTACHMENTS_DIR="$ROOT/.data/attachments"
export AMMS_ATTACHMENTS_STORE="${AMMS_ATTACHMENTS_STORE:-filesystem}"
export MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/amms}"
export AMMS_FORMS_STORE="${AMMS_FORMS_STORE:-mongo}"
export POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export POSTGRES_DB="${POSTGRES_DB:-amms}"
export POSTGRES_USER="${POSTGRES_USER:-amms}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-amms_dev}"
export VITE_API_URL="${VITE_API_URL:-/api/v1}"
export VITE_API_PROXY_TARGET="${VITE_API_PROXY_TARGET:-http://127.0.0.1:${SERVER_PORT}}"
export PATH="/usr/lib/postgresql/18/bin:$PATH"

echo "==> Ensuring Postgres DB ${POSTGRES_DB} / role ${POSTGRES_USER}"
if command -v sudo >/dev/null && getent passwd postgres >/dev/null 2>&1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${POSTGRES_USER}') THEN
    CREATE ROLE ${POSTGRES_USER} LOGIN PASSWORD '${POSTGRES_PASSWORD}';
  ELSE
    ALTER ROLE ${POSTGRES_USER} WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';
  END IF;
END \$\$;
SQL
  if ! sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}'" | grep -q 1; then
    sudo -u postgres createdb -O "${POSTGRES_USER}" "${POSTGRES_DB}"
  fi
  sudo -u postgres psql -d "${POSTGRES_DB}" -c "GRANT ALL ON SCHEMA public TO ${POSTGRES_USER}; ALTER SCHEMA public OWNER TO ${POSTGRES_USER};" >/dev/null
else
  echo "WARN: cannot sudo to postgres; assuming DB already exists"
fi

PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c 'SELECT current_user, current_database();' >/dev/null
echo "==> Postgres OK"

if ! mongosh --quiet --eval 'db.runCommand({ping:1}).ok' 2>/dev/null | grep -q 1; then
  echo "ERROR: MongoDB not reachable at ${MONGODB_URI}"
  exit 1
fi
echo "==> Mongo OK"

command -v npm >/dev/null || { echo "ERROR: npm not on PATH"; exit 1; }
command -v mvn >/dev/null || { echo "ERROR: mvn not on PATH"; exit 1; }

# Stop previous transient units / leftover processes
systemctl stop amms-api.service amms-ui.service 2>/dev/null || true
pkill -f "spring-boot:run" 2>/dev/null || true
pkill -f "AmmsServerApplication" 2>/dev/null || true
pkill -f "vite.*${UI_PORT}" 2>/dev/null || true
sleep 1

# Persist via systemd so a helper shell/container exit does not kill the app
RUN_USER="${SUDO_USER:-${USER:-bstc}}"
if [[ "$(id -u)" -eq 0 ]]; then
  RUN_AS=(systemd-run --uid="$RUN_USER" --gid="$RUN_USER")
else
  RUN_AS=(systemd-run --user)
fi

: >"$ROOT/.data/server.log"
: >"$ROOT/.data/ui.log"

echo "==> Starting API on :${SERVER_PORT} (Flyway + SeedDataRunner on boot)"
"${RUN_AS[@]}" --unit=amms-api --collect \
  --working-directory="$ROOT/server" \
  --setenv=HOME="/home/${RUN_USER}" \
  --setenv=SPRING_PROFILES_ACTIVE="$SPRING_PROFILES_ACTIVE" \
  --setenv=SERVER_PORT="$SERVER_PORT" \
  --setenv=AMMS_WORKFLOWS_DIR="$AMMS_WORKFLOWS_DIR" \
  --setenv=AMMS_ATTACHMENTS_DIR="$AMMS_ATTACHMENTS_DIR" \
  --setenv=AMMS_ATTACHMENTS_STORE="$AMMS_ATTACHMENTS_STORE" \
  --setenv=MONGODB_URI="$MONGODB_URI" \
  --setenv=AMMS_FORMS_STORE="$AMMS_FORMS_STORE" \
  --setenv=POSTGRES_HOST="$POSTGRES_HOST" \
  --setenv=POSTGRES_PORT="$POSTGRES_PORT" \
  --setenv=POSTGRES_DB="$POSTGRES_DB" \
  --setenv=POSTGRES_USER="$POSTGRES_USER" \
  --setenv=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --setenv=JWT_SECRET="${JWT_SECRET:-change-me-to-a-long-random-dev-secret-at-least-32-chars}" \
  --setenv=JWT_EXPIRATION_MS="${JWT_EXPIRATION_MS:-86400000}" \
  --setenv=SEED_PASSWORD="${SEED_PASSWORD:-Passw0rd!}" \
  --setenv=AMMS_CORS_ALLOWED_ORIGINS="${AMMS_CORS_ALLOWED_ORIGINS:-http://127.0.0.1:15173,http://localhost:15173}" \
  --property=StandardOutput=append:"$ROOT/.data/server.log" \
  --property=StandardError=append:"$ROOT/.data/server.log" \
  /bin/bash -lc "mvn -q spring-boot:run -Dspring-boot.run.jvmArguments='-Dserver.port=${SERVER_PORT}'"

echo "==> Starting UI on :${UI_PORT}"
cd "$ROOT/ui"
if [[ ! -d node_modules ]]; then
  npm install
fi
NPM_BIN="$(command -v npm)"
NODE_DIR="$(dirname "$NPM_BIN")"
"${RUN_AS[@]}" --unit=amms-ui --collect \
  --working-directory="$ROOT/ui" \
  --setenv=HOME="/home/${RUN_USER}" \
  --setenv=PATH="${NODE_DIR}:/usr/local/bin:/usr/bin:/bin" \
  --setenv=UI_PORT="$UI_PORT" \
  --setenv=VITE_API_URL="$VITE_API_URL" \
  --setenv=VITE_API_PROXY_TARGET="$VITE_API_PROXY_TARGET" \
  --property=StandardOutput=append:"$ROOT/.data/ui.log" \
  --property=StandardError=append:"$ROOT/.data/ui.log" \
  /bin/bash -lc "npm run dev -- --host 0.0.0.0 --port ${UI_PORT}"

echo "==> Waiting for API..."
for _ in $(seq 1 120); do
  if grep -q "Started AmmsServerApplication\|Tomcat started on port" "$ROOT/.data/server.log" 2>/dev/null; then
    break
  fi
  if curl -sf --connect-timeout 1 "http://127.0.0.1:${SERVER_PORT}/actuator/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if curl -sf --connect-timeout 2 "http://127.0.0.1:${SERVER_PORT}/actuator/health" >/dev/null 2>&1 \
  || grep -q "Started AmmsServerApplication\|Tomcat started on port" "$ROOT/.data/server.log" 2>/dev/null; then
  echo "API up on http://127.0.0.1:${SERVER_PORT}"
else
  echo "API still starting — check: journalctl -u amms-api -n 50  and  .data/server.log"
  tail -40 "$ROOT/.data/server.log" || true
fi

if curl -sf --connect-timeout 2 "http://127.0.0.1:${UI_PORT}/" >/dev/null 2>&1 \
  || grep -qi "Local:.*${UI_PORT}" "$ROOT/.data/ui.log" 2>/dev/null; then
  echo "UI up on http://127.0.0.1:${UI_PORT}"
else
  echo "UI still starting — check: journalctl -u amms-ui -n 50  and  .data/ui.log"
  tail -20 "$ROOT/.data/ui.log" || true
fi

echo "Seeded password: ${SEED_PASSWORD:-Passw0rd!} (admin, inspection.user, progress.user, ...)"
echo "Stop later with: sudo systemctl stop amms-api amms-ui"
