#!/usr/bin/env bash
# Rapid Roads - host maintenance helper (Ubuntu/Debian)
# - Applies security updates
# - Restarts fail2ban
# - Pulls latest images (if you use tags)

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

echo "[update] apt update/upgrade"
apt-get update
apt-get upgrade -y

if systemctl is-enabled unattended-upgrades >/dev/null 2>&1; then
  echo "[update] unattended-upgrades enabled"
fi

if systemctl list-unit-files | grep -q '^fail2ban\.service'; then
  echo "[update] restarting fail2ban"
  systemctl restart fail2ban || true
fi

echo "[update] pulling docker images"
docker compose -f "${COMPOSE_FILE}" pull || true

echo "[update] done"
