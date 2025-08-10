#!/usr/bin/env bash
set -euo pipefail

if [[ ${1:-} == "" ]]; then
  echo "Usage: $0 <tag-name> [new-branch-name]" >&2
  echo "Example: $0 stable-20250810_185211 restore-20250810" >&2
  exit 1
fi

TAG_NAME="$1"
BRANCH_NAME="${2:-restore-${TAG_NAME}}"

echo "🔎 Fetching tags..."
git fetch --all --tags

echo "🔁 Checking out tag $TAG_NAME into branch $BRANCH_NAME..."
git checkout -B "$BRANCH_NAME" "tags/$TAG_NAME"

echo "✅ Restored working tree to $TAG_NAME on branch $BRANCH_NAME."
echo "Next steps:"
echo "  - Verify app runs (backend 5680, frontend 3100)."
echo "  - Optionally push this branch: git push -u origin $BRANCH_NAME"
echo "  - When satisfied, create a new stable tag from here."


