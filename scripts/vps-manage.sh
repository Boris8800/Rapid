#!/usr/bin/env bash
# Rapid Roads - VPS management helper
# Inspired by the example "vps-manage" scripts: provides safe, simple commands
# for checking status/logs and starting/stopping the Docker stacks.
#
# Usage (run on the VPS in the repo root):
#   sudo bash scripts/vps-manage.sh status
#   sudo bash scripts/vps-manage.sh health
#   sudo bash scripts/vps-manage.sh logs nginx-proxy
#   sudo bash scripts/vps-manage.sh restart
#   sudo bash scripts/vps-manage.sh backup
#
# Environment:
#   COMPOSE_PROD_FILE=docker-compose.production.yml
#   COMPOSE_MON_FILE=docker-compose.monitoring.yml

set -euo pipefail

COMPOSE_PROD_FILE="${COMPOSE_PROD_FILE:-docker-compose.production.yml}"
COMPOSE_MON_FILE="${COMPOSE_MON_FILE:-docker-compose.monitoring.yml}"

supports_color() {
  [ -t 1 ] && [ -n "${TERM:-}" ] && [ "${TERM}" != "dumb" ]
}

color() {
  local code="$1"
  shift || true
  if supports_color; then
    printf '\033[%sm%s\033[0m\n' "${code}" "$*"
  else
    printf '%s\n' "$*"
  fi
}

print() { printf '%s\n' "$*"; }

die() {
  print "ERROR: $*" >&2
  exit 1
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    die "Run as root (sudo)."
  fi
}

require_tools() {
  command -v docker >/dev/null 2>&1 || die "docker is required"
  docker compose version >/dev/null 2>&1 || die "docker compose plugin is required"
}

repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P
}

load_env_if_present() {
  if [ -f ./.env.production ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env.production
    set +a
  fi
}

prod() { docker compose -f "${COMPOSE_PROD_FILE}" "$@"; }
mon() { docker compose -f "${COMPOSE_MON_FILE}" "$@"; }

cmd_status() {
  print "== production stack =="
  prod ps

  if [ -f "${COMPOSE_MON_FILE}" ]; then
    print
    print "== monitoring stack =="
    mon ps || true
  fi
}

cmd_logs() {
  local service="${1:-}"
  local tail="${TAIL:-200}"

  if [ -z "${service}" ]; then
    die "Usage: logs <service> (example: logs nginx-proxy)"
  fi

  prod logs --tail="${tail}" "${service}"
}

cmd_start() {
  load_env_if_present
  prod up -d
}

cmd_stop() {
  prod down || true

  if [ -f "${COMPOSE_MON_FILE}" ]; then
    mon down || true
  fi
}

cmd_restart() {
  load_env_if_present
  prod up -d

  if [ -f "${COMPOSE_MON_FILE}" ]; then
    mon up -d || true
  fi
}

cmd_health() {
  # nginx is published on host 80/443
  print "== nginx (host) =="
  if command -v curl >/dev/null 2>&1; then
    curl -fsS http://localhost/health || true
  else
    wget -q -O- http://localhost/health || true
  fi

  # backend/frontend are internal-only; check from inside containers
  print
  print "== backend-api (container) =="
  prod exec -T backend-api sh -lc 'wget -q -O- http://localhost:4000/v1/health || curl -fsS http://localhost:4000/v1/health' || true

  print
  print "== frontend-web (container) =="
  prod exec -T frontend-web sh -lc 'wget -q -O- http://localhost:3000/ || curl -fsS http://localhost:3000/' || true
}

cmd_backup() {
  load_env_if_present
  bash scripts/backup-database.sh
}

cmd_help() {
  cat <<'EOF'
Rapid Roads - VPS manage

Commands:
  menu                Interactive menu (default if no args)
  status              Show docker compose status (prod + monitoring if present)
  health              Run basic health checks (nginx host + backend/frontend containers)
  logs <service>      Show logs for one service (set TAIL=200 to change)
  start               docker compose up -d (production)
  stop                docker compose down (production + monitoring)
  restart             up -d (production + monitoring)
  backup              Run scripts/backup-database.sh
  troubleshoot         Run basic diagnostics and print next steps

Examples:
  sudo bash scripts/vps-manage.sh
  sudo bash scripts/vps-manage.sh menu
  sudo bash scripts/vps-manage.sh status
  sudo TAIL=500 bash scripts/vps-manage.sh logs backend-api
EOF
}

warn_if_placeholder_env() {
  if [ ! -f ./.env.production ]; then
    color '33' "[troubleshoot] .env.production not found"
    return 0
  fi

  if grep -Eq 'ChangeMe_|secure_password_here|your_jwt_secret_here|your_refresh_secret_here' ./.env.production; then
    color '33' "[troubleshoot] .env.production contains placeholder secrets"
    print "[troubleshoot] Fix by editing .env.production, or run deploy with AUTO_GENERATE_SECRETS=true"
  fi
}

cmd_troubleshoot() {
  color '36' "== troubleshoot =="

  print "[info] repo: $(pwd)"
  print "[info] compose prod: ${COMPOSE_PROD_FILE}"
  print "[info] compose mon:  ${COMPOSE_MON_FILE}"
  print

  print "== versions =="
  docker --version || true
  docker compose version || true
  print

  warn_if_placeholder_env
  print

  print "== compose config check =="
  prod config -q && print "[ok] production compose config" || color '31' "[error] production compose config"
  if [ -f "${COMPOSE_MON_FILE}" ]; then
    mon config -q && print "[ok] monitoring compose config" || color '31' "[error] monitoring compose config"
  fi
  print

  print "== containers =="
  prod ps || true
  if [ -f "${COMPOSE_MON_FILE}" ]; then
    print
    mon ps || true
  fi
  print

  print "== ports (80/443) =="
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp | awk 'NR==1 || $4 ~ /:80$|:443$/' || true
  else
    print "ss not found (install iproute2)"
  fi
  print

  print "== firewall =="
  if command -v ufw >/dev/null 2>&1; then
    ufw status verbose || true
  else
    print "ufw not installed"
  fi
  print

  print "== quick health =="
  cmd_health || true

  print
  color '36' "Next steps:"
  print "- Check logs: sudo bash scripts/vps-manage.sh logs nginx-proxy (or backend-api/frontend-web)"
  print "- Restart stack: sudo bash scripts/vps-manage.sh restart"
  print "- If DNS not ready for TLS: run deploy with SKIP_LETSENCRYPT=true"
}

cmd_menu() {
  require_root
  require_tools

  cd "$(repo_root)"

  color '36' "Rapid Roads - Menu"
  print
  PS3="Select an option: "

  local opts=(
    "Status"
    "Health"
    "Start"
    "Stop"
    "Restart"
    "Logs (choose service)"
    "Troubleshoot"
    "Backup"
    "Quit"
  )

  select opt in "${opts[@]}"; do
    case "${opt}" in
      "Status") cmd_status ;;
      "Health") cmd_health ;;
      "Start") cmd_start ;;
      "Stop") cmd_stop ;;
      "Restart") cmd_restart ;;
      "Logs (choose service)")
        print "Enter service name (example: nginx-proxy, backend-api, frontend-web, postgres):"
        read -r service
        cmd_logs "${service}"
        ;;
      "Troubleshoot") cmd_troubleshoot ;;
      "Backup") cmd_backup ;;
      "Quit") break ;;
      *) print "Invalid selection" ;;
    esac
    print
  done
}

main() {
  local cmd="${1:-menu}"
  shift || true

  case "${cmd}" in
    menu) cmd_menu "$@" ;;
    status) cmd_status "$@" ;;
    health) cmd_health "$@" ;;
    logs) cmd_logs "$@" ;;
    start) cmd_start "$@" ;;
    stop) cmd_stop "$@" ;;
    restart) cmd_restart "$@" ;;
    backup) cmd_backup "$@" ;;
    troubleshoot) cmd_troubleshoot "$@" ;;
    help|-h|--help) cmd_help ;;
    *) die "Unknown command: ${cmd} (use: help)" ;;
  esac
}

main "$@"
