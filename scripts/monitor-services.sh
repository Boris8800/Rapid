#!/usr/bin/env bash
# Rapid Roads - quick service status + health checks

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"

print() { printf '%s\n' "$*"; }

require_tools() {
  command -v docker >/dev/null 2>&1 || { echo "docker required" >&2; exit 1; }
  docker compose version >/dev/null 2>&1 || { echo "docker compose required" >&2; exit 1; }
}

curl_host() {
  local url="$1"
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "${url}" || true
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O- "${url}" || true
  else
    echo "curl/wget not installed"
  fi
}

require_tools

print "== docker compose ps =="
docker compose -f "${COMPOSE_FILE}" ps

print
print "== nginx health (host -> nginx) =="
curl_host "http://localhost/health"

print
print "== backend health (container -> backend-api) =="
docker compose -f "${COMPOSE_FILE}" exec -T backend-api sh -lc 'wget -q -O- http://localhost:4000/v1/health || curl -fsS http://localhost:4000/v1/health' || true

print
print "== frontend health (container -> frontend-web) =="
docker compose -f "${COMPOSE_FILE}" exec -T frontend-web sh -lc 'wget -q -O- http://localhost:3000/ || curl -fsS http://localhost:3000/' || true

print
print "== recent logs (nginx/backend/frontend) =="
docker compose -f "${COMPOSE_FILE}" logs --tail=50 nginx-proxy backend-api || true
docker compose -f "${COMPOSE_FILE}" logs --tail=50 frontend-web || true
