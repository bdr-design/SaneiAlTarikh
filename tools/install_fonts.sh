#!/bin/bash
# Install the project font IBM Plex Sans Arabic (SIL OFL 1.1, design/shared/OFL-IBMPlexSansArabic.txt) for the renders.
# Every mockup names it first; without it Chromium falls back to other fonts with other widths, and every measurement,
# gate and render is wrong (2026-11-04: a new container had no Plex and rendered in DejaVu). gate_all.sh refuses to run
# without it. Source: the Google Fonts repository (the same files as fonts.google.com).
set -e
D="${HOME}/.local/share/fonts"; mkdir -p "$D"
for w in Regular Medium SemiBold Bold; do
  f="$D/IBMPlexSansArabic-$w.ttf"
  [ -s "$f" ] || curl -sS --max-time 60 -o "$f" "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsansarabic/IBMPlexSansArabic-$w.ttf"
done
fc-cache -f >/dev/null
fc-list | grep -q "IBM Plex Sans Arabic" && echo "IBM Plex Sans Arabic installed" || { echo "IBM Plex Sans Arabic NOT installed"; exit 1; }
