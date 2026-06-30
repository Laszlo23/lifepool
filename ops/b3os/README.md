# LifePool × B3OS Treasury Automation

Wire [B3OS](https://b3os.org/workflows) as the **treasury ops control plane** while members keep signing their own txs in the LifePool app.

## Architecture

| Layer | Tool | Responsibility |
|-------|------|----------------|
| Members | wagmi + LifePool app | `join()`, LIFEUR cycle lock, dashboard |
| Pool rules | `LifePoolVault.sol` | 4y·4m·4d lock, membership |
| Treasury | `TreasuryVault.sol` | USDC premiums, grid/stake sleeves, harvest |
| Operator | B3OS org wallet | DCA, harvest, oracle, reward rate |
| Signal | `GET /api/ops/signal` | Regime, grid %, DCA multiplier |

## Setup (B3OS)

1. Create org at [b3os.org](https://b3os.org/workflows)
2. **Wallet Management** → create `lifepool-treasury-operator`
3. Fund with Base Sepolia ETH
4. Copy wallet address → set as `TreasuryVault.operator` onchain:
   ```bash
   cast send $TREASURY "setOperator(address)" $B3OS_WALLET --rpc-url $RPC --private-key $DEPLOYER_KEY
   ```
5. Import workflows from `ops/b3os/workflows/` (or recreate from specs below)
6. Set B3OS env vars:
   - `LIFEPOOL_URL` — your deployed app (for `/api/ops/signal` and `/api/ops/treasury`)
   - `TREASURY_VAULT_ADDRESS` — from `deployments/base-sepolia.json`

### Member wallet vs B3OS operator wallet

| Action | Wallet | Shows in B3OS dashboard? |
|--------|--------|--------------------------|
| Faucet claim, join pool | **Your** MetaMask | No |
| Deposit tUSDC premium | **Your** MetaMask | No (shows in LifePool Ops activity feed) |
| DCA, harvest, oracle | **B3OS operator** wallet | Yes — after workflow runs |

For demos, import **`treasury-manual-demo.json`** (webhook trigger) instead of waiting for monthly cron.

Local fallback (same txs, bypasses B3OS UI history):

```bash
npm run keeper:all
```

View operator activity: [BaseScan operator wallet](https://sepolia.basescan.org/address/0xaaf620ee9e2a805323BF7363992E33e4412be3FB) or LifePool **Ops tab → On-chain activity**.

### 5. Grid copy-trade (hourly)
- **Trigger:** `0 * * * *`
- **Steps:**
  1. HTTP GET `/api/ops/grid-strategy`
  2. `evm-write` → `setGridAllocationBps` from live regime
  3. `evm-write` → `executeDca` per signal
  4. `evm-write` → `harvestToRewards` → members mirror via RewardDistributor

Import `grid-copytrade.json` for automated copy-trade mirroring.

## Wallet stack

| Wallet | Role | Signs |
|--------|------|-------|
| Member (MetaMask) | Join, premium, claim | `join`, `depositPremium`, `claim` |
| TreasuryVault | Capital | Holds USDC + BTC sleeves |
| Grid operator (B3OS) | Master copy-trade | DCA, rebalance, harvest |
| LifePoolVault | Cycle lock | Membership stakes |
| RewardDistributor | Yield payout | Pro-rata to followers |

## Workflows

### 1. Oracle keeper (every 6h)
- **Trigger:** Recurring schedule `0 */6 * * *`
- **Steps:**
  1. HTTP GET Binance BTC + XRP prices
  2. JS transform → EUR prices
  3. `evm-write` → `MockOracle.setPrice(tWBTC, price)`
  4. `evm-write` → `MockOracle.setPrice(tXRP, price)`

### 2. Reward rate (daily)
- **Trigger:** `0 8 * * *`
- **Steps:**
  1. HTTP GET `/api/ops/signal` (your deployed LifePool URL)
  2. Policy: `rewardRateBps <= 5000`
  3. `evm-write` → `RewardDistributor.setRewardRateBps(signal.rewardRateBps)`

### 3. Treasury DCA (monthly)
- **Trigger:** `0 9 1 * *` (1st of month 09:00 UTC)
- **Steps:**
  1. HTTP GET `/api/ops/signal`
  2. `evm-read` → `TreasuryVault.treasuryNav()`
  3. Policy: premium balance ≥ suggested DCA
  4. `evm-write` → `TreasuryVault.setGridAllocationBps(signal.gridAllocationBps)`
  5. `evm-write` → `TreasuryVault.executeDca(amount, gridBps)`

### 4. Treasury harvest (weekly)
- **Trigger:** `0 10 * * 1`
- **Steps:**
  1. HTTP GET `/api/ops/signal`
  2. `evm-read` → LIFEUR balance of TreasuryVault
  3. `evm-write` → `TreasuryVault.harvestToRewards(amount)`

## Local keepers (fallback)

Without B3OS, run the same logic locally:

```bash
export KEEPER_PRIVATE_KEY=0x...
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

npm run keeper:all          # oracle + rewards + DCA + harvest
npm run keeper:treasury-dca
npm run keeper:treasury-harvest
```

GitHub Actions runs `keeper:all` on cron when secrets are configured.

## Contract addresses

After deploy, see `deployments/base-sepolia.json`:

- `TreasuryVault` — treasury wallet target
- `tUSDC` — premium asset (testnet)
- `RewardDistributor` — harvest destination

## Mainnet path

1. Deploy to Base mainnet (8453)
2. Replace `MockOracle` with Chainlink feeds
3. Replace `tUSDC` with native USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
4. Use B3OS `0x-swap` for real BTC/USDC grid execution instead of sleeve accounting
