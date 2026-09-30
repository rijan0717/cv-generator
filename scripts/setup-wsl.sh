#!/usr/bin/env bash
#
# One-time development environment setup for Ubuntu on WSL2.
#
# Installs Node.js, npm and MongoDB natively inside WSL so the whole project
# runs on Linux, then reinstalls the project dependencies.
#
# Usage (from the WSL Ubuntu terminal):
#   bash ~/cvgenerator/scripts/setup-wsl.sh
#
# You will be asked for your sudo password.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m[warn] %s\033[0m\n' "$1"; }

# ---------------------------------------------------------------------------
# 0. Sanity checks
# ---------------------------------------------------------------------------
if ! grep -qi microsoft /proc/version; then
  warn "This does not look like WSL. Continuing anyway."
fi

say "Project directory: $PROJECT_DIR"

# ---------------------------------------------------------------------------
# 1. Node.js and npm
# ---------------------------------------------------------------------------
# Ubuntu 26.04 ships Node.js 22 LTS in its own repositories, so no third-party
# repository is needed. The bundled npm is old, so it is upgraded afterwards.
say "Installing Node.js and npm from the Ubuntu repositories"
sudo apt-get update
sudo apt-get install -y nodejs npm curl gnupg ca-certificates

# npm 12 requires Node ^22.22.2, but Ubuntu 26.04 ships Node 22.22.1, so
# npm@latest refuses to install. npm 11 is the newest line that supports this
# Node version, and it is a large improvement on the npm 9 that apt provides.
# A failure here is not fatal: the apt npm still works.
say "Upgrading npm to version 11"
sudo npm install -g npm@11 || warn "Could not upgrade npm; continuing with $(npm --version)"

echo "node: $(node --version)"
echo "npm:  $(npm --version)"

# ---------------------------------------------------------------------------
# 2. MongoDB Community Server
# ---------------------------------------------------------------------------
# MongoDB does not publish a repository for Ubuntu 26.04 yet, so the 24.04
# ("noble") repository is used. This is the newest release MongoDB supports.
MONGO_VERSION="8.0"
MONGO_REPO_CODENAME="noble"
KEYRING="/usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg"
SOURCES_LIST="/etc/apt/sources.list.d/mongodb-org-${MONGO_VERSION}.list"

if command -v mongod >/dev/null 2>&1; then
  say "MongoDB is already installed: $(mongod --version | head -1)"
else
  say "Adding the MongoDB ${MONGO_VERSION} apt repository"
  curl -fsSL "https://www.mongodb.org/static/pgp/server-${MONGO_VERSION}.asc" |
    sudo gpg --dearmor --yes -o "$KEYRING"

  echo "deb [ arch=amd64,arm64 signed-by=${KEYRING} ] https://repo.mongodb.org/apt/ubuntu ${MONGO_REPO_CODENAME}/mongodb-org/${MONGO_VERSION} multiverse" |
    sudo tee "$SOURCES_LIST" >/dev/null

  say "Installing MongoDB ${MONGO_VERSION}"
  sudo apt-get update
  if ! sudo apt-get install -y mongodb-org; then
    warn "MongoDB packages could not be installed."
    warn "This usually means the noble packages need libraries that Ubuntu 26.04 does not provide."
    warn "See docs/mongodb.md section 9 for the fallback options."
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# 3. Start MongoDB as a systemd service
# ---------------------------------------------------------------------------
say "Enabling and starting the mongod service"
sudo systemctl enable --now mongod
sleep 2
sudo systemctl --no-pager --lines=0 status mongod || true

# ---------------------------------------------------------------------------
# 4. Reinstall project dependencies with the Linux toolchain
# ---------------------------------------------------------------------------
# Any node_modules installed by Windows npm contain Windows binaries and
# Windows shell shims, which is why `vite: Permission denied` happens when the
# project is run from WSL. They must be removed and reinstalled.
say "Removing node_modules installed by Windows npm"
rm -rf "$PROJECT_DIR/node_modules" \
  "$PROJECT_DIR/server/node_modules" \
  "$PROJECT_DIR/client/node_modules" \
  "$PROJECT_DIR/package-lock.json" \
  "$PROJECT_DIR/server/package-lock.json" \
  "$PROJECT_DIR/client/package-lock.json"

say "Installing project dependencies"
cd "$PROJECT_DIR"
npm install
npm install --prefix server
npm install --prefix client

# ---------------------------------------------------------------------------
# 5. Environment files
# ---------------------------------------------------------------------------
if [ ! -f "$PROJECT_DIR/server/.env" ]; then
  say "Creating server/.env from the example"
  cp "$PROJECT_DIR/server/.env.example" "$PROJECT_DIR/server/.env"
  warn "Edit server/.env and set JWT_SECRET and PRINT_TOKEN_SECRET."
fi

if [ ! -f "$PROJECT_DIR/client/.env" ]; then
  say "Creating client/.env from the example"
  cp "$PROJECT_DIR/client/.env.example" "$PROJECT_DIR/client/.env"
fi

# ---------------------------------------------------------------------------
# 6. Verify
# ---------------------------------------------------------------------------
say "Verifying the installation"
echo "node:    $(node --version)"
echo "npm:     $(npm --version)"
echo "mongod:  $(mongod --version | head -1)"
if mongosh --quiet --eval 'db.runCommand({ ping: 1 }).ok' 2>/dev/null; then
  echo "mongodb: reachable on 127.0.0.1:27017"
else
  warn "Could not reach MongoDB. Try: sudo systemctl status mongod"
fi

say "Done. Start the application with:  npm run dev"
