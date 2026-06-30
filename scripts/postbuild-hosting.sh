#!/bin/sh
# Post-build steps for static / IPFS hosts (4EVERLAND, Docker, etc.)
set -eu

cp dist/index.html dist/ipfs-404.html
echo "✓ dist/ipfs-404.html (IPFS 404 fallback)"
