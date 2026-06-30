#!/usr/bin/env bash
# Deploy LifePool contracts and write deployments/base-sepolia.json
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/contracts"

RPC="${BASE_SEPOLIA_RPC_URL:-http://127.0.0.1:8545}"
PK="${DEPLOYER_PRIVATE_KEY:-0xac0974bec39a17e36ba4b6b40d6ef922d820d4fe84aa29c03545f8e3521b98}"

echo "Deploying to $RPC ..."
OUTPUT=$(forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC" \
  --broadcast \
  --private-key "$PK" \
  2>&1)

echo "$OUTPUT"

extract() {
  echo "$OUTPUT" | grep "$1" | tail -1 | awk '{print $2}'
}

LIFE_EUR=$(extract "LifeEUR")
ORACLE=$(extract "MockOracle")
TWBTC=$(extract "tWBTC")
TUSDC=$(extract "tUSDC")
TXRP=$(extract "tXRP")
VAULT=$(extract "CollateralVault")
POOL=$(extract "LifePoolVault")
TREASURY=$(extract "TreasuryVault")
REWARDS=$(extract "RewardDistributor")
FAUCET=$(extract "LifePoolFaucet")

CHAIN_ID="${CHAIN_ID:-84532}"
if [[ "$RPC" == *"127.0.0.1"* ]]; then
  CHAIN_ID=31337
fi

mkdir -p "$ROOT/deployments"
cat > "$ROOT/deployments/base-sepolia.json" <<EOF
{
  "chainId": $CHAIN_ID,
  "network": "base-sepolia",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "contracts": {
    "LifeEUR": "$LIFE_EUR",
    "MockOracle": "$ORACLE",
    "tUSDC": "$TUSDC",
    "tWBTC": "$TWBTC",
    "tXRP": "$TXRP",
    "CollateralVault": "$VAULT",
    "LifePoolVault": "$POOL",
    "TreasuryVault": "$TREASURY",
    "RewardDistributor": "$REWARDS",
    "LifePoolFaucet": "$FAUCET"
  }
}
EOF

echo "Wrote deployments/base-sepolia.json"
cat "$ROOT/deployments/base-sepolia.json"
