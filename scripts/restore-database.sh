#!/usr/bin/env bash
# Rapid Roads - Restore Postgres from a backup dump (.dump.gz)
# Usage:
#   bash scripts/restore-database.sh backups/db/latest.dump.gz

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
POSTGRES_DB="${POSTGRES_DB:-rapidroads}"
POSTGRES_USER="${POSTGRES_USER:-rapidroads_admin}"

DUMP_GZ="${1:-}"
if [ -z "${DUMP_GZ}" ] || [ ! -f "${DUMP_GZ}" ]; then
  echo "Provide path to a .dump.gz file" >&2
  exit 1
fi

command -v docker >/dev/null 2>&1 || { echo "docker required" >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "docker compose required" >&2; exit 1; }

echo "[restore] stopping app services (keeping postgres/redis running)"
docker compose -f "${COMPOSE_FILE}" stop backend-api frontend-web nginx-proxy || true

echo "[restore] dropping and recreating database ${POSTGRES_DB}"
docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U "${POSTGRES_USER}" -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${POSTGRES_DB};
CREATE DATABASE ${POSTGRES_DB};
SQL

echo "[restore] restoring from ${DUMP_GZ}"
# Restore custom format (-Fc)
gzip -dc "${DUMP_GZ}" | docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists --no-owner

echo "[restore] starting services"
docker compose -f "${COMPOSE_FILE}" up -d nginx-proxy backend-api frontend-web

echo "[restore] done"
