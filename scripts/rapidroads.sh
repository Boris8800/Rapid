#!/usr/bin/env bash
# Rapid Roads - Main menu (non-technical friendly)
# Run on the VPS from the repo root:
#   sudo bash scripts/rapidroads.sh

set -euo pipefail

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

require_repo_root() {
  if [ ! -f ./docker-compose.production.yml ] || [ ! -d ./scripts ]; then
    die "Run this from the repo root (example: /opt/rapidroads-production)."
  fi
}

require_cmd() {
  local cmd="$1"
  command -v "${cmd}" >/dev/null 2>&1 || die "Missing required command: ${cmd}"
}

is_interactive() {
  [ -t 0 ] && [ -t 1 ]
}

prompt() {
  local label="$1"
  local default_value="${2:-}"

  if ! is_interactive; then
    printf '%s' "${default_value}"
    return 0
  fi

  if [ -n "${default_value}" ]; then
    printf '%s [%s]: ' "${label}" "${default_value}" >&2
  else
    printf '%s: ' "${label}" >&2
  fi

  local value
  read -r value || true
  value="${value:-}"

  if [ -z "${value}" ]; then
    printf '%s' "${default_value}"
  else
    printf '%s' "${value}"
  fi
}

prompt_yes_no() {
  local question="$1"
  local default_yes="${2:-true}"

  if ! is_interactive; then
    [ "${default_yes}" = "true" ] && return 0
    return 1
  fi

  local suffix
  if [ "${default_yes}" = "true" ]; then
    suffix="[Y/n]"
  else
    suffix="[y/N]"
  fi

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

pause() {
  if ! is_interactive; then
    return 0
  fi
  print
  read -r -p "Press Enter to continue..." _ || true
}

open_editor_if_possible() {
  local file="$1"

  if ! is_interactive; then
    return 1
  fi

  if command -v nano >/dev/null 2>&1; then
    nano "${file}"
    return 0
  fi

  if command -v vim >/dev/null 2>&1; then
    vim "${file}"
    return 0
  fi

  if command -v vi >/dev/null 2>&1; then
    vi "${file}"
    return 0
  fi

  return 1
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

mask_value() {
  local v="${1:-}"
  if [ -z "${v}" ]; then
    printf '%s' "<not set>"
    return 0
  fi
  # Avoid leaking full secrets on-screen.
  local n=${#v}
  if [ "${n}" -le 8 ]; then
    printf '%s' "<set>"
    return 0
  fi
  printf '%s' "****${v: -4}"
}

print_service_links() {
  load_env_if_present
  local domain_root
  domain_root="${DOMAIN_ROOT:-${DOMAIN:-rapidroad.uk}}"

  print "Web / service links"
  print "- Customer: https://${domain_root}"
  print "- Driver:   https://driver.${domain_root}"
  print "- Admin:    https://admin.${domain_root}"
  print "- API:      https://api.${domain_root}"
  print
  print "On-server status"
  print "- Menu: sudo bash scripts/rapidroads.sh"
  print "- Status: sudo bash scripts/vps-manage.sh status"
  print "- Health: sudo bash scripts/vps-manage.sh health"
}

cmd_preflight_checks() {
  print "Preflight checks"
  print "- These checks help avoid deploy failures."
  print

  require_cmd git

  if ! command -v docker >/dev/null 2>&1; then
    print "- Docker: NOT installed yet (deploy will install it)"
  else
    print "- Docker: OK ($(docker --version 2>/dev/null || true))"
  fi

  if docker compose version >/dev/null 2>&1; then
    print "- Docker Compose: OK"
  else
    print "- Docker Compose: NOT installed yet (deploy will install it)"
  fi

  if [ -f ./.env.production ]; then
    print "- .env.production: present"
  else
    print "- .env.production: missing (wizard/deploy will create it)"
  fi

  print
  print "Compose config (syntax)"
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    docker compose -f docker-compose.production.yml config -q && print "- production: OK" || print "- production: ERROR"
    if [ -f docker-compose.monitoring.yml ]; then
      docker compose -f docker-compose.monitoring.yml config -q && print "- monitoring: OK" || print "- monitoring: ERROR"
    fi
  else
    print "- skipped (docker/compose not installed yet)"
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

detect_public_ip() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS https://api.ipify.org || true
  fi
}

print_current_config() {
  load_env_if_present
  local domain_root
  domain_root="${DOMAIN_ROOT:-${DOMAIN:-<not set>}}"

  print "Current config"
  print "- Repo: $(pwd)"
  print "- Domain root: ${domain_root}"
  if [ -f ./.env.production ]; then
    print "- .env.production: present"
  else
    print "- .env.production: MISSING"
  fi
}

run_integrations_menu() {
  while true; do
    print
    print "Integrations (API keys)"
    print "- Add/change API keys without editing files manually."
    print "- Values are masked on screen."
    print

    if [ ! -f ./.env.production ]; then
      print ".env.production not found. Creating from example."
      cp ./.env.production.example ./.env.production
    fi

    load_env_if_present

    print "Current values (masked):"
    print "1) Gemini (AI concierge):        $(mask_value "${GEMINI_API_KEY:-}")"
    print "2) Stripe (payments):            $(mask_value "${STRIPE_SECRET_KEY:-}")"
    print "3) Stripe webhook secret:        $(mask_value "${STRIPE_WEBHOOK_SECRET:-}")"
    print "4) Twilio (SMS) Account SID:     $(mask_value "${TWILIO_ACCOUNT_SID:-}")"
    print "5) Twilio (SMS) Auth Token:      $(mask_value "${TWILIO_AUTH_TOKEN:-}")"
    print "6) Twilio (SMS) From number:     ${TWILIO_FROM:-<not set>}"
    print "7) SMTP host:                    ${SMTP_HOST:-<not set>}"
    print "8) SMTP user:                    ${SMTP_USER:-<not set>}"
    print "9) SMTP pass:                    $(mask_value "${SMTP_PASS:-}")"
    print "10) Google Maps API key (opt):   $(mask_value "${GOOGLE_MAPS_API_KEY:-}")"
    print
    print "11) Open full .env.production"
    print "12) Back"
    print

    local choice
    choice="$(prompt "Choose" "1")"

    case "${choice}" in
      1)
        local v
        v="$(prompt "Enter GEMINI_API_KEY (blank to clear)" "")"
        ensure_env_kv ./.env.production GEMINI_API_KEY "${v}"
        ;;
      2)
        local v
        v="$(prompt "Enter STRIPE_SECRET_KEY (blank to clear)" "")"
        ensure_env_kv ./.env.production STRIPE_SECRET_KEY "${v}"
        ;;
      3)
        local v
        v="$(prompt "Enter STRIPE_WEBHOOK_SECRET (blank to clear)" "")"
        ensure_env_kv ./.env.production STRIPE_WEBHOOK_SECRET "${v}"
        ;;
      4)
        local v
        v="$(prompt "Enter TWILIO_ACCOUNT_SID (blank to clear)" "")"
        ensure_env_kv ./.env.production TWILIO_ACCOUNT_SID "${v}"
        ;;
      5)
        local v
        v="$(prompt "Enter TWILIO_AUTH_TOKEN (blank to clear)" "")"
        ensure_env_kv ./.env.production TWILIO_AUTH_TOKEN "${v}"
        ;;
      6)
        local v
        v="$(prompt "Enter TWILIO_FROM (example: +15551234567)" "")"
        ensure_env_kv ./.env.production TWILIO_FROM "${v}"
        ;;
      7)
        local v
        v="$(prompt "Enter SMTP_HOST" "")"
        ensure_env_kv ./.env.production SMTP_HOST "${v}"
        ;;
      8)
        local v
        v="$(prompt "Enter SMTP_USER" "")"
        ensure_env_kv ./.env.production SMTP_USER "${v}"
        ;;
      9)
        local v
        v="$(prompt "Enter SMTP_PASS (blank to clear)" "")"
        ensure_env_kv ./.env.production SMTP_PASS "${v}"
        ;;
      10)
        local v
        v="$(prompt "Enter GOOGLE_MAPS_API_KEY (blank to clear)" "")"
        ensure_env_kv ./.env.production GOOGLE_MAPS_API_KEY "${v}"
        ;;
      11)
        if ! open_editor_if_possible ./.env.production; then
          print "No editor found (nano/vim). Edit manually: $(pwd)/.env.production"
        fi
        ;;
      12) break ;;
      *) print "Invalid option" ;;
    esac
  done
}

run_help_menu() {
  print
  print "Help / quick guide"
  print
  print "Common tasks"
  print "- First install: choose '0) First-time setup wizard'"
  print "- Update code: choose '2) Update from GitHub + redeploy'"
  print "- Start/stop: choose '3) App management'"
  print "- Fix SSL: choose '4) SSL / HTTPS'"
  print "- Add API keys: choose '11) Integrations (API keys)'"
  print

  print "Links (documentation)"
  print "- Docker Compose: https://docs.docker.com/compose/"
  print "- Let's Encrypt:  https://letsencrypt.org/getting-started/"
  print "- UFW firewall:   https://help.ubuntu.com/community/UFW"
  print

  print_service_links
  pause
}

run_deploy_guided() {
  print
  print "First-time deploy (guided)"
  print "- This will install Docker, set firewall, and start the app."
  print "- It will ask/auto-generate secrets if needed."
  print

  local domain_root email
  domain_root="$(prompt "Domain (root)" "rapidroad.uk")"
  email="$(prompt "Let's Encrypt email" "admin@${domain_root}")"

  local dns_ready=false
  if prompt_yes_no "Is DNS already pointing to this server (A records ready)?" false; then
    dns_ready=true
  fi

  local start_monitoring=false
  if prompt_yes_no "Start monitoring stack too (Grafana/Prometheus/Loki)?" false; then
    start_monitoring=true
  fi

  local auto_secrets=true
  if ! prompt_yes_no "Auto-generate secrets in .env.production (recommended)?" true; then
    auto_secrets=false
  fi

  # If DNS is not ready, skip Let's Encrypt so the deploy does not fail.
  local skip_le=false
  if [ "${dns_ready}" != "true" ]; then
    skip_le=true
  fi

  print
  print "Running deploy now..."

  DOMAIN="${domain_root}" \
  DOMAIN_ROOT="${domain_root}" \
  LETSENCRYPT_EMAIL="${email}" \
  SKIP_LETSENCRYPT="${skip_le}" \
  START_MONITORING="${start_monitoring}" \
  AUTO_GENERATE_SECRETS="${auto_secrets}" \
    bash scripts/deploy-rapidroads.sh
}

run_update_guided() {
  print
  print "Update from GitHub + redeploy"
  print "- Pulls latest code and redeploys safely."
  print

  local dns_ready=false
  if prompt_yes_no "Is DNS already pointing to this server (A records ready)?" false; then
    dns_ready=true
  fi

  local skip_le=false
  if [ "${dns_ready}" != "true" ]; then
    skip_le=true
  fi

  SKIP_LETSENCRYPT="${skip_le}" bash scripts/update-and-deploy.sh
  print
  print "Running quick health check..."
  bash scripts/vps-manage.sh health || true
  pause
}

run_first_time_wizard() {
  print
  print "First-time setup wizard (recommended)"
  print "- Asks a few questions"
  print "- Writes safe defaults into .env.production"
  print "- Deploys and runs a health check"
  print

  local domain_root email
  domain_root="$(prompt "Domain root (example: example.com)" "rapidroad.uk")"
  email="$(prompt "Let's Encrypt email" "admin@${domain_root}")"

  local dns_ready=false
  if prompt_yes_no "Is DNS already pointing to this server (A records ready)?" false; then
    dns_ready=true
  fi

  local start_monitoring=false
  if prompt_yes_no "Enable monitoring (Grafana/Prometheus/Loki)?" false; then
    start_monitoring=true
  fi

  local auto_secrets=true
  if ! prompt_yes_no "Auto-generate secrets (recommended)?" true; then
    auto_secrets=false
  fi

  local gemini_key
  gemini_key="$(prompt "Gemini API key (optional, enables AI concierge)" "")"

  if [ ! -f ./.env.production ]; then
    print ".env.production not found; creating from example."
    cp ./.env.production.example ./.env.production
  fi

  print
  print "Writing domain settings into .env.production..."
  ensure_env_kv ./.env.production DOMAIN_ROOT "${domain_root}"
  ensure_env_kv ./.env.production NEXT_PUBLIC_API_URL "https://api.${domain_root}"
  ensure_env_kv ./.env.production CORS_ORIGINS "https://${domain_root},https://driver.${domain_root},https://admin.${domain_root}"

  local detected_ip
  detected_ip="$(detect_public_ip)"
  if [ -n "${detected_ip}" ]; then
    if prompt_yes_no "Set VPS_IP=${detected_ip} in .env.production (helps DNS checks)?" true; then
      ensure_env_kv ./.env.production VPS_IP "${detected_ip}"
    fi
  fi

  if [ -n "${gemini_key}" ]; then
    ensure_env_kv ./.env.production GEMINI_API_KEY "${gemini_key}"
  fi

  print
  if prompt_yes_no "Open .env.production to review/edit now?" false; then
    if ! open_editor_if_possible ./.env.production; then
      print "No editor found (nano/vim). Edit manually: $(pwd)/.env.production"
    fi
  fi

  local skip_le=false
  if [ "${dns_ready}" != "true" ]; then
    skip_le=true
  fi

  print
  print "Deploying now..."
  DOMAIN="${domain_root}" \
  DOMAIN_ROOT="${domain_root}" \
  LETSENCRYPT_EMAIL="${email}" \
  SKIP_LETSENCRYPT="${skip_le}" \
  START_MONITORING="${start_monitoring}" \
  AUTO_GENERATE_SECRETS="${auto_secrets}" \
    bash scripts/deploy-rapidroads.sh

  print
  print "Health check..."
  bash scripts/vps-manage.sh health || true
  pause
}

run_ssl_menu() {
  while true; do
    print
    print "SSL / HTTPS menu"
    print "- Use this after DNS points to your server to get real Let's Encrypt certs."
    print
    print "1) Setup/renew SSL (auto: ask about DNS)"
    print "2) Setup SSL (skip Let's Encrypt / dummy certs)"
    print "3) Setup SSL (request real Let's Encrypt certs)"
    print "4) Back"
    print

    local choice
    choice="$(prompt "Choose" "1")"
    case "${choice}" in
      1)
        local dns_ready=false
        if prompt_yes_no "Is DNS pointing to this server (A records ready)?" false; then
          dns_ready=true
        fi
        local skip_le=false
        if [ "${dns_ready}" != "true" ]; then
          skip_le=true
        fi
        SKIP_LETSENCRYPT="${skip_le}" bash scripts/setup-ssl.sh
        pause
        ;;
      2)
        SKIP_LETSENCRYPT=true bash scripts/setup-ssl.sh
        pause
        ;;
      3)
        SKIP_LETSENCRYPT=false bash scripts/setup-ssl.sh
        pause
        ;;
      4) break ;;
      *) print "Invalid option" ;;
    esac
  done
}

run_database_menu() {
  while true; do
    print
    print "Database menu"
    print "- Backup and restore tools."
    print
    print "1) Backup database"
    print "2) Restore database"
    print "3) Back"
    print

    local choice
    choice="$(prompt "Choose" "1")"
    case "${choice}" in
      1)
        print "Running database backup..."
        bash scripts/backup-database.sh
        pause
        ;;
      2)
        if prompt_yes_no "Restore will overwrite your database. Continue?" false; then
          bash scripts/restore-database.sh
        else
          print "Cancelled."
        fi
        pause
        ;;
      3) break ;;
      *) print "Invalid option" ;;
    esac
  done
}

run_monitoring_menu() {
  while true; do
    print
    print "Monitoring menu"
    print "- Starts/stops Prometheus + Grafana + Loki stack (if configured)."
    print
    print "1) Start monitoring"
    print "2) Stop monitoring"
    print "3) Monitoring status"
    print "4) Back"
    print

    local choice
    choice="$(prompt "Choose" "1")"
    case "${choice}" in
      1)
        print "Starting monitoring stack..."
        docker compose -f docker-compose.monitoring.yml up -d
        pause
        ;;
      2)
        print "Stopping monitoring stack..."
        docker compose -f docker-compose.monitoring.yml down || true
        pause
        ;;
      3)
        docker compose -f docker-compose.monitoring.yml ps || true
        print
        print "Tip: Grafana is typically not exposed publicly by default."
        pause
        ;;
      4) break ;;
      *) print "Invalid option" ;;
    esac
  done
}

run_manage_menu() {
  while true; do
    print
    print "App management menu"
    print "- Start/stop/restart the app and view logs/health."
    print
    print "1) Status"
    print "2) Health check"
    print "3) Start app"
    print "4) Stop app"
    print "5) Restart app"
    print "6) Logs (choose service)"
    print "7) Back"
    print

    local choice
    choice="$(prompt "Choose" "1")"
    case "${choice}" in
      1) bash scripts/vps-manage.sh status; pause ;;
      2) bash scripts/vps-manage.sh health; pause ;;
      3) bash scripts/vps-manage.sh start; pause ;;
      4) bash scripts/vps-manage.sh stop; pause ;;
      5) bash scripts/vps-manage.sh restart; pause ;;
      6)
        print "Enter service name (example: nginx-proxy, backend-api, frontend-web, postgres, redis)"
        local service
        read -r service || true
        bash scripts/vps-manage.sh logs "${service}"
        pause
        ;;
      7) break ;;
      *) print "Invalid option" ;;
    esac
  done
}

run_system_menu() {
  while true; do
    print
    print "System / security menu"
    print "- Useful maintenance commands."
    print
    print "1) Show server info"
    print "2) Update system packages"
    print "3) Firewall status (UFW)"
    print "4) Back"
    print

    local choice
    choice="$(prompt "Choose" "1")"
    case "${choice}" in
      1)
        print "== server =="
        uname -a || true
        print
        print "== disk =="
        df -h || true
        print
        print "== memory =="
        free -h || true
        pause
        ;;
      2)
        print "Running update-system.sh..."
        bash scripts/update-system.sh
        pause
        ;;
      3)
        if command -v ufw >/dev/null 2>&1; then
          ufw status verbose || true
        else
          print "ufw not installed"
        fi
        pause
        ;;
      4) break ;;
      *) print "Invalid option" ;;
    esac
  done
}

run_env_menu() {
  while true; do
    print
    print ".env.production menu"
    print "- Your secrets and domain settings live here."
    print
    print "1) Show current domain settings"
    print "2) Edit .env.production"
    print "3) Back"
    print

    local choice
    choice="$(prompt "Choose" "1")"
    case "${choice}" in
      1)
        load_env_if_present
        print "DOMAIN_ROOT=${DOMAIN_ROOT:-}" 
        print "DOMAIN=${DOMAIN:-}" 
        print "LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL:-}" 
        print "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-}" 
        pause
        ;;
      2)
        if [ ! -f ./.env.production ]; then
          print ".env.production not found. Creating from example."
          cp ./.env.production.example ./.env.production
        fi
        if ! open_editor_if_possible ./.env.production; then
          print "No editor found (nano/vim). Edit manually: $(pwd)/.env.production"
        fi
        pause
        ;;
      3) break ;;
      *) print "Invalid option" ;;
    esac
  done
}

run_menu() {
  require_root
  cd "$(repo_root)"
  require_repo_root

  while true; do
    print
    print "Rapid Roads - Main Menu"
    print_current_config
    print
    print "0) First-time setup wizard (recommended)"
    print "1) First-time deploy (guided)"
    print "2) Update from GitHub + redeploy"
    print "3) App management (start/stop/status/logs/health)"
    print "4) SSL / HTTPS (Let's Encrypt)"
    print "5) Database (backup/restore)"
    print "6) Monitoring (Grafana/Prometheus/Loki)"
    print "7) System / security (updates, firewall)"
    print "8) .env.production (view/edit)"
    print "9) Troubleshoot (guided checks)"
    print "10) Preflight checks"
    print "11) Integrations (API keys)"
    print "12) Help"
    print "13) Quit"
    print

    local choice
    choice="$(prompt "Choose" "1")"

    case "${choice}" in
      0) run_first_time_wizard ;;
      1) run_deploy_guided ;;
      2) run_update_guided ;;
      3) run_manage_menu ;;
      4) run_ssl_menu ;;
      5) run_database_menu ;;
      6) run_monitoring_menu ;;
      7) run_system_menu ;;
      8) run_env_menu ;;
      9) bash scripts/vps-manage.sh troubleshoot; pause ;;
      10) cmd_preflight_checks; pause ;;
      11) run_integrations_menu ;;
      12) run_help_menu ;;
      13) break ;;
      *) print "Invalid option" ;;
    esac
  done
}

main() {
  run_menu
}

main "$@"
