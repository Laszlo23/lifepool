#!/usr/bin/env bash
# Post-build steps for static / IPFS hosts (4EVERLAND, etc.)
set -euo pipefail

cp dist/index.html dist/ipfs-404.html
echo "✓ dist/ipfs-404.html (IPFS 404 fallback)"
