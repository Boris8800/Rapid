#!/usr/bin/env bash
# Rapid Roads - Fresh VPS deploy from scratch (Ubuntu/Debian)
#
# What it does:
# - Installs minimal prerequisites (git, curl, ca-certificates)
# - Clones (or updates) the repo into /opt/rapidroads-production
# - Ensures .env.production exists (copies from .env.production.example if needed)
# - Optionally writes VPS_IP into .env.production
# - Runs scripts/update-and-deploy.sh (which handles DNS auto-check + deploy)
#
# Usage:
#   sudo bash scripts/vps-deploy-fresh.sh [VPS_IP]
#
# Optional env vars:
#   INSTALL_DIR=/opt/rapidroads-production
#   REPO_URL=https://github.com/Boris8800/Rapid.git
#   BRANCH=main
#
# Deploy flags passed through to the deploy scripts:
#   AUTO_GENERATE_SECRETS=true|false
#   SKIP_LETSENCRYPT=true|false
#   START_MONITORING=true|false

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/rapidroads-production}"
REPO_URL="${REPO_URL:-https://github.com/Boris8800/Rapid.git}"
BRANCH="${BRANCH:-main}"
DEPLOY_USER="${DEPLOY_USER:-}"
RECREATE_DEPLOY_USER="${RECREATE_DEPLOY_USER:-false}"

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

confirm_by_typing() {
  local expected="$1"
  local message="$2"

  if ! is_interactive; then
    return 1
  fi

  print "${message}" >&2
  print "Type '${expected}' to continue:" >&2
  local value
  read -r value || true
  [ "${value}" = "${expected}" ]
}

ensure_linux_user() {
  local username="$1"

  if [ -z "${username}" ]; then
    die "DEPLOY_USER is empty"
  fi
  if [ "${username}" = "root" ]; then
    die "Refusing to manage root user"
  fi

  if id -u "${username}" >/dev/null 2>&1; then
    return 0
  fi

  print "[fresh] Creating user: ${username}"
  if command -v adduser >/dev/null 2>&1; then
    adduser --disabled-password --gecos "" "${username}"
  else
    useradd -m -s /bin/bash "${username}"
  fi

  if getent group sudo >/dev/null 2>&1; then
    usermod -aG sudo "${username}" || true
  fi
}

maybe_delete_and_recreate_user() {
  local username="$1"

  if [ "${RECREATE_DEPLOY_USER}" != "true" ]; then
    ensure_linux_user "${username}"
    return 0
  fi

  if ! id -u "${username}" >/dev/null 2>&1; then
    ensure_linux_user "${username}"
    return 0
  fi

  print
  print "[fresh] DANGEROUS: delete + recreate user '${username}'"
  print "[fresh] This removes /home/${username} and all files owned by that user."
  if ! confirm_by_typing "DELETE ${username}" "[fresh] Confirm user deletion"; then
    print "[fresh] Cancelled. Keeping existing user '${username}'."
    return 0
  fi

  pkill -u "${username}" >/dev/null 2>&1 || true
  userdel -r "${username}" >/dev/null 2>&1 || userdel "${username}" || true
  ensure_linux_user "${username}"
}

install_prereqs() {
  if ! command -v apt-get >/dev/null 2>&1; then
    die "apt-get not found (this script supports Ubuntu/Debian)."
  fi

  print "[fresh] Installing prerequisites"
  apt-get update
  apt-get install -y ca-certificates curl git
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

clone_or_update_repo() {
  mkdir -p "$(dirname "${INSTALL_DIR}")"

  if [ -d "${INSTALL_DIR}/.git" ]; then
    print "[fresh] Repo already exists at ${INSTALL_DIR}; updating"
    cd "${INSTALL_DIR}"
    git fetch -q origin
    if git show-ref --verify --quiet "refs/remotes/origin/${BRANCH}"; then
      git checkout -q "${BRANCH}" || git checkout -q -b "${BRANCH}" "origin/${BRANCH}"
      git reset --hard -q "origin/${BRANCH}"
    else
      git checkout -q "${BRANCH}" || true
    fi
    return
  fi

  print "[fresh] Cloning ${REPO_URL} -> ${INSTALL_DIR}"
  git clone "${REPO_URL}" "${INSTALL_DIR}"
  cd "${INSTALL_DIR}"

  if [ "${BRANCH}" != "main" ]; then
    git checkout -q "${BRANCH}"
  fi
}

ensure_env_file() {
  if [ -f ./.env.production ]; then
    return
  fi

  if [ ! -f ./.env.production.example ]; then
    die "Missing .env.production.example in repo."
  fi

  cp ./.env.production.example ./.env.production
  print "[fresh] Created .env.production from .env.production.example"
}

main() {
  require_root
  install_prereqs

  require_cmd git
  require_cmd curl

  local vps_ip="${1:-}"
  if [ -n "${vps_ip}" ]; then
    if ! [[ "${vps_ip}" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
      die "Invalid VPS_IP: ${vps_ip}"
    fi
  fi

  if [ -z "${DEPLOY_USER}" ] && is_interactive; then
    DEPLOY_USER="$(prompt "Deploy username (optional; blank to skip)" "taxi")"
    # allow skipping by entering empty
    if [ "${DEPLOY_USER}" = "taxi" ]; then
      :
    fi
  fi

  if [ -n "${DEPLOY_USER}" ]; then
    maybe_delete_and_recreate_user "${DEPLOY_USER}"
  fi

  clone_or_update_repo
  ensure_env_file

  if [ -n "${DEPLOY_USER}" ]; then
    print "[fresh] Setting repo ownership to ${DEPLOY_USER}"
    chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${INSTALL_DIR}" || true
  fi

  if [ -n "${vps_ip}" ]; then
    print "[fresh] Writing VPS_IP=${vps_ip} into .env.production"
    ensure_env_kv ./.env.production VPS_IP "${vps_ip}"
  fi

  chmod +x scripts/*.sh || true

  print "[fresh] Running update + deploy"
  # This script:
  # - syncs to origin/main
  # - optionally auto-toggles SKIP_LETSENCRYPT based on DNS readiness
  # - runs scripts/deploy-rapidroads.sh
  bash scripts/update-and-deploy.sh

  print "[fresh] Done"
}

main "$@"
