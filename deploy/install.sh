#!/usr/bin/env bash
# Season Card — one-command install / update for a Linux VPS.
#   First run:  bash deploy/install.sh      (asks for domain + PayPal keys once)
#   Update:     git pull && bash deploy/install.sh
# It: installs Docker if missing, writes .env (secrets generated locally), builds and starts the app,
# puts HTTPS in front (Caddy if ports 80/443 are free, otherwise an nginx site + certbot),
# and registers the PayPal webhook automatically.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
ENV_FILE="$ROOT/.env"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$ROOT/deploy/docker-compose.yml")

say()  { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

get_env() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- || true; }
set_env() {
  if grep -qE "^$1=" "$ENV_FILE"; then sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"; else echo "$1=$2" >> "$ENV_FILE"; fi
}

# 1. Docker
if ! command -v docker >/dev/null 2>&1; then
  say "Installing Docker"
  curl -fsSL https://get.docker.com | $SUDO sh
fi
docker compose version >/dev/null 2>&1 || die "Docker Compose plugin missing (apt install docker-compose-plugin)"
ok "Docker ready"

# 2. .env (asked once, secrets never leave this server)
if [ ! -f "$ENV_FILE" ]; then
  say "First-time setup"
  read -rp "Domain for the site [seasoncard.app]: " DOMAIN; DOMAIN=${DOMAIN:-seasoncard.app}
  read -rp "PayPal mode (sandbox/live) [live]: " PPENV; PPENV=${PPENV:-live}
  read -rp "PayPal Client ID: " PPID
  read -rsp "PayPal Secret (hidden): " PPSECRET; echo
  read -rp "Email for HTTPS certificate notices: " CERTMAIL
  [ -n "$PPID" ] && [ -n "$PPSECRET" ] || die "PayPal Client ID and Secret are required"
  umask 077
  cat > "$ENV_FILE" <<EOF
DOMAIN=$DOMAIN
SITE_URL=https://$DOMAIN
CERT_EMAIL=$CERTMAIL
PAYPAL_ENV=$PPENV
PAYPAL_CLIENT_ID=$PPID
NEXT_PUBLIC_PAYPAL_CLIENT_ID=$PPID
PAYPAL_CLIENT_SECRET=$PPSECRET
PAYPAL_WEBHOOK_ID=
REPORT_TOKEN_SECRET=$(openssl rand -base64 48 | tr -d '\n/+=')
ADMIN_KEY=$(openssl rand -hex 32)
EOF
  ok ".env written (permissions 600)"
fi
DOMAIN="$(get_env DOMAIN)"; ADMIN_KEY="$(get_env ADMIN_KEY)"; CERT_EMAIL="$(get_env CERT_EMAIL)"

# 3. Build + start app (bound to 127.0.0.1:3080)
say "Building and starting Season Card"
"${COMPOSE[@]}" up -d --build app
for i in $(seq 1 60); do curl -fs http://127.0.0.1:3080/ >/dev/null && break; sleep 2; done
curl -fs http://127.0.0.1:3080/ >/dev/null || die "App did not start. See: ${COMPOSE[*]} logs app"
ok "App running on 127.0.0.1:3080"

# 4. HTTPS
port_busy() { $SUDO ss -ltnp 2>/dev/null | grep -qE "[:.]$1\s"; }
if $SUDO ss -ltnp 2>/dev/null | grep -E '[:.](80|443)\s' | grep -q caddy || { ! port_busy 80 && ! port_busy 443; }; then
  say "Starting Caddy for automatic HTTPS"
  "${COMPOSE[@]}" --profile caddy up -d caddy
  ok "Caddy serving https://$DOMAIN"
elif command -v nginx >/dev/null 2>&1; then
  say "nginx already owns ports 80/443 — adding a site for $DOMAIN"
  CONF="/etc/nginx/sites-available/seasoncard.conf"
  $SUDO tee "$CONF" >/dev/null <<EOF
server {
  listen 80;
  server_name $DOMAIN www.$DOMAIN;
  client_max_body_size 2m;
  location / {
    proxy_pass http://127.0.0.1:3080;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF
  [ -d /etc/nginx/sites-enabled ] && $SUDO ln -sf "$CONF" /etc/nginx/sites-enabled/seasoncard.conf
  $SUDO nginx -t && $SUDO systemctl reload nginx
  if ! command -v certbot >/dev/null 2>&1; then $SUDO apt-get update -y && $SUDO apt-get install -y certbot python3-certbot-nginx; fi
  $SUDO certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "${CERT_EMAIL:-admin@$DOMAIN}" --redirect \
    || echo "certbot failed — usually DNS for $DOMAIN does not point here yet. Re-run this script once it does."
  ok "nginx serving https://$DOMAIN"
else
  die "Ports 80/443 are used by something other than nginx/Caddy. App is up on 127.0.0.1:3080 — point your proxy at it."
fi

# 5. PayPal webhook (registered through the PayPal API — no dashboard clicks)
if [ -z "$(get_env PAYPAL_WEBHOOK_ID)" ]; then
  say "Registering PayPal webhook"
  RESP="$(curl -fsS -X POST http://127.0.0.1:3080/api/admin/setup -H "x-admin-key: $ADMIN_KEY" || true)"
  HOOK_ID="$(printf '%s' "$RESP" | sed -n 's/.*"webhookId":"\([^"]*\)".*/\1/p')"
  if [ -n "$HOOK_ID" ]; then
    set_env PAYPAL_WEBHOOK_ID "$HOOK_ID"
    "${COMPOSE[@]}" up -d app
    ok "Webhook registered: $HOOK_ID"
  else
    echo "Webhook registration failed. Response: $RESP"
    echo "Check the PayPal Client ID/Secret and PAYPAL_ENV in .env, then re-run this script."
  fi
else
  ok "PayPal webhook already set"
fi

echo
ok "Season Card is live at https://$DOMAIN"
echo "   Revenue check:  curl -s http://127.0.0.1:3080/api/admin/summary -H \"x-admin-key: \$(grep ^ADMIN_KEY= .env | cut -d= -f2)\""
echo "   Logs:           ${COMPOSE[*]} logs -f app"
