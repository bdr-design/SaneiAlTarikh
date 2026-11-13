#!/bin/bash
# The ID lock check's own test: each case a lock on `main` (pushed to a throwaway origin) and a lock in the work tree,
# and whether tools/checks/ids_lock.sh must pass or fail. Run from the repository's root; git alone.
set -euo pipefail
script="$PWD/tools/checks/ids_lock.sh"
if [ ! -f "$script" ]; then echo "ids_lock_test: run from the repository's root (no $script)"; exit 1; fi
# nothing from the caller's git: no repository named by the environment (as inside a hook) and no settings passed on
# (`git -c`), both in --local-env-vars; no templates of the caller's; no system settings
unset $(git rev-parse --local-env-vars) GIT_TEMPLATE_DIR GIT_NAMESPACE
export GIT_CONFIG_NOSYSTEM=1
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
on_main() {
  printf "$1" > "$lock"; git add -A; git commit -q -m main --allow-empty
  if ! git push -q -f origin main 2>/dev/null; then echo "ids_lock_test: the push to the throwaway origin failed"; exit 1; fi
}
# the work tree's lock, then the check: $1 pass or fail, $2 the lock's text, $3 the case's name, $4 BEFORE
check() {
  local want=$1 text=$2 name=$3 before=${4:-}
  mkdir -p content/registry; printf "$text" > "$lock"
  if TARGET=main BEFORE="$before" bash "$script" > /dev/null 2>&1; then got=pass; else got=fail; fi
  if [ "$got" != "$want" ]; then echo "ids_lock_test: $name: wanted $want, got $got"; failures=$((failures + 1)); fi
}
on_main 'polity a\npolity b\n'
check pass 'polity a\npolity b\n' "unchanged"
# TARGET unset: main by default, so a lock that grows passes and one that changes a line fails
if ! (printf 'polity a\npolity b\npolity c\n' > "$lock"; env -u TARGET BEFORE= bash "$script" > /dev/null 2>&1); then
  echo "ids_lock_test: TARGET unset, a lock that grows: wanted pass, got fail"; failures=$((failures + 1))
fi
if (printf 'polity a\npolity bz\n' > "$lock"; env -u TARGET BEFORE= bash "$script" > /dev/null 2>&1); then
  echo "ids_lock_test: TARGET unset, a line changed: wanted fail, got pass"; failures=$((failures + 1))
fi
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
# the commit before the push: its lock kept too, even where main's is shorter
git checkout -q -b pushed
printf 'polity a\npolity b\npolity c\n' > "$lock"; git commit -q -am pushed; git push -q origin pushed 2>/dev/null
pushed=$(git rev-parse HEAD)
git checkout -q main
check fail 'polity a\npolity b\n' "a line the last push added, removed" "$pushed"
check pass 'polity a\npolity b\npolity c\npolity d\n' "grows from the last push" "$pushed"
# both guard at once: a lock that keeps the last push's but not main's fails
on_main 'polity a\npolity x\n'
check fail 'polity a\npolity b\npolity c\npolity d\n' "main's lock changed, the last push's kept" "$pushed"
on_main 'polity a\npolity b\n'
on_main ''
check pass 'polity a\n' "main's lock empty: a prefix of any"
on_main 'polity a\npolity b'
check fail 'polity a\npolity bz\n' "main's lock without its last line break"
git rm -q -f "$lock"; git commit -q -m "no lock"; git push -q -f origin main 2>/dev/null
check pass 'polity a\n' "main has no lock yet"
# main without a lock: the last push's lock still guards
check fail 'polity a\n' "main has no lock, the last push's line removed" "$pushed"
check pass 'polity a\npolity b\npolity c\n' "main has no lock, the last push's kept" "$pushed"
if [ "$failures" -gt 0 ]; then exit 1; fi
echo "ids_lock_test: every case as wanted"
