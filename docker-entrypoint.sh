#!/usr/bin/env bash
set -e

echo "=== [Feather-Lite] Starting in Toolforge Container ==="

# Toolforge mounts /data/project/feather-lite at runtime
TOOL_DIR="/data/project/feather-lite"
if [ ! -d "${TOOL_DIR}" ]; then
    TOOL_DIR="/app/data"
    mkdir -p "${TOOL_DIR}"
fi

# Environment variables from Toolforge envvars take precedence
export PORT="${PORT:-8000}"
export BACKEND_PORT="${BACKEND_PORT:-8081}"
export DB_TYPE="${DB_TYPE:-sqlite}"
export DATABASE_URL="${DATABASE_URL:-${TOOL_DIR}/feather.db}"
export FRONTEND_URL="${FRONTEND_URL:-https://feather-lite.toolforge.org}"
export OAUTH_CALLBACK_URL="${OAUTH_CALLBACK_URL:-https://feather-lite.toolforge.org/auth/callback}"
export OWNER_USERNAME="${OWNER_USERNAME:-R1F4T}"

# 1. Start Go Backend in background
echo "[Backend] Starting Feather Go Server on port ${BACKEND_PORT}..."
(
    cd /app/backend
    PORT="${BACKEND_PORT}" \
    DATABASE_URL="${DATABASE_URL}" \
    DB_TYPE="${DB_TYPE}" \
    FRONTEND_URL="${FRONTEND_URL}" \
    OAUTH_CALLBACK_URL="${OAUTH_CALLBACK_URL}" \
    OWNER_USERNAME="${OWNER_USERNAME}" \
    ./feather-server
) &
BACKEND_PID=$!

cleanup() {
    echo "Stopping Go backend (PID ${BACKEND_PID})..."
    kill -TERM "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
}
trap cleanup SIGINT SIGTERM EXIT

# Give backend a moment to initialize database schema
sleep 2

# 2. Start Next.js on port 8000 (Toolforge ingress port)
echo "[Frontend] Starting Next.js Production Server on port ${PORT}..."
cd /app/frontend
exec pnpm start --port "${PORT}" --hostname 0.0.0.0
