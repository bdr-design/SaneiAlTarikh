"""The IPA gate (design_doc §2.8): the checks M0 can meet. The executable is arm64; MinimumOSVersion is 17.0;
UIDeviceFamily is [1]; landscape only; the frame-rate, encryption and status-bar keys; file sharing and in-place
opening; the .sanei exported type; the development region ar; the bundle ID; the icon and Assets.car; default.metallib
with the triangle's two functions; ar.lproj; an empty Frameworks folder; no JSON, CSV or GeoJSON over 64 KB; per-file
budgets (executable 15 MB, Assets.car 3 MB, default.metallib 0.5 MB); the whole IPA at most 120 MB. Every size is
printed. The 25 MB floor waits for the packs (M0b); pack hashes, province orders and the credits hash wait for the
content (M1a). Usage: python3 tools/checks/ipa_gate.py <app.ipa>"""
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
    if not apps:
        print("FAIL one .app in Payload (none found)")
        print("IPA GATE FAIL")
        sys.exit(1)
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
    check(info.get("UIStatusBarHidden") is True, "UIStatusBarHidden")
    types = info.get("UTExportedTypeDeclarations", [])
    check(any(t.get("UTTypeIdentifier") == "com.bdrdesign.SaneiAlTarikh.save"
              and "sanei" in t.get("UTTypeTagSpecification", {}).get("public.filename-extension", []) for t in types),
          "the .sanei save type is exported")
    check(info.get("UIFileSharingEnabled") is True and info.get("LSSupportsOpeningDocumentsInPlace") is True, "file sharing and in-place opening")
    check(info.get("CFBundleDevelopmentRegion") == "ar", "CFBundleDevelopmentRegion ar")
    check(info.get("CFBundleIdentifier") == "com.bdrdesign.SaneiAlTarikh", f"bundle ID ({info.get('CFBundleIdentifier')})")
    check((app / "Assets.car").exists(), "Assets.car")
    check("CFBundleIcons" in info and any(app.glob("AppIcon*.png")), "the app icon")
    metallib = app / "default.metallib"
    check(metallib.exists(), "default.metallib")
    if metallib.exists():
        blob = metallib.read_bytes()
        check(b"triangle_vertex" in blob and b"triangle_fragment" in blob, "default.metallib has triangle_vertex and triangle_fragment")
    for path, limit_mb in ((exe, 15), (app / "Assets.car", 3), (metallib, 0.5)):
        if path.exists():
            mb = path.stat().st_size / 1_048_576
            check(mb <= limit_mb, f"{path.name} {mb:.2f} MB <= {limit_mb} MB")
    print("sizes:")
    for p in sorted((p for p in app.rglob("*") if p.is_file()), key=lambda p: -p.stat().st_size)[:12]:
        print(f"  {p.stat().st_size / 1024:10.1f} KB  {p.relative_to(app)}")
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
