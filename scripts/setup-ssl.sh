#!/usr/bin/env bash
# Rapid Roads - SSL bootstrap for Dockerized Nginx (webroot)
# - Creates temporary self-signed certs so Nginx can start
# - Creates ssl-dhparams.pem inside letsencrypt volume
# - Requests/renews Let's Encrypt certs for all hostnames

set -euo pipefail

DOMAIN_ROOT="${DOMAIN_ROOT:-rapidroad.uk}"
EMAIL="${LETSENCRYPT_EMAIL:-admin@rapidroad.uk}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
SKIP_LETSENCRYPT="${SKIP_LETSENCRYPT:-false}"

DOMAINS=(
  "${DOMAIN_ROOT}"
  "www.${DOMAIN_ROOT}"
  "api.${DOMAIN_ROOT}"
  "driver.${DOMAIN_ROOT}"
  "admin.${DOMAIN_ROOT}"
)

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

# Compose variable interpolation reads from the shell environment (and optional .env).
# If we're running on the VPS, prefer the repo's .env.production.
if [ -f ./.env.production ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.production
  set +a
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin not found; attempting to install" >&2

  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    if ! apt-get install -y docker-compose-plugin >/dev/null 2>&1; then
      echo "Failed to install docker-compose-plugin via apt; install it manually." >&2
      exit 1
    fi
  else
    echo "No apt-get available; install Docker Compose plugin manually." >&2
    exit 1
  fi

  if ! docker compose version >/dev/null 2>&1; then
    echo "docker compose still unavailable after install" >&2
    exit 1
  fi
fi

ensure_volume_file() {
  local volume_name="$1"
  local file_path="$2"

  docker run --rm -v "${volume_name}:/data" alpine:3.20 sh -eu -c '
    file_path="$1"
    mkdir -p "$(dirname "/data/${file_path}")"

    if [ ! -f "/data/${file_path}" ]; then
      echo "Generating /data/${file_path}"
      apk add --no-cache openssl >/dev/null
      openssl dhparam -out "/data/${file_path}" 2048 >/dev/null 2>&1
    fi
  ' -- "${file_path}"
}

create_dummy_certs() {
  local volume_name="$1"

  docker run --rm -v "${volume_name}:/etc/letsencrypt" alpine:3.20 sh -eu -c '
    apk add --no-cache openssl >/dev/null

    for d in "$@"; do
      live_dir="/etc/letsencrypt/live/${d}"

      if [ ! -f "${live_dir}/fullchain.pem" ] || [ ! -f "${live_dir}/privkey.pem" ]; then
        echo "Creating dummy cert for ${d}"
        mkdir -p "${live_dir}"
        openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
          -keyout "${live_dir}/privkey.pem" \
          -out "${live_dir}/fullchain.pem" \
          -subj "/CN=${d}" >/dev/null 2>&1
      fi
    done
  ' -- "${DOMAINS[@]}"
}

echo "[SSL] Preparing volumes"

# Compose names volumes as: <project>_<volume>
# We resolve the actual name by asking compose for config and grepping isn't reliable.
# Simpler: start compose once so named volumes exist.
docker compose -f "${COMPOSE_FILE}" up -d postgres redis || true

echo "[SSL] Creating dhparams in LetsEncrypt volume"
# Compose file pins project name to "rapidroads", so volume names are deterministic.
LE_VOLUME="rapidroads_letsencrypt"
WWW_VOLUME="rapidroads_certbot_www"

# If only postgres/redis were started, these volumes may not exist yet.
# Create them explicitly so we can write dhparams and dummy certs.
docker volume inspect "${LE_VOLUME}" >/dev/null 2>&1 || docker volume create "${LE_VOLUME}" >/dev/null
docker volume inspect "${WWW_VOLUME}" >/dev/null 2>&1 || docker volume create "${WWW_VOLUME}" >/dev/null

if ! docker volume inspect "${LE_VOLUME}" >/dev/null 2>&1 || ! docker volume inspect "${WWW_VOLUME}" >/dev/null 2>&1; then
  echo "Expected volumes not found (${LE_VOLUME}, ${WWW_VOLUME}). Run: docker compose -f ${COMPOSE_FILE} up -d" >&2
  exit 1
fi

ensure_volume_file "${LE_VOLUME}" "ssl-dhparams.pem"

echo "[SSL] Creating dummy certificates (so Nginx can start)"
create_dummy_certs "${LE_VOLUME}"

echo "[SSL] Starting Nginx for ACME challenge"
docker compose -f "${COMPOSE_FILE}" up -d nginx-proxy

if [ "${SKIP_LETSENCRYPT}" = "true" ]; then
  echo "[SSL] SKIP_LETSENCRYPT=true: leaving dummy certificates in place."
  echo "[SSL] Re-run without SKIP_LETSENCRYPT to request real certificates once DNS is ready."
  exit 0
fi

echo "[SSL] Requesting Let's Encrypt certificates"
# Request certs individually to match per-hostname live paths used by nginx configs.
for d in "${DOMAINS[@]}"; do
  echo "  - ${d}"
  docker compose -f "${COMPOSE_FILE}" run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    --email "${EMAIL}" --agree-tos --no-eff-email \
    -d "${d}" \
    --rsa-key-size 4096 \
    --force-renewal
done

echo "[SSL] Reloading Nginx"
docker compose -f "${COMPOSE_FILE}" exec nginx-proxy nginx -s reload

echo "[SSL] Done"
