"""Сборка простого ZIP для публикации Android-PWA без компьютера.

Все ресурсы располагаются в корне ZIP, изменения кэша обновляются автоматически.
Личные заметки и прогресс в архив не включаются.
"""
from hashlib import sha256
import re
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent.parent
ASSETS = [
    "index.html", ".nojekyll", "style.css", "ux.css", "android.css", "flow.css", "session.css", "wellbeing.css", "lessons.css", "textbooks.css",
    "data.js", "wellbeing.js", "logic.js", "curriculum.js", "fipi-map.js", "resources.js", "topic-practice.js", "lesson-content.js", "theory-core.js", "fipi-supplements.js", "resource-integrity.js", "textbooks.js", "verified-tocs.js", "page-assignments.js", "reading-guide.js", "topic-coverage.js", "coverage-candidates.js", "study-source-routes.js", "experience.js", "app.js",
    "android.js", "sw.js", "manifest.webmanifest",
    "icons/icon-192.png", "icons/icon-512.png",
]
files = {}
for rel in ASSETS:
    path = ROOT / rel
    if not path.is_file():
        raise SystemExit(f"Missing required asset: {rel}")
    files[rel] = path.read_bytes()

stamp = sha256(b"".join(name.encode() + b"\x00" + files[name] for name in sorted(files) if name != "sw.js")).hexdigest()[:12]
# Service worker должен меняться НЕ только в ZIP, но и в GitHub Pages:
# это запускает обновление уже установленной Android-PWA без удаления localStorage.
cache_name = ("ege-2027-shell-" + stamp).encode()
pattern = rb'const CACHE_NAME="ege-2027-shell-[a-zA-Z0-9_-]+";'
files["sw.js"], replacements = re.subn(pattern, b'const CACHE_NAME="' + cache_name + b'";', files["sw.js"])
if replacements != 1:
    raise SystemExit("Service worker cache marker missing or duplicated")
if (ROOT / "sw.js").read_bytes() != files["sw.js"]:
    (ROOT / "sw.js").write_bytes(files["sw.js"])

OUT = ROOT / "ege-2027-android-pwa.zip"
with ZipFile(OUT, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for rel in ASSETS:
        archive.writestr(rel, files[rel])
print(f"Android package: {OUT.name}, {OUT.stat().st_size} bytes, {len(ASSETS)} assets, cache {stamp}")

# Вспомогательный режим для передачи архива в чат по небольшим блокам.
if __name__ == "__main__":
    import sys
    if len(sys.argv) == 3 and sys.argv[1] == "--chunk":
        import base64
        n = int(sys.argv[2])
        payload = base64.b64encode(OUT.read_bytes()).decode()
        print(f"CHUNK {n} / {(len(payload)+8191)//8192}")
        print(payload[n*8192:(n+1)*8192])
