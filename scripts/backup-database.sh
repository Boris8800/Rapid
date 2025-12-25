#!/usr/bin/env bash
# Rapid Roads - Database + config backup
# - Creates compressed Postgres dump (custom format)
# - Optionally backs up letsencrypt certs and repo config
# - Optional remote copy via rclone

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
WITH_CERTS="${WITH_CERTS:-true}"
WITH_CONFIG="${WITH_CONFIG:-true}"

POSTGRES_DB="${POSTGRES_DB:-rapidroads}"
POSTGRES_USER="${POSTGRES_USER:-rapidroads_admin}"

timestamp() { date -u +%Y%m%dT%H%M%SZ; }

require_tools() {
  command -v docker >/dev/null 2>&1 || { echo "docker required" >&2; exit 1; }
  docker compose version >/dev/null 2>&1 || { echo "docker compose required" >&2; exit 1; }
}

mkdir -p "${BACKUP_DIR}/db" "${BACKUP_DIR}/certs" "${BACKUP_DIR}/config" "${BACKUP_DIR}/logs"

require_tools

TS="$(timestamp)"
DB_OUT="${BACKUP_DIR}/db/rapidroads_${TS}.dump"
DB_OUT_GZ="${DB_OUT}.gz"

echo "[backup] dumping database -> ${DB_OUT_GZ}"
# Use -Fc custom format for reliable restore.
docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc | gzip -9 > "${DB_OUT_GZ}"

echo "[backup] verifying dump file"
test -s "${DB_OUT_GZ}"

echo "[backup] writing latest marker"
ln -sf "$(basename "${DB_OUT_GZ}")" "${BACKUP_DIR}/db/latest.dump.gz"

if [ "${WITH_CERTS}" = "true" ]; then
  echo "[backup] exporting letsencrypt volume"
  LE_VOLUME="rapidroads_letsencrypt"
  if docker volume inspect "${LE_VOLUME}" >/dev/null 2>&1; then
    CERT_OUT="${BACKUP_DIR}/certs/letsencrypt_${TS}.tar.gz"
    docker run --rm -v "${LE_VOLUME}:/data:ro" -v "$(pwd)/${BACKUP_DIR}/certs:/out" alpine:3.20 sh -c "tar -czf /out/$(basename "${CERT_OUT}") -C /data ."
    ln -sf "$(basename "${CERT_OUT}")" "${BACKUP_DIR}/certs/latest.tar.gz"
  else
    echo "[backup] WARN: could not find letsencrypt volume (skipping cert backup)" >&2
  fi
fi

if [ "${WITH_CONFIG}" = "true" ]; then
  echo "[backup] archiving config files"
  CFG_OUT="${BACKUP_DIR}/config/config_${TS}.tar.gz"
  tar -czf "${CFG_OUT}" \
    nginx \
    database \
    docker-compose.production.yml \
    docker-compose.monitoring.yml \
    Makefile \
    scripts \
    docs \
    2>/dev/null || true
  ln -sf "$(basename "${CFG_OUT}")" "${BACKUP_DIR}/config/latest.tar.gz"
fi

# Optional remote backup: set RCLONE_REMOTE like "s3:rapidroads-backups"
if command -v rclone >/dev/null 2>&1 && [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "[backup] syncing to remote: ${RCLONE_REMOTE}"
  rclone copy "${BACKUP_DIR}" "${RCLONE_REMOTE}" --copy-links --transfers 8
fi

echo "[backup] pruning backups older than ${KEEP_DAYS} days"
find "${BACKUP_DIR}/db" -type f -name '*.dump.gz' -mtime "+${KEEP_DAYS}" -delete || true
find "${BACKUP_DIR}/certs" -type f -name '*.tar.gz' -mtime "+${KEEP_DAYS}" -delete || true
find "${BACKUP_DIR}/config" -type f -name '*.tar.gz' -mtime "+${KEEP_DAYS}" -delete || true

echo "[backup] done"
