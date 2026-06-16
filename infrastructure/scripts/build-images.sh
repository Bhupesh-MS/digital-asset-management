#!/usr/bin/env sh
set -eu

VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:3000}"

docker build -f infrastructure/docker/api.Dockerfile -t dam-platform-api:latest .
docker build -f infrastructure/docker/worker.Dockerfile -t dam-platform-worker:latest .
docker build --build-arg "VITE_API_BASE_URL=${VITE_API_BASE_URL}" -f infrastructure/docker/web.Dockerfile -t dam-platform-web:latest .
