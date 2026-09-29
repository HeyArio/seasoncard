#!/usr/bin/env bash
# Season Card bootstrap: get the scripts into /opt/seasoncard, show the read-only check, then install on "y".
set -euo pipefail
command -v git >/dev/null 2>&1 || apt-get install -y git
if [ -d /opt/seasoncard/.git ]; then git -C /opt/seasoncard pull -q --ff-only; else git clone -q --depth 1 https://github.com/samansalour93/seasoncard /opt/seasoncard; fi
bash /opt/seasoncard/deploy/native-install.sh --check
echo; read -rp "Install now? Your other sites stay untouched. (y/N): " yn
[ "${yn:-n}" = "y" ] && bash /opt/seasoncard/deploy/native-install.sh
