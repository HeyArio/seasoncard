#!/usr/bin/env bash
# Season Card bootstrap: clone (or update) into /opt/seasoncard, then run the safe installer.
set -euo pipefail
command -v git >/dev/null 2>&1 || apt-get install -y git
if [ -d /opt/seasoncard/.git ]; then git -C /opt/seasoncard pull --ff-only; else git clone https://github.com/samansalour93/seasoncard /opt/seasoncard; fi
cd /opt/seasoncard
bash deploy/install.sh --check
echo; read -rp "Install now? Your other sites stay untouched. (y/N): " yn
[ "${yn:-n}" = "y" ] && bash deploy/install.sh
