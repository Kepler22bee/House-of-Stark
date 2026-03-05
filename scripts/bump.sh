#!/usr/bin/env bash
set -euo pipefail

# Bump all tools in contracts/.tool-versions to their latest stable versions.
# Usage: ./scripts/bump-versions.sh [--dry-run]

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TOOL_VERSIONS="$ROOT_DIR/contracts/.tool-versions"
DRY_RUN=false

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

if ! command -v asdf &>/dev/null; then
  echo "error: asdf not found" >&2
  exit 1
fi

latest_stable() {
  local tool="$1"
  # Get all versions, filter out RCs/alphas/betas and prefixed formats, take the last (latest)
  asdf list all "$tool" 2>/dev/null \
    | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' \
    | tail -1
}

while IFS=' ' read -r tool current; do
  [[ -z "$tool" || "$tool" == \#* ]] && continue
  latest="$(latest_stable "$tool")"
  if [[ -z "$latest" ]]; then
    echo "skip: $tool (could not determine latest version)"
    continue
  fi
  if [[ "$current" == "$latest" ]]; then
    echo "ok:   $tool $current (already latest)"
  else
    echo "bump: $tool $current -> $latest"
    if ! $DRY_RUN; then
      sed -i '' "s/^${tool} .*/${tool} ${latest}/" "$TOOL_VERSIONS"
    fi
  fi
done < "$TOOL_VERSIONS"

if $DRY_RUN; then
  echo ""
  echo "(dry run — no changes written)"
fi
