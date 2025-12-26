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

  print "[deploy] Running deploy script"
  bash scripts/deploy-rapidroads.sh
}

main "$@"
