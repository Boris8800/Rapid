#!/usr/bin/env bash
# Rapid Roads Taxi System - Production Deployment Script
# Domain: rapidroad.uk
# VPS IP: 5.249.164.40

set -euo pipefail

DOMAIN="${DOMAIN:-rapidroad.uk}"
EMAIL="${LETSENCRYPT_EMAIL:-admin@rapidroad.uk}"
START_MONITORING="${START_MONITORING:-false}"
AUTO_GENERATE_SECRETS="${AUTO_GENERATE_SECRETS:-false}"
SKIP_LETSENCRYPT="${SKIP_LETSENCRYPT:-false}"

print() { printf '%s\n' "$*"; }

is_interactive() {
  [ -t 0 ] && [ -t 1 ]
}

prompt_yes_no() {
  local prompt="$1"
  local default_yes="${2:-true}"

  if ! is_interactive; then
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
    printf '%s %s: ' "${prompt}" "${suffix}" >&2
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

env_has_placeholders() {
  local file="$1"
  grep -Eq 'ChangeMe_|secure_password_here|your_jwt_secret_here|your_refresh_secret_here' "${file}"
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    print "Run as root (sudo)." >&2
    exit 1
  fi
}

install_base_packages() {
  apt-get update
  apt-get install -y ca-certificates curl gnupg lsb-release ufw fail2ban unattended-upgrades openssl
}

ensure_env_kv() {
  local file="$1"
  local key="$2"
  local value="$3"

  if grep -qE "^${key}=" "${file}"; then
    # Escape sed replacement string
    local escaped
    escaped="$(printf '%s' "${value}" | sed 's/[\\&]/\\\\&/g')"
    sed -i "s|^${key}=.*$|${key}=${escaped}|" "${file}"
  else
    printf '\n%s=%s\n' "${key}" "${value}" >>"${file}"
  fi
}

autofill_env_secrets_if_requested() {
  local file="$1"

  if [ "${AUTO_GENERATE_SECRETS}" != "true" ]; then
    return
  fi

  if ! grep -Eq 'ChangeMe_|secure_password_here|your_jwt_secret_here|your_refresh_secret_here' "${file}"; then
    return
  fi

  print "[deploy] AUTO_GENERATE_SECRETS=true: generating secrets in .env.production"

  # Use hex to avoid special chars that could break .env parsing.
  ensure_env_kv "${file}" "POSTGRES_PASSWORD" "$(openssl rand -hex 32)"
  ensure_env_kv "${file}" "JWT_SECRET" "$(openssl rand -hex 64)"
  ensure_env_kv "${file}" "JWT_REFRESH_SECRET" "$(openssl rand -hex 64)"
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

  print "[deploy] Installing Docker Compose plugin"

  # Prefer distro package if available.
  apt-get update
  if apt-get install -y docker-compose-plugin >/dev/null 2>&1; then
    return
  fi

  # Fallback: install compose v2 as a Docker CLI plugin.
  # Uses GitHub release assets; keep this as a best-effort fallback.
  local arch
  arch="$(uname -m)"
  case "${arch}" in
    x86_64|amd64) arch="x86_64" ;;
    aarch64|arm64) arch="aarch64" ;;
    *)
      print "Unsupported architecture for compose fallback: ${arch}" >&2
      exit 1
      ;;
  esac

  local version plugin_dir
  version="v2.29.2"
  plugin_dir="/usr/local/lib/docker/cli-plugins"
  mkdir -p "${plugin_dir}"
  curl -fL "https://github.com/docker/compose/releases/download/${version}/docker-compose-linux-${arch}" -o "${plugin_dir}/docker-compose"
  chmod +x "${plugin_dir}/docker-compose"

  if ! docker compose version >/dev/null 2>&1; then
    print "Docker Compose installation failed" >&2
    exit 1
  fi
}

ensure_env_file() {
  if [ -f ./.env.production ]; then
    # Basic safety check for placeholder secrets
    autofill_env_secrets_if_requested ./.env.production

    if env_has_placeholders ./.env.production; then
      if [ "${AUTO_GENERATE_SECRETS}" = "true" ]; then
        # already attempted autofill, but keep going if it succeeded
        if env_has_placeholders ./.env.production; then
          print "[deploy] .env.production still contains placeholder values after AUTO_GENERATE_SECRETS=true." >&2
          print "[deploy] Edit .env.production and replace placeholders." >&2
          exit 1
        fi
        return
      fi

      print "[deploy] .env.production still contains placeholder values." >&2
      print "[deploy] This is normal on first deploy. We can auto-generate safe secrets now." >&2

      if prompt_yes_no "Auto-generate secrets now (recommended)?" true; then
        AUTO_GENERATE_SECRETS=true
        autofill_env_secrets_if_requested ./.env.production
      else
        print "[deploy] Opening .env.production for editing." >&2
        if ! open_editor_if_possible ./.env.production; then
          print "[deploy] No editor found (nano/vim). Edit the file manually: ./.env.production" >&2
        fi
      fi

      if env_has_placeholders ./.env.production; then
        print "[deploy] .env.production still contains placeholder values." >&2
        print "[deploy] Please replace them, then re-run deploy." >&2
        exit 1
      fi
    fi
    return
  fi

  if [ ! -f ./.env.production.example ]; then
    print "Missing .env.production and .env.production.example" >&2
    exit 1
  fi

  cp ./.env.production.example ./.env.production
  print "[deploy] Created .env.production from .env.production.example"
  print "[deploy] Next: set secrets (auto-generate recommended)"

  if prompt_yes_no "Auto-generate secrets in .env.production now?" true; then
    AUTO_GENERATE_SECRETS=true
    autofill_env_secrets_if_requested ./.env.production
  else
    print "[deploy] Opening .env.production for editing." >&2
    if ! open_editor_if_possible ./.env.production; then
      print "[deploy] No editor found (nano/vim). Edit the file manually: ./.env.production" >&2
    fi
  fi

  if env_has_placeholders ./.env.production; then
    print "[deploy] .env.production still contains placeholder values." >&2
    print "[deploy] Please replace them, then re-run deploy." >&2
    exit 1
  fi
}

enable_firewall() {
  # Safe defaults
  ufw default deny incoming
  ufw default allow outgoing

  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
}

enable_services() {
  if ! command -v systemctl >/dev/null 2>&1; then
    return
  fi

  # Ensure Docker starts on boot
  systemctl enable --now docker >/dev/null 2>&1 || true

  # Enable Fail2ban if installed
  if command -v fail2ban-client >/dev/null 2>&1; then
    systemctl enable --now fail2ban >/dev/null 2>&1 || true
  fi
}

configure_fail2ban() {
  if ! command -v fail2ban-client >/dev/null 2>&1; then
    return
  fi

  mkdir -p /etc/fail2ban/jail.d

  local jail_file
  jail_file="/etc/fail2ban/jail.d/rapidroads-sshd.conf"

  # Only write if not already present (don't clobber server-specific tuning)
  if [ ! -f "${jail_file}" ]; then
    cat >"${jail_file}" <<'EOF'
[sshd]
enabled = true
port = ssh
mode = normal
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
EOF
  fi

  if command -v systemctl >/dev/null 2>&1; then
    systemctl restart fail2ban >/dev/null 2>&1 || true
  fi
}

ensure_ssh_keys_present() {
  # Guardrail: don't disable password auth unless there's at least one public key installed.
  if [ -f /root/.ssh/authorized_keys ] && [ -s /root/.ssh/authorized_keys ]; then
    return
  fi
  if ls /home/*/.ssh/authorized_keys >/dev/null 2>&1; then
    # Any non-empty authorized_keys counts
    if awk 'BEGIN{found=0} { if (length($0)>0) found=1 } END{ exit(found?0:1) }' /home/*/.ssh/authorized_keys 2>/dev/null; then
      return
    fi
  fi
  return 1
}

harden_ssh() {
  if [ ! -f /etc/ssh/sshd_config ]; then
    return
  fi

  if ! ensure_ssh_keys_present; then
    print "[deploy] SSH hardening skipped: no authorized_keys found (would risk lockout)."
    print "[deploy] Add your SSH key first, then re-run this script to harden SSH."
    return
  fi

  mkdir -p /etc/ssh/sshd_config.d
  cat >/etc/ssh/sshd_config.d/99-rapidroads.conf <<'EOF'
# RapidRoads hardening (managed by scripts/deploy-rapidroads.sh)
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
EOF

  if command -v systemctl >/dev/null 2>&1; then
    systemctl reload ssh >/dev/null 2>&1 || systemctl restart ssh >/dev/null 2>&1 || true
  fi
}

enable_auto_updates() {
  dpkg-reconfigure -f noninteractive unattended-upgrades || true
}

main() {
  require_root

  print "== Rapid Roads Production Deploy =="
  print "Domain: ${DOMAIN}"
  print "Email:  ${EMAIL}"
  print "Auto-generate secrets: ${AUTO_GENERATE_SECRETS}"
  print "Skip Let's Encrypt:     ${SKIP_LETSENCRYPT}"

  install_base_packages
  install_docker
  install_docker_compose
  enable_firewall
  enable_auto_updates
  enable_services
  configure_fail2ban
  harden_ssh

  echo "[deploy] making scripts executable"
  chmod +x scripts/*.sh || true

  echo "[deploy] installing daily backup cron (template)"
  if [ -f backups/schedule/cron.d.rapidroads-backup.example ]; then
    install -m 0644 backups/schedule/cron.d.rapidroads-backup.example /etc/cron.d/rapidroads-backup
  fi

  ensure_env_file

    # Docker Compose variable interpolation reads from the shell environment (and optional .env).
    # Our canonical file is .env.production, so export its values for this script run.
    set -a
    # shellcheck disable=SC1091
    . ./.env.production
    set +a

  # Run the stack (DB/Redis first)
  docker compose -f docker-compose.production.yml up -d postgres redis

  # Bootstrap SSL
  export LETSENCRYPT_EMAIL="${EMAIL}"
  if [ "${SKIP_LETSENCRYPT}" = "true" ]; then
    export SKIP_LETSENCRYPT="true"
  fi
  bash scripts/setup-ssl.sh

  # Start remaining services
  docker compose -f docker-compose.production.yml up -d

  if [ "${START_MONITORING}" = "true" ]; then
    print "[deploy] Starting monitoring stack"
    docker compose -f docker-compose.monitoring.yml up -d
  fi

  print "Deployment complete. URLs:"
  local domain_root
  domain_root="${DOMAIN_ROOT:-${DOMAIN}}"
  print "- https://${domain_root}"
  print "- https://driver.${domain_root}"
  print "- https://admin.${domain_root}"
  print "- https://api.${domain_root}"
}

main "$@"
