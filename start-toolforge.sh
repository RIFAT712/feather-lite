#!/usr/bin/env bash

# Do NOT use set -e so minor non-fatal warnings never kill the startup
set +e

# ==============================================================================
# Feather 2.0 - Toolforge Combined Entrypoint
# Tool: feather-lite (https://feather-lite.toolforge.org)
# ==============================================================================

TOOL_DIR="/data/project/feather-lite"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== [Feather-Lite] Initializing deployment from ${APP_DIR} ==="

# 1. Environment Configuration (Toolforge envvars take precedence if set)
export PORT="${PORT:-8000}"
export BACKEND_PORT="${BACKEND_PORT:-8081}"
export INTERNAL_API_URL="${INTERNAL_API_URL:-http://127.0.0.1:${BACKEND_PORT}}"
export DB_TYPE="${DB_TYPE:-sqlite}"
export FRONTEND_URL="${FRONTEND_URL:-https://feather-lite.toolforge.org}"
export OAUTH_CALLBACK_URL="${OAUTH_CALLBACK_URL:-https://feather-lite.toolforge.org/auth/callback}"
export OWNER_USERNAME="${OWNER_USERNAME:-R1F4T}"

# Database path resolution: check if /data/project/feather-lite is writable
if [ -d "${TOOL_DIR}" ] && [ -w "${TOOL_DIR}" ]; then
    export DATABASE_URL="${DATABASE_URL:-${TOOL_DIR}/feather.db}"
else
    mkdir -p "${APP_DIR}/backend/data" 2>/dev/null || true
    export DATABASE_URL="${DATABASE_URL:-${APP_DIR}/backend/data/feather.db}"
fi

echo "[Feather-Lite] Using DATABASE_URL=${DATABASE_URL}"

# 2. Binary execution handling (copy to /tmp if read-only or not executable)
EXEC_BIN="${APP_DIR}/backend/feather-server-amd64"
if [ ! -f "${EXEC_BIN}" ]; then
    EXEC_BIN="${APP_DIR}/backend/feather-server-linux"
fi
chmod +x "${EXEC_BIN}" 2>/dev/null || true
if [ ! -x "${EXEC_BIN}" ]; then
    echo "[Backend] Copying binary to /tmp for execution..."
    cp "${EXEC_BIN}" /tmp/feather-server 2>/dev/null || true
    chmod +x /tmp/feather-server 2>/dev/null || true
    if [ -x "/tmp/feather-server" ]; then
        EXEC_BIN="/tmp/feather-server"
    fi
fi

# 3. Start Go Backend in background
echo "[Backend] Launching Go service on port ${BACKEND_PORT} using ${EXEC_BIN}..."
(
    cd "${APP_DIR}/backend"
    PORT="${BACKEND_PORT}" \
    DATABASE_URL="${DATABASE_URL}" \
    DB_TYPE="${DB_TYPE}" \
    FRONTEND_URL="${FRONTEND_URL}" \
    OAUTH_CALLBACK_URL="${OAUTH_CALLBACK_URL}" \
    OWNER_USERNAME="${OWNER_USERNAME}" \
    "${EXEC_BIN}"
) &
BACKEND_PID=$!

cleanup() {
    echo "Shutting down Feather backend (PID ${BACKEND_PID})..."
    kill -TERM "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
}
trap cleanup SIGINT SIGTERM EXIT

# Give backend a moment to verify DB schema & bind port
sleep 2

# 4. Start Next.js Frontend on port 8000
echo "[Frontend] Launching Next.js on port ${PORT}..."
cd "${APP_DIR}/frontend"

if [ -f "./node_modules/.bin/next" ]; then
    exec ./node_modules/.bin/next start -p "${PORT}" -H 0.0.0.0
elif command -v pnpm >/dev/null 2>&1; then
    exec pnpm start -- -p "${PORT}" -H 0.0.0.0
elif [ -f "${APP_DIR}/node_modules/.bin/next" ]; then
    exec "${APP_DIR}/node_modules/.bin/next" start -p "${PORT}" -H 0.0.0.0
else
    exec npx next start -p "${PORT}" -H 0.0.0.0
fi
