#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  deploy.sh — SignSpeak AI production bootstrap (bare metal)
#  Target: fresh Ubuntu 22.04/24.04 VPS. Idempotent — safe to
#  re-run; every step survives a partial failure by design.
#
#  Run on the server:
#    bash <(curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/deploy/deploy.sh)
#  or after a git clone:
#    bash deploy/deploy.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/signspeak}"
DOMAIN="${DOMAIN:-signspeak.example.com}"
NODE_MAJOR=20

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/deploy.sh"; exit 1
fi

say "1/9  System packages"
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg nginx git python3 python3-venv ufw certbot python3-certbot-nginx

say "2/9  Node via NodeSource (v${NODE_MAJOR})"
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
apt-get install -y -qq nodejs
npm install -g pm2@latest

say "3/9  Application files"
mkdir -p "$APP_DIR"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$GIT_REPO" "$APP_DIR" || { echo "Set GIT_REPO (e.g. GIT_REPO=https://github.com/you/signspeak.git ./deploy.sh)"; exit 1; }
fi
cd "$APP_DIR"
git pull --ff-only || true

say "4/9  Environment file (secrets live only on the server)"
if [[ ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/deploy/.env.production" "$APP_DIR/.env"
  echo "!! Fill $APP_DIR/.env with real secrets, then re-run this script."
  exit 0
fi
set -a; source "$APP_DIR/.env"; set +a

say "5/9  Gateway (Express) — prod deps only"
cd "$APP_DIR/backend/gateway"
npm ci --omit=dev
npm run seed            # idempotent: gestures + first admin

say "6/9  AI service (FastAPI + TensorFlow) — venv"
cd "$APP_DIR/backend/ai-service"
python3 -m venv .venv
"$APP_DIR/backend/ai-service/.venv/bin/pip" install --no-cache-dir -r requirements.txt

say "7/9  Frontend build (hashed assets)"
cd "$APP_DIR/frontend"
VITE_API_BASE_URL="/api" npm ci && npm run build

say "8/9  PM2 processes + nginx site"
cd "$APP_DIR"
pm2 start deploy/ecosystem.config.js --update-env
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash

cp deploy/nginx/nginx.baremetal.conf /etc/nginx/sites-available/signspeak
sed -i "s/SERVER_NAME_PLACEHOLDER/${DOMAIN}/g; s|/opt/signspeak/dist|${APP_DIR}/frontend/dist|g" /etc/nginx/sites-available/signspeak
ln -sf /etc/nginx/sites-available/signspeak /etc/nginx/sites-enabled/signspeak
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

say "9/9  Firewall + HTTPS"
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable || true
if command -v certbot >/dev/null && [[ "$DOMAIN" != "signspeak.example.com" ]]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect
fi

say "Done. Services:"
pm2 status