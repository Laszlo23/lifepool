#!/usr/bin/env bash
# Build wrapper for 4EVERLAND dashboard (fails fast with a clear message on old Node)
set -euo pipefail

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo ""
  echo "ERROR: Node 20+ required for Vite 8 (detected $(node -v))."
  echo "In 4EVERLAND → Settings → Environment Variables, add: NODE_VERSION=20"
  echo "Then redeploy. Or use GitHub Actions deploy (see docs/4EVERLAND.md)."
  echo ""
  exit 1
fi

npm install
npm run build
bash scripts/postbuild-hosting.sh
