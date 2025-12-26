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

  clone_or_update_repo
  ensure_env_file

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
