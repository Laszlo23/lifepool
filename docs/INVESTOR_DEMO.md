# Investor demo — go live in ~30 minutes

You already have **contracts on Base Sepolia** and a **seeded treasury** (~$1.4M demo USDC NAV, grid sleeve, live DCA). This guide gets you a **public HTTPS URL** to share.

## What investors will see

| URL | Purpose |
|-----|---------|
| `https://<your-app>.vercel.app` | Live mobile app (faucet → join → dashboard) |
| `https://<your-app>.vercel.app/deck/` | Investor slide deck |
| [Treasury on Basescan](https://sepolia.basescan.org/address/0xF2a9Bea846D5a6b7b974146441CB06b3D3ba9dc2) | On-chain proof |

**Disclaimer:** Frame everything as **Base Sepolia testnet prototype** — not regulated insurance, not mainnet funds.

---

## Step 1 — GitHub repo (recommended)

```bash
cd lifeinsurance
git init
git add .
git commit -m "LifePool investor demo"
gh repo create lifepool-demo --private --source=. --push
```

Use a **private** repo. Never commit `.env` (already in `.gitignore`).

---

## Step 2 — Deploy on Vercel

### Option A: Vercel CLI (fastest)

```bash
npm i -g vercel   # if needed
vercel login
vercel link
vercel env add VITE_CHAIN_ID production          # 84532
vercel env add VITE_BASE_SEPOLIA_RPC_URL production   # your RPC URL
vercel env add VITE_APP_URL production           # set after first deploy, then redeploy
vercel env add BASE_SEPOLIA_RPC_URL production   # same RPC for /api routes
vercel --prod
```

Copy the production URL (e.g. `https://lifepool-xyz.vercel.app`), then:

```bash
vercel env add VITE_APP_URL production   # paste full https URL
vercel --prod                            # redeploy so Frame meta uses correct URL
```

### Option B: Vercel dashboard

1. [vercel.com/new](https://vercel.com/new) → Import GitHub repo
2. Framework: **Vite**
3. Build: `npm run build` · Output: `dist`
4. Environment variables (Production):

| Variable | Value |
|----------|-------|
| `VITE_CHAIN_ID` | `84532` |
| `VITE_BASE_SEPOLIA_RPC_URL` | Alchemy/Infura Base Sepolia URL (recommended) |
| `BASE_SEPOLIA_RPC_URL` | same as above |
| `VITE_APP_URL` | your `https://….vercel.app` |
| `VITE_B3OS_OPERATOR_ADDRESS` | `0xaaf620ee9e2a805323BF7363992E33e4412be3FB` |

**Do not** add `KEEPER_PRIVATE_KEY` or `DEPLOYER_PRIVATE_KEY` to Vercel unless you run keepers from serverless (use GitHub Actions instead).

---

## Step 3 — Better RPC for demos

Public `https://sepolia.base.org` rate-limits `eth_getLogs`. For investor demos use a free **Alchemy** or **Infura** Base Sepolia endpoint.

---

## Step 4 — Keep treasury “alive” (optional)

GitHub Actions runs keepers every 6h if you add repo secrets:

- `KEEPER_PRIVATE_KEY`
- `BASE_SEPOLIA_RPC_URL`

Workflow: `.github/workflows/keepers.yml` → `npm run keeper:all`

---

## Step 5 — 5-minute investor walkthrough

1. **Deck** (`/deck/`) — problem, LIFEUR, grid agent, 4y cycle, testnet status
2. **App** — open on phone; connect MetaMask on **Base Sepolia**
3. **Faucet** — claim tUSDC / LIFEUR (24h cooldown per wallet)
4. **Onboarding** — tier → mint (optional) → join pool onchain
5. **Dashboard** — onchain balance + cycle lock; **Live Flow** for yield story (labeled simulated)
6. **Ops tab** — treasury deposit, live activity feed
7. **Yield tab** — grid copy-trade panel, 81% win-rate narrative
8. **Basescan** — show TreasuryVault NAV matching the app

### Investor wallet prep

- Add **Base Sepolia** network in MetaMask
- Get Sepolia ETH: [Base faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
- Use app **Faucet** for tUSDC / LIFEUR

---

## Step 6 — Custom domain (optional)

Vercel → Project → Domains → e.g. `demo.lifepool.xyz`  
Update `VITE_APP_URL` and redeploy.

---

## Pre-demo checklist

```bash
npm run test          # lint + build + contracts + backtest + on-chain debug
```

- [ ] Production URL loads on mobile
- [ ] Wallet connects on Base Sepolia
- [ ] Faucet claim works
- [ ] Treasury activity feed loads (chunked logs fix)
- [ ] Basescan treasury shows recent txs
- [ ] Deck `/deck/` opens

---

## Talking points

- **EUR stablecoin gap** — LIFEUR minted against BTC/XRP collateral (testnet mocks)
- **Winning grid agent** — BTC/USDC swing grid; backtest + live treasury DCA
- **4y · 4m · 4d cycle** — enforced onchain in `LifePoolVault`
- **Transparency** — treasury, rewards, and membership verifiable on Basescan
- **Roadmap** — mainnet, Chainlink oracles, fiat rails, App Store
