#!/usr/bin/env bash
set -e

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
export DB_TYPE="${DB_TYPE:-sqlite}"
export DATABASE_URL="${DATABASE_URL:-${TOOL_DIR}/feather.db}"
export FRONTEND_URL="${FRONTEND_URL:-https://feather-lite.toolforge.org}"
export OAUTH_CALLBACK_URL="${OAUTH_CALLBACK_URL:-https://feather-lite.toolforge.org/auth/callback}"
export OWNER_USERNAME="${OWNER_USERNAME:-R1F4T}"

# 2. Make Linux backend executable
if [ -f "${APP_DIR}/backend/feather-server-linux" ]; then
    chmod +x "${APP_DIR}/backend/feather-server-linux"
fi

# 3. Start Go Backend in background
echo "[Backend] Launching Go service on port ${BACKEND_PORT}..."
(
    cd "${APP_DIR}/backend"
    PORT="${BACKEND_PORT}" \
    DATABASE_URL="${DATABASE_URL}" \
    DB_TYPE="${DB_TYPE}" \
    FRONTEND_URL="${FRONTEND_URL}" \
    OAUTH_CALLBACK_URL="${OAUTH_CALLBACK_URL}" \
    OWNER_USERNAME="${OWNER_USERNAME}" \
    ./feather-server-linux
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

exec pnpm start --port "${PORT}" --hostname 0.0.0.0
