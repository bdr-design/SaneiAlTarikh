"""The IPA gate (design_doc §2.8), the checks M0 can meet: the executable arm64, MinimumOSVersion 17.0, UIDeviceFamily
[1], landscape only, the frame-rate and encryption keys, file sharing and in-place opening, the development region ar,
the icon and Assets.car, default.metallib, ar.lproj, an empty Frameworks folder, no file over its kind's limit, the
size at most 120 MB. The 25 MB floor waits for the packs (M0b); pack hashes, province orders and the credits hash wait
for the content (M1a). Usage: python3 tools/checks/ipa_gate.py <app.ipa>"""
import plistlib
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ipa = Path(sys.argv[1])
fails, oks = [], []


def check(ok, what):
    (oks if ok else fails).append(what)


size_mb = ipa.stat().st_size / 1_048_576
check(size_mb <= 120, f"IPA size {size_mb:.1f} MB <= 120 MB")
with tempfile.TemporaryDirectory() as tmp:
    with zipfile.ZipFile(ipa) as z:
        z.extractall(tmp)
    apps = list(Path(tmp, "Payload").glob("*.app"))
    check(len(apps) == 1, "one .app in Payload")
    app = apps[0]
    info = plistlib.loads((app / "Info.plist").read_bytes())
    exe = app / info.get("CFBundleExecutable", "")
    archs = subprocess.run(["lipo", "-archs", str(exe)], capture_output=True, text=True).stdout.split()
    check(archs == ["arm64"], f"executable arm64 only ({' '.join(archs)})")
    check(info.get("MinimumOSVersion") == "17.0", f"MinimumOSVersion 17.0 ({info.get('MinimumOSVersion')})")
    check(info.get("UIDeviceFamily") == [1], f"UIDeviceFamily [1] ({info.get('UIDeviceFamily')})")
    check(sorted(info.get("UISupportedInterfaceOrientations", [])) == ["UIInterfaceOrientationLandscapeLeft", "UIInterfaceOrientationLandscapeRight"],
          "landscape only")
    check(info.get("CADisableMinimumFrameDurationOnPhone") is True, "CADisableMinimumFrameDurationOnPhone")
    check(info.get("ITSAppUsesNonExemptEncryption") is False, "ITSAppUsesNonExemptEncryption NO")
    check(info.get("UIFileSharingEnabled") is True and info.get("LSSupportsOpeningDocumentsInPlace") is True, "file sharing and in-place opening")
    check(info.get("CFBundleDevelopmentRegion") == "ar", "CFBundleDevelopmentRegion ar")
    check(info.get("CFBundleIdentifier") == "com.bdrdesign.SaneiAlTarikh", f"bundle ID ({info.get('CFBundleIdentifier')})")
    check((app / "Assets.car").exists(), "Assets.car")
    check("CFBundleIcons" in info and any(app.glob("AppIcon*.png")), "the app icon")
    check((app / "default.metallib").exists(), "default.metallib")
    check((app / "ar.lproj").is_dir(), "ar.lproj")
    fw = app / "Frameworks"
    check(not fw.exists() or not any(fw.iterdir()), "Frameworks empty")
    big = [p.name for p in app.rglob("*") if p.is_file() and p.suffix in (".json", ".csv", ".geojson") and p.stat().st_size > 64 * 1024]
    check(not big, "no JSON, CSV or GeoJSON over 64 KB" + (f" ({', '.join(big)})" if big else ""))
    check(not any(app.rglob("*.geojson")), "no GeoJSON")

for o in oks:
    print("PASS", o)
for f in fails:
    print("FAIL", f)
print("IPA GATE", "PASS" if not fails else f"FAIL ({len(fails)})")
sys.exit(1 if fails else 0)
