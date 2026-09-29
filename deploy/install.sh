#!/usr/bin/env bash
# Season Card — safe install / update for a VPS that ALREADY hosts other websites.
#
#   bash deploy/install.sh --check   → read-only report. Changes NOTHING. Run this first.
#   bash deploy/install.sh           → install / update Season Card (no questions; PayPal is connected
#                                      afterwards in the browser at https://seasoncard.app/setup)
#   git pull && bash deploy/install.sh   → later updates
#
# Safety rules this script follows:
#   * never stops, restarts or edits other containers, services or sites
#   * the app only listens on 127.0.0.1:${APP_PORT:-3080} (not public)
#   * never binds ports 80/443 if anything already uses them
#   * nginx: backs up /etc/nginx first, adds ONE new file (seasoncard.conf), and reloads only
#     after `nginx -t` passes; if the test fails the new file is removed and nothing is reloaded
#   * any other web server on 80/443 (Caddy, Apache, Traefik, Docker proxy): no changes, it prints
#     the 3 lines to add yourself
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
ENV_FILE="$ROOT/.env"
APP_PORT="${APP_PORT:-3080}"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$ROOT/deploy/docker-compose.yml")

say()  { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;35m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

get_env() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- || true; }
set_env() {
  if grep -qE "^$1=" "$ENV_FILE"; then sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"; else echo "$1=$2" >> "$ENV_FILE"; fi
}
listeners() { $SUDO ss -ltnpH 2>/dev/null | grep -E "[:.]$1\s" || true; }
owner_of() { listeners "$1" | grep -oE 'users:\(\("[^"]+"' | head -1 | sed 's/users:(("//'; }
mem_avail_mb() { awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo; }
seasoncard_running() { docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^seasoncard-app-1$' ; }

# ---------------------------------------------------------------- read-only check
if [ "${1:-}" = "--check" ]; then
  echo "=== Season Card pre-install check (read-only, nothing is changed) ==="
  echo "OS:            $(. /etc/os-release 2>/dev/null; echo "${PRETTY_NAME:-unknown}")"
  echo "CPU cores:     $(nproc)"
  echo "RAM free:      $(mem_avail_mb) MB available of $(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo) MB"
  echo "Swap:          $(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo) MB"
  echo "Disk free:     $(df -h / | awk 'NR==2 {print $4}') on /"
  echo "Docker:        $(docker --version 2>/dev/null || echo 'not installed')"
  echo "Compose:       $(docker compose version 2>/dev/null || echo 'not installed')"
  echo "Port 80 owner: $(owner_of 80 || true)"
  echo "Port 443 owner:$(owner_of 443 || true)"
  echo "Port $APP_PORT:     $( [ -n "$(listeners "$APP_PORT")" ] && echo "IN USE by $(owner_of "$APP_PORT")" || echo free)"
  for s in nginx caddy apache2 httpd traefik; do command -v "$s" >/dev/null 2>&1 && echo "Installed:     $s"; done
  [ -d /etc/nginx/sites-enabled ] && echo "nginx sites:   $(ls /etc/nginx/sites-enabled | tr '\n' ' ')"
  [ -d /etc/nginx/conf.d ] && echo "nginx conf.d:  $(ls /etc/nginx/conf.d 2>/dev/null | tr '\n' ' ')"
  command -v docker >/dev/null 2>&1 && echo "Containers:    $(docker ps --format '{{.Names}} ({{.Ports}})' 2>/dev/null | tr '\n' ';')"
  echo "DNS seasoncard.app → $(getent hosts seasoncard.app | awk '{print $1}')   this server → $(curl -fs4 https://api.ipify.org || echo '?')"
  echo "=== end of check ==="
  exit 0
fi

# ---------------------------------------------------------------- 0. pre-flight (no changes yet)
say "Pre-flight checks"
if [ -n "$(listeners "$APP_PORT")" ] && ! seasoncard_running; then
  die "Port $APP_PORT is already used by '$(owner_of "$APP_PORT")'. Nothing was changed. Re-run with another port, e.g.: APP_PORT=3085 bash deploy/install.sh"
fi
P80="$(owner_of 80)"; P443="$(owner_of 443)"
if [ -z "$P80" ] && [ -z "$P443" ]; then MODE=caddy
elif [ "${P443:-$P80}" = "nginx" ] && command -v nginx >/dev/null 2>&1; then MODE=nginx
else MODE=manual
fi
ok "HTTPS mode: $MODE (ports 80/443 used by: ${P80:-nothing}/${P443:-nothing})"
MEM="$(mem_avail_mb)"
if [ "$MEM" -lt 1200 ]; then
  warn "Only ${MEM} MB RAM free. The build runs at low priority but may slow other sites for a few minutes."
fi

# ---------------------------------------------------------------- 1. Docker
if ! command -v docker >/dev/null 2>&1; then
  say "Installing Docker (does not touch existing websites)"
  curl -fsSL https://get.docker.com | $SUDO sh
fi
docker compose version >/dev/null 2>&1 || die "Docker Compose plugin missing (apt install docker-compose-plugin). Nothing else was changed."
ok "Docker ready"

# ---------------------------------------------------------------- 2. .env (no PayPal keys here; they are entered on /setup)
if [ ! -f "$ENV_FILE" ]; then
  say "Creating configuration (secrets generated on this server)"
  CODE="$(tr -dc 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' </dev/urandom | head -c 8)"
  umask 077
  cat > "$ENV_FILE" <<EOF
DOMAIN=${DOMAIN:-seasoncard.app}
SITE_URL=https://${DOMAIN:-seasoncard.app}
CERT_EMAIL=${CERT_EMAIL:-}
APP_PORT=$APP_PORT
REPORT_TOKEN_SECRET=$(openssl rand -base64 48 | tr -d '\n/+=')
ADMIN_KEY=$(openssl rand -hex 32)
SETUP_CODE=${CODE:0:4}-${CODE:4:4}
EOF
  ok ".env written (only root can read it)"
fi
DOMAIN="$(get_env DOMAIN)"; ADMIN_KEY="$(get_env ADMIN_KEY)"; CERT_EMAIL="$(get_env CERT_EMAIL)"
APP_PORT="$(get_env APP_PORT)"; APP_PORT="${APP_PORT:-3080}"; export APP_PORT

# ---------------------------------------------------------------- 3. build (low priority) + start
say "Building Season Card (low CPU priority, so your other sites stay responsive)"
export GIT_SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo dev)"
nice -n 15 "${COMPOSE[@]}" build app
"${COMPOSE[@]}" up -d app
for i in $(seq 1 60); do curl -fs "http://127.0.0.1:$APP_PORT/" >/dev/null && break; sleep 2; done
curl -fs "http://127.0.0.1:$APP_PORT/" >/dev/null || die "App did not start. Your other sites were not touched. Logs: ${COMPOSE[*]} logs app"
ok "App running privately on 127.0.0.1:$APP_PORT"

# ---------------------------------------------------------------- 4. HTTPS
case "$MODE" in
  caddy)
    say "Ports 80/443 are free — starting Caddy for automatic HTTPS"
    "${COMPOSE[@]}" --profile caddy up -d caddy
    ok "Caddy serving https://$DOMAIN"
    ;;
  nginx)
    say "Adding ONE nginx site for $DOMAIN (existing sites untouched)"
    BK="/root/nginx-backup-$(date +%Y%m%d-%H%M%S).tgz"
    $SUDO tar czf "$BK" /etc/nginx && ok "Backup of /etc/nginx saved to $BK"
    if [ -d /etc/nginx/sites-available ]; then CONF=/etc/nginx/sites-available/seasoncard.conf; LINK=/etc/nginx/sites-enabled/seasoncard.conf
    else CONF=/etc/nginx/conf.d/seasoncard.conf; LINK=""; fi
    if [ ! -f "$CONF" ]; then
      $SUDO tee "$CONF" >/dev/null <<EOF
# Season Card — added by deploy/install.sh
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN www.$DOMAIN;
  client_max_body_size 2m;
  location / {
    proxy_pass http://127.0.0.1:$APP_PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF
      [ -n "$LINK" ] && $SUDO ln -sf "$CONF" "$LINK"
    fi
    if ! $SUDO nginx -t; then
      $SUDO rm -f "$CONF" ${LINK:+"$LINK"}
      die "nginx config test failed — the new file was removed and nginx was NOT reloaded. Your sites are unaffected."
    fi
    $SUDO systemctl reload nginx
    ok "nginx reloaded (graceful — no downtime for existing sites)"
    if ! command -v certbot >/dev/null 2>&1; then $SUDO apt-get install -y certbot python3-certbot-nginx; fi
    if $SUDO certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos $( [ -n "$CERT_EMAIL" ] && echo "-m $CERT_EMAIL" || echo "--register-unsafely-without-email" ) --redirect --keep-until-expiring; then
      ok "HTTPS certificate installed for $DOMAIN"
    else
      warn "certbot could not get a certificate yet (usually DNS). Re-run this script later — nothing else is affected."
    fi
    $SUDO nginx -t && $SUDO systemctl reload nginx
    ;;
  manual)
    warn "Ports 80/443 are served by '${P443:-$P80}', not nginx. I did NOT touch it."
    echo "   Add this site to that server yourself (or send me the output of --check):"
    echo "     $DOMAIN, www.$DOMAIN  →  reverse proxy to http://127.0.0.1:$APP_PORT"
    ;;
esac

# ---------------------------------------------------------------- 5. PayPal: connected in the browser
if curl -fs "http://127.0.0.1:$APP_PORT/api/health" | grep -q '"paypalConfigured":true'; then
  ok "PayPal already connected"
else
  echo
  printf '\033[1;36m=====================================================\n'
  printf '  Now connect PayPal in your normal browser:\n'
  printf '     https://%s/setup\n' "$DOMAIN"
  printf '  Setup code:  %s\n' "$(get_env SETUP_CODE)"
  printf '=====================================================\033[0m\n'
fi

echo
ok "Done. Season Card: https://$DOMAIN"
echo "   Logs:      ${COMPOSE[*]} logs -f app"
echo "   Remove it completely (other sites unaffected):  ${COMPOSE[*]} down && rm -f /etc/nginx/sites-enabled/seasoncard.conf /etc/nginx/sites-available/seasoncard.conf /etc/nginx/conf.d/seasoncard.conf && nginx -t && systemctl reload nginx"
