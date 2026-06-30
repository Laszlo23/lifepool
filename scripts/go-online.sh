#!/usr/bin/env bash
# Start LifePool locally + public HTTPS tunnel (no ngrok interstitial).
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Starting Docker (web + keepers)…"
docker compose up -d --build

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Installing cloudflared…"
  brew install cloudflared
fi

echo ""
echo "Local:  http://localhost:8080"
echo "Starting Cloudflare tunnel (public URL in ~5s)…"
echo ""
exec cloudflared tunnel --url http://localhost:8080
