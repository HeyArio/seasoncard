#!/usr/bin/env bash
# Season Card — pull the newest ready-made release and restart. Touches nothing else.
set -euo pipefail
APP=/opt/seasoncard-app
PORT="$(grep ^PORT= /etc/seasoncard/env | cut -d= -f2)"
git -C /opt/seasoncard pull -q --ff-only || true
OLD="$(cat "$APP/VERSION" 2>/dev/null || echo none)"
git -C "$APP" fetch -q --depth 1 origin release
git -C "$APP" reset -q --hard origin/release
ln -sfn /var/lib/seasoncard/cache "$APP/.next/cache"
NEW="$(cat "$APP/VERSION" 2>/dev/null || echo none)"
systemctl restart seasoncard
for i in $(seq 1 30); do curl -fs "http://127.0.0.1:${PORT:-3080}/api/health" >/dev/null && break; sleep 1; done
curl -fs "http://127.0.0.1:${PORT:-3080}/api/health" && echo && echo "Updated $OLD -> $NEW"
