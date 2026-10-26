#!/usr/bin/env bash
#
# Installs the shared libraries headless Chromium needs on Debian/Ubuntu.
#
# `npx puppeteer browsers install chrome` downloads the Chromium binary but
# not the system libraries it links against, so on a bare Ubuntu or WSL
# install it fails at launch with, for example:
#
#   error while loading shared libraries: libnspr4.so: cannot open shared
#   object file: No such file or directory
#
# Run this once per machine. It needs sudo, so it is a separate script rather
# than something the server does on startup.
#
#   npm run setup:chrome
#
set -euo pipefail

PACKAGES=(
  ca-certificates fonts-liberation libasound2t64 libatk-bridge2.0-0t64
  libatk1.0-0t64 libc6 libcairo2 libcups2t64 libdbus-1-3 libdrm2 libexpat1
  libgbm1 libglib2.0-0t64 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0
  libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxkbcommon0
  libxrandr2 xdg-utils
)

# The "t64" suffix is the 64-bit time_t rebuild used from Ubuntu 24.04
# onwards. On older releases the packages still carry their original names.
LEGACY_NAMES=(
  libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 libglib2.0-0
)

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This script only covers Debian/Ubuntu. Install Chromium's dependencies with your own package manager." >&2
  exit 1
fi

echo "Updating the package list…"
sudo apt-get update

# Ask apt which of the candidate names actually exist on this release, so the
# script works on both the pre- and post-24.04 package naming.
wanted=()
for package in "${PACKAGES[@]}" "${LEGACY_NAMES[@]}"; do
  if apt-cache show "$package" >/dev/null 2>&1; then
    wanted+=("$package")
  fi
done

echo "Installing ${#wanted[@]} packages…"
sudo apt-get install -y --no-install-recommends "${wanted[@]}"

echo
echo "Done. Checking the Chromium Puppeteer downloaded…"

CHROME_PATH="$(node -e "import('puppeteer').then((p) => console.log(p.default.executablePath()))" 2>/dev/null || true)"

if [ -z "$CHROME_PATH" ] || [ ! -x "$CHROME_PATH" ]; then
  echo "Chromium is not downloaded yet. Run: npx puppeteer browsers install chrome" >&2
  exit 1
fi

if ldd "$CHROME_PATH" | grep -q "not found"; then
  echo "Some libraries are still missing:" >&2
  ldd "$CHROME_PATH" | grep "not found" | sort -u >&2
  exit 1
fi

"$CHROME_PATH" --headless --no-sandbox --disable-gpu --dump-dom about:blank >/dev/null
echo "Chromium launches correctly. PDF export is ready."
