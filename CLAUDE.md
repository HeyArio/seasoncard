# Season Card — instructions for Claude Code running on the production VPS

You are installing/operating **Season Card** (Next.js app in this repo) on a VPS that ALREADY hosts
TWO live websites for the owner (Saman). Those sites must never go down or change.

## Hard safety rules (never break these)
1. Never stop, restart, remove, rebuild or edit any container, service, site config or file that is
   not Season Card's. Season Card owns only: this repo folder, the Docker project `seasoncard`
   (container `seasoncard-app-1`, optional `seasoncard-caddy-1`), and one nginx file
   `seasoncard.conf` (in sites-available/sites-enabled or conf.d).
2. Never run: `docker system prune`, `docker compose down` outside `deploy/`, `docker rm`/`stop` on other
   containers, `systemctl restart nginx` (use `reload` only, and only after `nginx -t` passes),
   `apt upgrade`, `ufw` changes, firewall changes, or anything touching ports 80/443 owners.
3. Always run `bash deploy/install.sh --check` first and show Saman the output before installing.
4. Before any change to a web server, back it up (the installer does this for nginx) and explain in one
   line what you will change. If the web server is not nginx (e.g. Caddy/Apache/Traefik/Docker proxy),
   propose the exact snippet and wait for Saman's OK.
5. Secrets: `.env` holds generated secrets; PayPal keys live in the `seasoncard-data` volume (settings.json). Never print it, never commit it, never
   paste secret values into chat. Saman types PayPal keys into the installer prompts himself.
6. After install, verify BOTH existing sites still answer exactly as before (curl their domains with
   `-I` before and after, compare status codes) and report.

## How to install
```bash
bash deploy/install.sh --check     # read-only report
bash deploy/install.sh             # no questions: builds, adds HTTPS, prints the /setup URL + setup code
# Then Saman opens https://seasoncard.app/setup in his browser, enters the code + PayPal keys;
# the app verifies them with PayPal and registers the webhook itself.
```
Updates later: `git pull && bash deploy/install.sh`.

## Facts
- Domain: seasoncard.app (+ www) → A records to this server (202.133.91.247), DNS at Vercel.
- App listens on 127.0.0.1:${APP_PORT:-3080} only.
- PayPal webhook is registered automatically via `/api/admin/setup` (x-admin-key from .env).
- Revenue summary: `curl -s http://127.0.0.1:3080/api/admin/summary -H "x-admin-key: $(grep ^ADMIN_KEY= .env | cut -d= -f2)"`
- Full removal (other sites unaffected) is printed at the end of install.sh.
