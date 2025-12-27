#!/usr/bin/env bash
# Rapid Roads - IP-only deploy (no domain / no Let's Encrypt / no nginx)
# Uses docker-compose.yml which exposes ports 3000 (frontend) and 4000 (backend).
# Intended as a temporary mode until you buy a domain.

set -euo pipefail

print() { printf '%s\n' "$*"; }

die() {
  print "ERROR: $*" >&2
  exit 1
}

is_interactive() { [ -t 0 ] && [ -t 1 ]; }

prompt_yes_no() {
  local question="$1"
  local default_yes="${2:-true}"

  if ! is_interactive; then
    [ "${default_yes}" = "true" ] && return 0
    return 1
  fi

  local suffix
  if [ "${default_yes}" = "true" ]; then suffix="[Y/n]"; else suffix="[y/N]"; fi

  local reply
  while true; do
    printf '%s %s: ' "${question}" "${suffix}" >&2
    read -r reply || true
    reply="${reply:-}"

    if [ -z "${reply}" ]; then
      [ "${default_yes}" = "true" ] && return 0
      return 1
    fi

    case "${reply}" in
      y|Y|yes|YES) return 0 ;;
      n|N|no|NO) return 1 ;;
      *) print "Please answer y/n." >&2 ;;
    esac
  done
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    die "Run as root (sudo)."
  fi
}

detect_public_ip() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS https://api.ipify.org || true
  fi
}

ensure_env_kv() {
  local file="$1"
  local key="$2"
  local value="$3"

  if grep -qE "^${key}=" "${file}"; then
    local escaped
    escaped="$(printf '%s' "${value}" | sed 's/[\\&]/\\\\&/g')"
    sed -i "s|^${key}=.*$|${key}=${escaped}|" "${file}"
  else
    printf '\n%s=%s\n' "${key}" "${value}" >>"${file}"
  fi
}

install_base_packages() {
  apt-get update
  apt-get install -y ca-certificates curl gnupg lsb-release openssl ufw
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    return
  fi
  curl -fsSL https://get.docker.com | sh
}

install_docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    return
  fi
  apt-get update
  apt-get install -y docker-compose-plugin
  docker compose version >/dev/null 2>&1 || die "Docker Compose plugin install failed"
}

configure_firewall_ip_mode() {
  if ! command -v ufw >/dev/null 2>&1; then
    return 0
  fi

  # keep ssh
  ufw allow 22/tcp >/dev/null 2>&1 || true

  # IP-mode ports
  ufw allow 3000/tcp >/dev/null 2>&1 || true
  ufw allow 4000/tcp >/dev/null 2>&1 || true

  # ops dashboard should remain local-only (127.0.0.1 binding), so no UFW rule needed.

  if ufw status | grep -qi inactive; then
    if prompt_yes_no "Enable UFW firewall now?" true; then
      ufw --force enable >/dev/null 2>&1 || true
    fi
  fi
}

ensure_ip_env_file() {
  local ip="$1"
  local file="./.env.ip"

  if [ ! -f "${file}" ]; then
    cat >"${file}" <<'EOF'
# RapidRoads IP-only mode (temporary)
# Used by: docker compose --env-file ./.env.ip -f docker-compose.yml up

POSTGRES_DB=rapidroads
POSTGRES_USER=rapidroads_admin
POSTGRES_PASSWORD=

JWT_SECRET=
JWT_REFRESH_SECRET=

# For dev-compose containers
NEXT_PUBLIC_API_URL=
CORS_ORIGINS=
EOF
    chmod 600 "${file}" || true
  fi

  # Generate secrets if missing
  if ! grep -qE '^POSTGRES_PASSWORD=.+$' "${file}"; then
    ensure_env_kv "${file}" POSTGRES_PASSWORD "$(openssl rand -hex 24)"
  fi
  if ! grep -qE '^JWT_SECRET=.+$' "${file}"; then
    ensure_env_kv "${file}" JWT_SECRET "$(openssl rand -hex 48)"
  fi
  if ! grep -qE '^JWT_REFRESH_SECRET=.+$' "${file}"; then
    ensure_env_kv "${file}" JWT_REFRESH_SECRET "$(openssl rand -hex 48)"
  fi

  ensure_env_kv "${file}" NEXT_PUBLIC_API_URL "http://${ip}:4000"
  ensure_env_kv "${file}" CORS_ORIGINS "http://${ip}:3000"
}

main() {
  require_root

  if [ ! -f ./docker-compose.yml ]; then
    die "Run from repo root (docker-compose.yml not found)."
  fi

  local ip
  ip="$(detect_public_ip)"
  ip="${ip:-5.249.164.40}"

  print "== Rapid Roads IP-only Deploy =="
  print "VPS IP: ${ip}"
  print "Mode:   HTTP only (no domain / no SSL / no nginx)"
  print

  install_base_packages
  install_docker
  install_docker_compose
  configure_firewall_ip_mode
  ensure_ip_env_file "${ip}"

  print
  print "Starting stack (docker-compose.yml)"
  docker compose --env-file ./.env.ip -f docker-compose.yml up -d --build

  print
  print "Done. Open:"
  print "- Frontend: http://${ip}:3000"
  print "- API:      http://${ip}:4000 (health: /v1/health)"
  print
  print "Note: admin/driver subdomains require a real domain + production compose."
}

main "$@"
