#!/bin/bash
# The ID lock check's own test: each case a lock on `main` (pushed to a throwaway origin) and a lock in the work tree,
# and whether tools/checks/ids_lock.sh must pass or fail. Run from the repository's root; git alone.
set -euo pipefail
script="$PWD/tools/checks/ids_lock.sh"
root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT
# git's global settings in the throwaway folder: the check under test adds a safe.directory each run
export GIT_CONFIG_GLOBAL="$root/gitconfig"
git init -q --bare "$root/origin.git"
git init -q -b main "$root/work"
cd "$root/work"
git config user.email test@example.invalid
git config user.name test
git remote add origin "$root/origin.git"
mkdir -p content/registry
lock=content/registry/ids.lock
failures=0
# main's lock: pushed as the target branch
on_main() { printf "$1" > "$lock"; git add -A; git commit -q -m main --allow-empty; git push -q -f origin main 2>/dev/null; }
# the work tree's lock, then the check: $1 pass or fail, $2 the lock's text, $3 the case's name, $4 BEFORE
check() {
  local want=$1 text=$2 name=$3 before=${4:-}
  mkdir -p content/registry; printf "$text" > "$lock"
  if TARGET=main BEFORE="$before" bash "$script" > /dev/null 2>&1; then got=pass; else got=fail; fi
  if [ "$got" != "$want" ]; then echo "ids_lock_test: $name: wanted $want, got $got"; failures=$((failures + 1)); fi
}
on_main 'polity a\npolity b\n'
check pass 'polity a\npolity b\n' "unchanged"
check pass 'polity a\npolity b\npolity c\n' "grows at the end"
check fail 'polity a\npolity bz\n' "a line changed"
check fail 'polity a\npolity b\npolity c' "the new last line without its line break"
check fail 'polity b\n' "the first line removed"
check fail 'polity a\n' "the last line removed"
check fail 'polity b\npolity a\n' "lines reordered"
check fail 'polity x\npolity b\npolity c\n' "an ID changed in front"
check fail '' "emptied"
check pass 'polity a\npolity b\npolity c\n' "BEFORE all zeros is skipped" 0000000000000000000000000000000000000000
check fail 'polity a\npolity b\n' "an unfetchable BEFORE" 1111111111111111111111111111111111111111
on_main 'polity a\npolity b'
check fail 'polity a\npolity bz\n' "main's lock without its last line break"
git rm -q -f "$lock"; git commit -q -m "no lock"; git push -q -f origin main 2>/dev/null
check pass 'polity a\n' "main has no lock yet"
if [ "$failures" -gt 0 ]; then exit 1; fi
echo "ids_lock_test: every case as wanted"
