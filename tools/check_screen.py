"""Gate for a screen design folder: every device rendered, at the right size, with 0 check issues.

Usage: python3 -I check_screen.py <screen_dir> [--baseline <png>] [--max-diff <mean abs diff>]
Exit 0 only when every condition holds. Prints one line per condition.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

args = sys.argv[1:]
screen = Path(args[0])
baseline = Path(args[args.index("--baseline") + 1]) if "--baseline" in args else None
max_diff = float(args[args.index("--max-diff") + 1]) if "--max-diff" in args else 0.5
devices = json.loads((Path(__file__).resolve().parents[1] / "design/shared/devices.json").read_text())
fails = []


def check(ok, msg):
    print(("PASS " if ok else "FAIL ") + msg)
    if not ok:
        fails.append(msg)


report_path = screen / "_build/report.json"
report = json.loads(report_path.read_text()) if report_path.exists() else {}
check(report_path.exists(), f"{report_path} exists")
for d in devices:
    png = screen / f"{d['id']}.png"
    if not png.exists():
        check(False, f"{d['id']}: {png.name} exists")
        continue
    want = (d["w"] * 3, d["h"] * 3)
    got = Image.open(png).size
    check(got == want, f"{d['id']}: size {got} == {want}")
    stale = report_path.exists() and png.stat().st_mtime > report_path.stat().st_mtime + 120
    check(not stale, f"{d['id']}: report.json is not older than the render")
    entry = report.get(d["id"])
    issues = entry.get("issues") if isinstance(entry, dict) else None
    check(issues == [], f"{d['id']}: report issues = {len(issues) if issues is not None else 'missing'}")
if baseline:
    a = np.asarray(Image.open(screen / "i16promax.png").convert("RGB"), dtype=np.float32)
    b = np.asarray(Image.open(baseline).convert("RGB"), dtype=np.float32)
    diff = float(np.abs(a - b).mean()) if a.shape == b.shape else float("inf")
    check(diff <= max_diff, f"i16promax vs baseline mean abs diff {diff:.3f} <= {max_diff}")
print("RESULT", "PASS" if not fails else f"FAIL ({len(fails)})")
sys.exit(1 if fails else 0)
