#!/usr/bin/env bash
#
# Build the standalone polyinit binary.
#
# PyInstaller needs the templates directory bundled explicitly, because it only
# collects .py files by default and polyinit ships its payload as data.
#
# Usage: scripts/build-binary.sh [output-dir]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="${POLYINIT_SOURCE:-/home/jacob/pinit}"
OUTPUT="${1:-$ROOT/public/downloads}"
BUILD="$ROOT/.build"

if [[ ! -d "$SOURCE/src/polyinit" ]]; then
  echo "error: cannot find the polyinit source at $SOURCE" >&2
  echo "set POLYINIT_SOURCE to point at the checkout" >&2
  exit 1
fi

PYTHON="${PYTHON:-/tmp/opencode/buildenv/bin/python}"

if [[ ! -x "$PYTHON" ]]; then
  echo "error: $PYTHON not found. Create it with:" >&2
  echo "  python -m venv /tmp/opencode/buildenv" >&2
  echo "  /tmp/opencode/buildenv/bin/pip install pyinstaller" >&2
  exit 1
fi

# PyInstaller's dependency analysis needs polyinit's runtime dependencies
# importable in the build environment, not just polyinit itself.
if ! "$PYTHON" -c "import typer, rich, questionary" 2> /dev/null; then
  echo "==> Installing polyinit and its dependencies into $PYTHON"
  "$PYTHON" -m pip install --quiet "$SOURCE"
fi

VERSION="$("$PYTHON" -c "
import sys
sys.path.insert(0, '$SOURCE/src')
import polyinit
print(polyinit.__version__)
")"

echo "==> Building polyinit $VERSION from $SOURCE"

rm -rf "$BUILD"
mkdir -p "$BUILD" "$OUTPUT"

# The colon is the path separator for --add-data on Linux and macOS.
"$PYTHON" -m PyInstaller \
  --noconfirm \
  --onefile \
  --name polyinit \
  --distpath "$BUILD/dist" \
  --workpath "$BUILD/work" \
  --specpath "$BUILD" \
  --add-data "$SOURCE/src/polyinit/templates:polyinit/templates" \
  --paths "$SOURCE/src" \
  --collect-submodules polyinit \
  --hidden-import polyinit.commands.create \
  --hidden-import polyinit.commands.run \
  --hidden-import polyinit.commands.doctor \
  --hidden-import polyinit.commands.templates \
  "$ROOT/scripts/entry.py"

BINARY="$BUILD/dist/polyinit"
TARGET="$OUTPUT/polyinit-linux-x86_64"

if [[ ! -x "$BINARY" ]]; then
  echo "error: PyInstaller did not produce $BINARY" >&2
  exit 1
fi

# Smoke test before publishing: a binary that cannot list its own templates is
# worse than no binary, because the download looks successful.
echo "==> Verifying the binary"
"$BINARY" version > /dev/null
"$BINARY" templates > /dev/null

cp "$BINARY" "$TARGET"
chmod +x "$TARGET"

SIZE="$(du -h "$TARGET" | cut -f1)"
echo "==> Wrote $TARGET ($SIZE)"
echo "    polyinit $VERSION"