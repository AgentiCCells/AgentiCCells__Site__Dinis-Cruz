#!/usr/bin/env bash
# Run the signature check as it is in the BASE commit, so a push cannot change the check that judges it.
# Usage: scripts/run-check-signatures.sh <base> <after>
# If the base has no checker yet (only the push that first adds it), the copy in <after> runs, and it says so.
set -euo pipefail
cd "$(dirname "$0")/.."
base="${1:-}"; after="${2:-HEAD}"
[ "$(git rev-parse --is-shallow-repository)" = "false" ] || { echo "check-signatures: shallow clone refused" >&2; exit 1; }
dir=$(mktemp -d); trap 'rm -rf "$dir"' EXIT
if [ -n "$base" ] && git cat-file -e "$base:scripts/check-signatures.mjs" 2>/dev/null; then
  git show "$base:scripts/check-signatures.mjs" > "$dir/check-signatures.mjs"
  echo "check-signatures: running the copy from base $(git rev-parse --short "$base")"
else
  git show "$after:scripts/check-signatures.mjs" > "$dir/check-signatures.mjs"
  echo "check-signatures: base has no checker yet; running the copy from $(git rev-parse --short "$after") (first push only)"
fi
node "$dir/check-signatures.mjs" "$base" "$after"
