#!/usr/bin/env bash
# Rapid Roads - Update repo from GitHub and deploy
# - Prevents "git pull" from failing due to local changes on the server
# - By default, stashes local changes and syncs to origin/main
#
# Usage:
#   sudo bash scripts/update-and-deploy.sh
#
# Options:
#   AUTO_STASH=true|false   (default: true)
#   FORCE_RESET=true|false  (default: false)  # discards local changes instead of stashing
#
# You can also pass deploy flags through env vars, e.g.:
#   sudo SKIP_LETSENCRYPT=true AUTO_GENERATE_SECRETS=true bash scripts/update-and-deploy.sh

set -euo pipefail

AUTO_STASH="${AUTO_STASH:-true}"
FORCE_RESET="${FORCE_RESET:-false}"
AUTO_DNS_CHECK="${AUTO_DNS_CHECK:-true}"

print() { printf '%s\n' "$*"; }

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    print "Run as root (sudo)." >&2
    exit 1
  fi
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    print "Missing required command: $cmd" >&2
    exit 1
  fi
}

resolve_ipv4() {
  local host="$1"

  if command -v dig >/dev/null 2>&1; then
    dig +short "${host}" A | head -n 1
    return 0
  fi

  if command -v getent >/dev/null 2>&1; then
    # getent is available on most Ubuntu installs and does not require extra packages.
    getent ahostsv4 "${host}" 2>/dev/null | awk 'NR==1{print $1}'
    return 0
  fi

  if command -v nslookup >/dev/null 2>&1; then
    nslookup "${host}" 2>/dev/null | awk '/^Address: /{print $2}' | head -n 1
    return 0
  fi

  return 1
}

detect_public_ip() {
  # Best-effort: only used when VPS_IP isn't provided.
  if command -v curl >/dev/null 2>&1; then
    curl -fsS https://api.ipify.org || true
  fi
}

auto_set_skip_letsencrypt() {
  # Respect explicit user choice
  if [ -n "${SKIP_LETSENCRYPT+x}" ]; then
    return
  fi

  if [ "${AUTO_DNS_CHECK}" != "true" ]; then
    return
  fi

  if [ ! -f ./.env.production ]; then
    print "[dns] .env.production not found; defaulting SKIP_LETSENCRYPT=true"
    export SKIP_LETSENCRYPT=true
    return
  fi

  set -a
  # shellcheck disable=SC1091
  . ./.env.production
  set +a

  local domain_root
  domain_root="${DOMAIN_ROOT:-${DOMAIN:-rapidroad.uk}}"

  local expected_ip
  expected_ip="${VPS_IP:-}"
  if [ -z "${expected_ip}" ]; then
    expected_ip="$(detect_public_ip)"
  fi

  if [ -z "${expected_ip}" ]; then
    print "[dns] Could not determine server public IP (set VPS_IP in .env.production)."
    print "[dns] Defaulting SKIP_LETSENCRYPT=true"
    export SKIP_LETSENCRYPT=true
    return
  fi

  local domains=(
    "${domain_root}"
    "www.${domain_root}"
    "api.${domain_root}"
    "driver.${domain_root}"
    "admin.${domain_root}"
  )

  local ok=true
  local d resolved
  for d in "${domains[@]}"; do
    resolved="$(resolve_ipv4 "${d}" || true)"
    if [ -z "${resolved}" ] || [ "${resolved}" != "${expected_ip}" ]; then
      ok=false
      print "[dns] ${d} -> ${resolved:-<no A record>} (expected ${expected_ip})"
    fi
  done

  if [ "${ok}" = true ]; then
    print "[dns] DNS matches server IP (${expected_ip}). Using Let's Encrypt."
    export SKIP_LETSENCRYPT=false
  else
    print "[dns] DNS not ready. Using dummy certs (SKIP_LETSENCRYPT=true)."
    print "[dns] Re-run once DNS points to ${expected_ip} to request real certs."
    export SKIP_LETSENCRYPT=true
  fi
}

repo_root() {
  # scripts/update-and-deploy.sh -> repo root
  cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P
}

ensure_on_main() {
  if git show-ref --verify --quiet refs/heads/main; then
    git checkout -q main
  else
    # Create local main from origin/main if possible
    if git show-ref --verify --quiet refs/remotes/origin/main; then
      git checkout -q -b main origin/main
    else
      git checkout -q -b main
    fi
  fi
}

sync_to_origin_main() {
  git fetch -q origin

  if ! git show-ref --verify --quiet refs/remotes/origin/main; then
    print "origin/main not found. Check your remote: git remote -v" >&2
    exit 1
  fi

  ensure_on_main

  if ! git diff-index --quiet HEAD --; then
    if [ "${FORCE_RESET}" = "true" ]; then
      print "[update] FORCE_RESET=true: discarding local changes"
      git reset --hard -q
      git clean -fd -q
    elif [ "${AUTO_STASH}" = "true" ]; then
      print "[update] Stashing local changes"
      git stash push -u -m "server-local-changes-$(date -u +%Y%m%dT%H%M%SZ)" >/dev/null
    else
      print "[update] Working tree is dirty; set AUTO_STASH=true or FORCE_RESET=true" >&2
      git status --porcelain
      exit 1
    fi
  fi

  # Deploy should match GitHub exactly; avoid merges.
  git reset --hard -q origin/main
}

main() {
  require_root
  require_cmd git

  local root
  root="$(repo_root)"
  cd "${root}"

  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    print "Not a git repository: ${root}" >&2
    exit 1
  fi

  print "[update] Syncing to origin/main"
  sync_to_origin_main

  auto_set_skip_letsencrypt

  print "[deploy] Running deploy script"
  bash scripts/deploy-rapidroads.sh
}

main "$@"
