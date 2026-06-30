# Keeper agents (grid trading, harvest, oracle)

Automated jobs that keep the Base Sepolia treasury active for investor demos.

## What runs

| Keeper | Script | Action |
|--------|--------|--------|
| Oracle | `keeper-update-oracle.ts` | BTC/XRP prices on MockOracle from Binance |
| Rewards | `keeper-accrue-rewards.ts` | Grid-agent reward rate on RewardDistributor |
| Grid | `keeper-grid-copytrade.ts` | DCA into grid sleeve + harvest LIFEUR profits to followers |

`npm run keeper:all` runs all three in order. Individual scripts are available via `keeper:oracle`, `keeper:grid`, etc.

## Local

```bash
# .env must include KEEPER_PRIVATE_KEY + BASE_SEPOLIA_RPC_URL
npm run keeper:all
npm run keeper:grid    # grid DCA + profit harvest only
```

## GitHub Actions (24/7)

Workflow: [`.github/workflows/keepers.yml`](../.github/workflows/keepers.yml)

- **Schedule:** every 4 hours
- **Manual:** Actions → LifePool Keepers → Run workflow (all / grid / oracle)

### Required secrets

Repo → **Settings → Secrets → Actions**

| Secret | Description |
|--------|-------------|
| `KEEPER_PRIVATE_KEY` | Wallet that signs keeper txs (needs Base Sepolia ETH) |
| `BASE_SEPOLIA_RPC_URL` | Alchemy/Infura Base Sepolia RPC (recommended) |

The keeper wallet must hold enough **Sepolia ETH** on Base for gas. Fund via [Base faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet).

## Verify

```bash
npm run debug   # 37 on-chain health checks
```

Treasury activity appears in the app **Ops** tab and on [Basescan](https://sepolia.basescan.org/address/0xF2a9Bea846D5a6b7b974146441CB06b3D3ba9dc2).
