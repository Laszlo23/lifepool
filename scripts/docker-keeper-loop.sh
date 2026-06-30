#!/usr/bin/env bash
# Long-running keeper loop for Docker / VPS deploys.
set -euo pipefail

INTERVAL="${KEEPER_INTERVAL_SEC:-14400}"

if [ -z "${KEEPER_PRIVATE_KEY:-}" ]; then
  echo "ERROR: KEEPER_PRIVATE_KEY is required"
  exit 1
fi

echo "LifePool keeper agent — interval ${INTERVAL}s"
echo "RPC: ${BASE_SEPOLIA_RPC_URL:-${VITE_BASE_SEPOLIA_RPC_URL:-default}}"

while true; do
  echo ""
  echo "=== $(date -u +"%Y-%m-%dT%H:%M:%SZ") ==="
  npm run keeper:all || echo "⚠ keeper cycle had errors — retrying after sleep"
  echo "Sleeping ${INTERVAL}s…"
  sleep "$INTERVAL"
done
