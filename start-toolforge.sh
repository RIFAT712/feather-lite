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

# 2. Build or verify Linux backend executable
if [ ! -f "${APP_DIR}/backend/feather-server-linux" ]; then
    echo "[Backend] Compiling Go server for Linux..."
    (cd "${APP_DIR}/backend" && go build -o feather-server-linux ./cmd/server)
fi

chmod +x "${APP_DIR}/backend/feather-server-linux"

# 3. Start Backend in background
echo "[Backend] Launching Go service on port ${BACKEND_PORT}..."
(
    cd "${APP_DIR}/backend"
    PORT=${BACKEND_PORT} \
    DATABASE_URL="${DATABASE_URL}" \
    DB_TYPE="${DB_TYPE}" \
    FRONTEND_URL="${FRONTEND_URL}" \
    OAUTH_CALLBACK_URL="${OAUTH_CALLBACK_URL}" \
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

if [ ! -d "node_modules" ]; then
    echo "[Frontend] Installing dependencies via pnpm..."
    corepack enable || true
    pnpm install --frozen-lockfile || npm install
fi

# Run Next.js production or dev server on port 8000
export PORT=8000
pnpm dev --port 8000 --hostname 0.0.0.0
