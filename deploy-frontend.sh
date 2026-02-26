#!/usr/bin/env bash
set -euo pipefail

# Config (can override via environment variables)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${FRONTEND_DIR:-$ROOT_DIR/frontend}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/azaps}"
APP_URL="${APP_URL:-https://app.azaps.net/}"

echo "==> Frontend directory: $FRONTEND_DIR"
echo "==> Deploy directory:   $DEPLOY_DIR"
echo "==> App URL:            $APP_URL"

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Error: frontend directory not found: $FRONTEND_DIR" >&2
  exit 1
fi

cd "$FRONTEND_DIR"

echo "==> Installing dependencies"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "==> Building frontend"
npm run build

if [[ ! -d dist ]]; then
  echo "Error: dist directory not found after build" >&2
  exit 1
fi

echo "==> Deploying to $DEPLOY_DIR"
sudo mkdir -p "$DEPLOY_DIR"

if command -v rsync >/dev/null 2>&1; then
  sudo rsync -av --delete dist/ "$DEPLOY_DIR/"
else
  echo "==> rsync not found, using cp fallback"
  # Keep ACME challenge folder if present.
  sudo find "$DEPLOY_DIR" -mindepth 1 -maxdepth 1 ! -name '.well-known' -exec rm -rf {} +
  sudo cp -r dist/. "$DEPLOY_DIR/"
fi

echo "==> Fixing permissions"
sudo chown -R www-data:www-data "$DEPLOY_DIR"

echo "==> Validating and reloading Nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Verification"
echo "Local assets from deployed index.html:"
grep -Eo 'assets/index-[^"]+\.(js|css)' "$DEPLOY_DIR/index.html" || true
echo "Remote assets from $APP_URL:"
curl -fsSL "$APP_URL" | grep -Eo 'assets/index-[^"]+\.(js|css)' || true

echo "Deploy completed."
