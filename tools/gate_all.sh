#!/bin/bash
# Re-assemble and gate the given screens one after another, e.g.
#   tools/gate_all.sh screen15/A screen16/A screen8/A
# For each: assemble.py -> render.js on the 7 phones -> render.js --selftest -> check_screen.py. Ends with ALLDONE.
# A full screen takes about 10-20 minutes; run it in the background and read its log.
R="$(cd "$(dirname "$0")/.." && pwd)"
# Playwright: the global install works from any directory in the cloud container; else `cd tools && npm install`.
[ -d "$R/tools/node_modules" ] && export NODE_PATH="${NODE_PATH:-$R/tools/node_modules}"
export CHROMIUM_PATH="${CHROMIUM_PATH:-$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell 2>/dev/null | head -1)}"
cd "$R"
# the renders need the project font, or every measurement is made in a fallback font (tools/install_fonts.sh)
fc-list | grep -q "IBM Plex Sans Arabic" || { echo "IBM Plex Sans Arabic is not installed: run tools/install_fonts.sh"; exit 1; }
for s in "$@"; do
  python3 -I design/$s/_build/assemble.py . design/$s/_build design/$s >/dev/null || { echo "$s ASSEMBLE FAIL"; continue; }
  (cd design/$s/_build && timeout 3000 node render.js 2>&1 | grep "issues per device"; timeout 3000 node render.js --selftest 2>&1 | grep -E "MISSED|selftest OK|SELFTEST FAILED")
  echo "$s: $(python3 -I tools/check_screen.py design/$s 2>&1 | tail -1)"
done
echo ALLDONE
