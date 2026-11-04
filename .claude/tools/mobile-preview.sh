#!/usr/bin/env bash
# Screenshot του index.html σε πλάτος κινητού (375px), ανοιχτό και σκούρο θέμα δίπλα-δίπλα.
# Χρήση: bash .claude/tools/mobile-preview.sh [φάκελος εξόδου]   → <φάκελος>/mobile-preview.png
# Το headless Chrome δεν στενεύει κάτω από ~500px, γι' αυτό η σελίδα φορτώνει μέσα σε iframe 375px.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-${TEMP:-/tmp}}"
WORK="$OUT/mobile-preview-work"
mkdir -p "$WORK"

win() { if command -v cygpath >/dev/null; then cygpath -m "$1"; else echo "$1"; fi; }
ROOT_URL="file:///$(win "$ROOT")/"

for t in light dark; do
  sed "s#<html lang=\"el\">#<html lang=\"el\" data-theme=\"$t\">#; s#<head>#<head><base href=\"$ROOT_URL\">#" \
    "$ROOT/index.html" > "$WORK/page-$t.html"
done

cat > "$WORK/frame.html" <<'EOF'
<!doctype html><html><body style="margin:0;display:flex;gap:20px;background:#888">
<iframe src="page-light.html" style="width:375px;height:5000px;border:0"></iframe>
<iframe src="page-dark.html" style="width:375px;height:5000px;border:0"></iframe>
</body></html>
EOF

CHROME=""
for c in "/c/Program Files/Google/Chrome/Application/chrome.exe" \
         "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
         "$(command -v google-chrome || true)" "$(command -v chromium || true)"; do
  [ -n "$c" ] && [ -x "$c" ] && CHROME="$c" && break
done
[ -z "$CHROME" ] && { echo "Δεν βρέθηκε Chrome/Edge" >&2; exit 1; }

"$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
  --user-data-dir="$(win "$WORK/profile")" --window-size=770,5000 \
  --screenshot="$(win "$OUT/mobile-preview.png")" "file:///$(win "$WORK/frame.html")" >/dev/null 2>&1

echo "$(win "$OUT/mobile-preview.png")"
