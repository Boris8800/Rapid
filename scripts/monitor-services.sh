#!/usr/bin/env bash
# Rapid Roads - quick service status + health checks

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"

command -v docker >/dev/null 2>&1 || { echo "docker required" >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "docker compose required" >&2; exit 1; }

echo "== docker compose ps =="
docker compose -f "${COMPOSE_FILE}" ps

echo
echo "== nginx health =="
if command -v curl >/dev/null 2>&1; then
  curl -fsS http://localhost/health || true
else
  echo "curl not installed"
fi

echo
echo "== backend health =="
if command -v curl >/dev/null 2>&1; then
  curl -fsS http://localhost:4000/health || true
else
  echo "curl not installed"
fi

echo
echo "== recent logs (nginx/backend) =="
docker compose -f "${COMPOSE_FILE}" logs --tail=50 nginx-proxy backend-api || true
