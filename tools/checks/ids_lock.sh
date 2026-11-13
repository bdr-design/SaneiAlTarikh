#!/bin/bash
# The ID lock only grows (F4, §2.8): the lock of the target branch, and of the commit before this push, must each be
# this one's first bytes, unchanged. Each line of a lock ends in a line break (the bake refuses a lock whose last line
# has none). A ref that has no lock yet is skipped (the lock's first commit), and an empty old lock is a prefix of any.
# TARGET (default main) and BEFORE (the push's previous commit; skipped when empty or all zeros) name the refs.
set -euo pipefail
lock=content/registry/ids.lock
git config --global --add safe.directory "$PWD" 2>/dev/null || true
refs=("${TARGET:-main}")
if [ -n "${BEFORE:-}" ] && [ "${BEFORE}" != "0000000000000000000000000000000000000000" ]; then refs+=("$BEFORE"); fi
old=$(mktemp)
trap 'rm -f "$old"' EXIT
for ref in "${refs[@]}"; do
  if ! git fetch -q --depth=1 origin "$ref" 2>/dev/null; then
    echo "ids.lock: $ref cannot be fetched"; exit 1
  fi
  if ! git show FETCH_HEAD:"$lock" > "$old" 2>/dev/null; then
    echo "ids.lock: $ref has no lock yet, skipped"; continue
  fi
  n=$(stat -c%s "$old")
  if [ "$n" -gt 0 ] && ! cmp -s -n "$n" "$old" "$lock"; then
    echo "ids.lock: a line of $ref's lock was removed or changed; the lock only grows (add new IDs at the end)"
    diff "$old" <(head -c "$n" "$lock") || true
    exit 1
  fi
  if [ "$(stat -c%s "$lock")" -lt "$n" ]; then echo "ids.lock: shorter than $ref's"; exit 1; fi
  echo "ids.lock: grows from $ref ($n bytes kept, $(( $(stat -c%s "$lock") - n )) added)"
done
