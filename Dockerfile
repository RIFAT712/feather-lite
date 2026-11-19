# ------------------------------------------------------------------------------
# Stage 1: Build Go Backend
# ------------------------------------------------------------------------------
FROM golang:1.22-bookworm AS backend-builder
WORKDIR /build/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /app/feather-server ./cmd/server

# ------------------------------------------------------------------------------
# Stage 2: Build Next.js Frontend
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /build/frontend
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ------------------------------------------------------------------------------
# Stage 3: Production Runner Image
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8000
ENV BACKEND_PORT=8081

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy Go binary from backend-builder
COPY --from=backend-builder /app/feather-server /app/backend/feather-server
RUN chmod +x /app/backend/feather-server

# Copy Next.js frontend build & dependencies from frontend-builder
COPY --from=frontend-builder /build/frontend/package.json /build/frontend/pnpm-lock.yaml /app/frontend/
COPY --from=frontend-builder /build/frontend/node_modules /app/frontend/node_modules
COPY --from=frontend-builder /build/frontend/.next /app/frontend/.next
COPY --from=frontend-builder /build/frontend/public /app/frontend/public
COPY --from=frontend-builder /build/frontend/next.config.ts /app/frontend/

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
