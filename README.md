# LifePool

BTC/USDC grid trading + BTC stake on **Base Sepolia testnet**. LIFEUR stablecoin, cycle-locked pool membership, treasury ops, and investor demo UI.

## Quick start (local)

```bash
npm install
npm run dev
```

Open http://localhost:5173 — investor deck at `/deck/`.

## Deploy on 4EVERLAND

Connect this GitHub repo in [4EVERLAND Hosting](https://dashboard.4everland.org/hosting):

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Build command | `npm install && npm run build` |
| Output directory | `dist` |
| Root directory | `/` (repo root) |

**Environment variables** (required for wallet + RPC):

```
NODE_VERSION=20
VITE_CHAIN_ID=84532
VITE_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
VITE_APP_URL=https://lifepool-e17s.ipfs.4everland.app
VITE_B3OS_OPERATOR_ADDRESS=0xaaf620ee9e2a805323BF7363992E33e4412be3FB
```

**Live URLs**

| URL | Role |
|-----|------|
| https://lifepool-e17s.ipfs.4everland.app | Primary project domain |
| https://lifepool-gbudx64a-laszlo23.ipfs.4everland.app | Deployment-specific mirror |

Set `VITE_APP_URL` to the primary domain in 4EVERLAND → Settings → Environment Variables, then redeploy.

See [docs/INVESTOR_DEMO.md](docs/INVESTOR_DEMO.md) for the investor walkthrough.

> **Note:** `/api/*` serverless routes (Frame, treasury API) require Vercel or similar. The static app + on-chain reads work fully on 4EVERLAND IPFS.

## Scripts

```bash
npm run test              # lint, build, contracts, backtest, on-chain debug
npm run contracts:test    # Foundry tests
npm run debug             # live health check vs Base Sepolia
npm run backtest          # strategy backtest
```

## Contracts

Deployed on Base Sepolia — addresses in [`deployments/base-sepolia.json`](deployments/base-sepolia.json).

[Treasury on Basescan](https://sepolia.basescan.org/address/0xF2a9Bea846D5a6b7b974146441CB06b3D3ba9dc2)
