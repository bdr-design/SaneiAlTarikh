#!/bin/bash
# The ID lock only grows (F4, §2.8): the lock of the target branch, and of the commit before this push, must each be
# this one's first lines, unchanged and in order. A ref that has no lock yet is skipped (the lock's first commit).
# TARGET (default main) and BEFORE (the push's previous commit; skipped when empty or all zeros) name the refs.
set -euo pipefail
lock=content/registry/ids.lock
git config --global --add safe.directory "$PWD" 2>/dev/null || true
refs=("${TARGET:-main}")
if [ -n "${BEFORE:-}" ] && [ "${BEFORE}" != "0000000000000000000000000000000000000000" ]; then refs+=("$BEFORE"); fi
for ref in "${refs[@]}"; do
  if ! git fetch -q --depth=1 origin "$ref" 2>/dev/null; then
    echo "ids.lock: $ref cannot be fetched"; exit 1
  fi
  if ! old=$(git show FETCH_HEAD:"$lock" 2>/dev/null); then
    echo "ids.lock: $ref has no lock yet, skipped"; continue
  fi
  n=$(printf '%s\n' "$old" | wc -l)
  if ! diff <(printf '%s\n' "$old") <(head -n "$n" "$lock") >/dev/null; then
    echo "ids.lock: a line of $ref's lock was removed or changed; the lock only grows (add new IDs at the end)"
    diff <(printf '%s\n' "$old") <(head -n "$n" "$lock") || true
    exit 1
  fi
  echo "ids.lock: grows from $ref ($n lines kept, $(( $(wc -l < "$lock") - n )) added)"
done
