#!/usr/bin/env bash
# Season Card — lightweight install for a small VPS that already hosts other sites.
# No Docker, no build on the server: downloads the ready-made app (GitHub branch "release")
# and runs it as one locked-down systemd service with a hard memory cap.
#
#   bash deploy/native-install.sh --check   → read-only report, changes nothing
#   bash deploy/native-install.sh           → install (safe to re-run)
#   bash deploy/native-update.sh            → pull the newest release + restart (later updates)
#
# Safety: never touches other sites/services. Only creates: /opt/seasoncard/app, /opt/seasoncard/node
# (only if no Node >= 20 exists), /etc/seasoncard/env, /var/lib/seasoncard, system user "seasoncard",
# seasoncard.service, and ONE nginx file seasoncard.conf (after backing up /etc/nginx and passing nginx -t).
set -euo pipefail

REPO="https://github.com/samansalour93/seasoncard"
BASE=/opt/seasoncard
APP="$BASE/app"
ENVF=/etc/seasoncard/env
DATA=/var/lib/seasoncard
PORT="${APP_PORT:-3080}"
DOMAIN="${DOMAIN:-seasoncard.app}"
NODE_VERSION="v22.22.2"

say()  { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;35m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || die "Run as root."

listeners() { ss -ltnpH 2>/dev/null | grep -E "[:.]$1\s" || true; }
owner_of()  { listeners "$1" | grep -oE 'users:\(\("[^"]+' | head -1 | sed 's/users:(("//'; }
node_bin() {
  if [ -x "$BASE/node/bin/node" ]; then echo "$BASE/node/bin/node"; return; fi
  if command -v node >/dev/null 2>&1; then
    local major; major="$(node -v | sed 's/^v//; s/\..*//')"
    [ "${major:-0}" -ge 20 ] && { command -v node; return; }
  fi
  echo ""
}
our_service_running() { systemctl is-active --quiet seasoncard 2>/dev/null; }

P80="$(owner_of 80)"; P443="$(owner_of 443)"
if [ "${1:-}" = "--check" ]; then
  echo "=== Season Card check (read-only) ==="
  echo "Arch:        $(uname -m)"
  echo "RAM free:    $(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo) MB"
  echo "Node >=20:   $( [ -n "$(node_bin)" ] && "$(node_bin)" -v || echo 'no (a private copy will be put in /opt/seasoncard/node)')"
  echo "Port 80/443: ${P80:-free} / ${P443:-free}"
  echo "Port $PORT:   $( [ -n "$(listeners "$PORT")" ] && echo "IN USE by $(owner_of "$PORT")" || echo free)"
  echo "nginx -t:    $(nginx -t >/dev/null 2>&1 && echo ok || echo FAIL)"
  echo "DNS:         $DOMAIN → $(getent hosts "$DOMAIN" | awk '{print $1}')"
  echo "=== end ==="
  exit 0
fi

# ---------------------------------------------------------------- 0. pre-flight (no changes yet)
say "Pre-flight"
[ "$(uname -m)" = "x86_64" ] || die "This build is for x86_64 servers. Nothing changed."
if [ -n "$(listeners "$PORT")" ] && ! our_service_running; then
  die "Port $PORT is used by '$(owner_of "$PORT")'. Nothing changed. Re-run with: APP_PORT=3085 bash $0"
fi
[ "${P443:-$P80}" = "nginx" ] && command -v nginx >/dev/null 2>&1 \
  || die "Ports 80/443 are served by '${P443:-${P80:-nothing}}', not nginx. Nothing changed — send Claude this message."
nginx -t >/dev/null 2>&1 || die "Your current nginx config already fails 'nginx -t'. Nothing changed — fix that first."
ok "Checks passed (nginx serves 80/443, port $PORT free)"

# ---------------------------------------------------------------- 1. Node (private copy only if needed)
NODE="$(node_bin)"
if [ -z "$NODE" ]; then
  say "Installing a private Node.js $NODE_VERSION in $BASE/node (system untouched)"
  mkdir -p "$BASE/node"
  curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-x64.tar.xz" | tar -xJ -C "$BASE/node" --strip-components=1
  NODE="$BASE/node/bin/node"
fi
ok "Node: $("$NODE" -v)"

# ---------------------------------------------------------------- 2. user, folders
id seasoncard >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin seasoncard
mkdir -p "$DATA" /etc/seasoncard
chown seasoncard:seasoncard "$DATA"; chmod 700 "$DATA"

# ---------------------------------------------------------------- 3. app (ready-made build)
say "Downloading the ready-made app"
if [ -d "$APP/.git" ]; then
  git -C "$APP" fetch -q --depth 1 origin release && git -C "$APP" reset -q --hard origin/release
else
  git clone -q --depth 1 -b release "$REPO" "$APP"
fi
mkdir -p "$DATA/cache" && chown seasoncard:seasoncard "$DATA/cache"
mkdir -p "$APP/.next" && ln -sfn "$DATA/cache" "$APP/.next/cache"
ok "App version $(cat "$APP/VERSION" 2>/dev/null || echo '?')"

# ---------------------------------------------------------------- 4. config (secrets generated here, never in git)
if [ ! -f "$ENVF" ]; then
  CODE="$(tr -dc 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' </dev/urandom | head -c 8 || true)"
  umask 077
  cat > "$ENVF" <<EOF
NODE_ENV=production
PORT=$PORT
HOSTNAME=127.0.0.1
SITE_URL=https://$DOMAIN
SETTINGS_FILE=$DATA/settings.json
REPORT_TOKEN_SECRET=$(openssl rand -base64 48 | tr -d '\n/+=')
ADMIN_KEY=$(openssl rand -hex 32)
SETUP_CODE=${CODE:0:4}-${CODE:4:4}
EOF
  ok "Config written to $ENVF (root only)"
fi

# ---------------------------------------------------------------- 5. service (memory-capped, sandboxed)
cat > /etc/systemd/system/seasoncard.service <<EOF
[Unit]
Description=Season Card web app
After=network.target

[Service]
User=seasoncard
Group=seasoncard
WorkingDirectory=$APP
EnvironmentFile=$ENVF
ExecStart=$NODE $APP/server.js
Restart=always
RestartSec=3
Nice=5
MemoryMax=450M
CPUQuota=80%
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$DATA

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable seasoncard >/dev/null 2>&1
systemctl restart seasoncard
for i in $(seq 1 30); do curl -fs "http://127.0.0.1:$PORT/api/health" >/dev/null && break; sleep 1; done
curl -fs "http://127.0.0.1:$PORT/api/health" >/dev/null || die "App did not start (journalctl -u seasoncard -n 50). Your other sites were not touched."
ok "Season Card running privately on 127.0.0.1:$PORT (memory cap 450 MB)"

# ---------------------------------------------------------------- 6. nginx: ONE new file, tested before reload
say "Adding the nginx site for $DOMAIN"
if [ -d /etc/nginx/sites-available ]; then CONF=/etc/nginx/sites-available/seasoncard.conf; LINK=/etc/nginx/sites-enabled/seasoncard.conf
else CONF=/etc/nginx/conf.d/seasoncard.conf; LINK=""; fi
if [ ! -f "$CONF" ]; then
  BK="/root/nginx-backup-$(date +%Y%m%d-%H%M%S).tgz"
  tar czf "$BK" /etc/nginx 2>/dev/null && ok "Backup of /etc/nginx: $BK"
  cat > "$CONF" <<EOF
# Season Card — added by deploy/native-install.sh
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN www.$DOMAIN;
  client_max_body_size 2m;
  location / {
    proxy_pass http://127.0.0.1:$PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF
  [ -n "$LINK" ] && ln -sf "$CONF" "$LINK"
  if ! nginx -t >/dev/null 2>&1; then
    rm -f "$CONF" ${LINK:+"$LINK"}
    die "nginx test failed — new file removed, nginx NOT reloaded. Your sites are unaffected."
  fi
  systemctl reload nginx
  ok "nginx reloaded gracefully (no downtime for your other sites)"
else
  ok "nginx site already present"
fi

# ---------------------------------------------------------------- 7. HTTPS certificate for this domain only
if ! grep -q "ssl_certificate" "$CONF"; then
  command -v certbot >/dev/null 2>&1 || { apt-get install -y certbot python3-certbot-nginx >/dev/null; }
  if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect --keep-until-expiring; then
    nginx -t >/dev/null 2>&1 && systemctl reload nginx
    ok "HTTPS active for $DOMAIN"
  else
    warn "Certificate not issued yet (usually DNS). Re-run this script later; nothing else is affected."
  fi
else
  ok "HTTPS already configured"
fi

# ---------------------------------------------------------------- 8. next step
echo
if curl -fs "http://127.0.0.1:$PORT/api/health" | grep -q '"paypalConfigured":true'; then
  ok "PayPal already connected. Season Card is live: https://$DOMAIN"
else
  printf '\033[1;36m=====================================================\n'
  printf '  Season Card is installed.  Now connect PayPal:\n'
  printf '     https://%s/setup\n' "$DOMAIN"
  printf '  Setup code:  %s\n' "$(grep ^SETUP_CODE= "$ENVF" | cut -d= -f2)"
  printf '=====================================================\033[0m\n'
fi
echo "Updates later:  bash $BASE/deploy/native-update.sh"
echo "Remove fully:   systemctl disable --now seasoncard; rm -f $CONF ${LINK:-} /etc/systemd/system/seasoncard.service; nginx -t && systemctl reload nginx"
