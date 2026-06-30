# CDP Paymaster (gasless Smart Wallet txs)

LifePool sponsors gas for **Coinbase Smart Wallet** and **Base Smart Wallet** users on Base Sepolia via the [CDP Paymaster](https://portal.cdp.coinbase.com/products/bundler-and-paymaster).

## Quick setup

1. Open [CDP Portal → Paymaster](https://portal.cdp.coinbase.com/products/bundler-and-paymaster).
2. Select **Base Sepolia** and copy your **Paymaster & Bundler endpoint**.
3. Add to `.env` (server-side only):

```bash
CDP_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base-sepolia/YOUR_CDP_API_KEY
VITE_PAYMASTER_ENABLED=true
```

4. **Allowlist contracts** in the CDP portal (Configuration → Contract allowlist):

| Contract | Address (Base Sepolia) | Methods |
|----------|------------------------|---------|
| LifePoolFaucet | `0xDbb8dDcf2c9b03A1d64B2284C0Aa0971FBB7ce2E` | `claim` |
| LifeEUR | `0x42355c509743a92EBD6F2F7259D4f677Eca18b4d` | `approve` |
| LifePoolVault | `0x7DE24AB7CB9b2F88669aFDBDe38Af81bf0B00374` | `join`, `withdraw` |
| CollateralVault | `0xfe9B0a7F2D7ec12865aD772Bf19F86d7A5a15D6C` | `depositCollateral`, `mintLifeEur`, `repayLifeEur`, `withdrawCollateral` |
| RewardDistributor | `0x5f774c73EbcD9cB9De4341E20C1810ad9E5aa101` | `claim` |
| tUSDC | `0xAAE3Eb068026cab39A841c2628F983C559AD6C10` | `approve` |
| tWBTC | `0x77fBFbFA3d98f6Cc48249C1050127f15aC7D0DAa` | `approve` |
| tXRP | `0x2dB46F644703536B2280c9F0B03989c19a69497B` | `approve` |

5. Deploy the paymaster **proxy** so the CDP API key never reaches the browser.

## Where the proxy runs

| Host | Proxy route |
|------|-------------|
| `npm run dev` | Vite dev server proxies `/api/paymaster` → `CDP_PAYMASTER_URL` |
| Docker (`docker compose up`) | nginx → `paymaster` service on port 8787 |
| Vercel | `api/paymaster.ts` (set `CDP_PAYMASTER_URL` in Vercel env) |
| 4EVERLAND / IPFS (static) | Set `VITE_PAYMASTER_PROXY_URL` to your Vercel URL, e.g. `https://lifepool.vercel.app/api/paymaster` |

## Local dev

```bash
# Terminal 1 — optional if not using Vite proxy
npm run paymaster:proxy

# Terminal 2
npm run dev
```

Connect with **Coinbase Smart Wallet** or **Base Smart Wallet**. When paymaster is active, the wallet panel shows a **Gasless** badge and faucet/join/mint txs are batched via `sendCalls` with sponsored gas.

## Vercel env vars

```
CDP_PAYMASTER_URL=...
VITE_PAYMASTER_ENABLED=true
VITE_APP_URL=https://your-deployment.vercel.app
```

For static IPFS builds, also set:

```
VITE_PAYMASTER_PROXY_URL=https://your-deployment.vercel.app/api/paymaster
```

## Security

- Never prefix `CDP_PAYMASTER_URL` with `VITE_`.
- Set `PAYMASTER_ALLOWED_ORIGINS` to your deployed app URLs (comma-separated).
- CDP allowlists are your second line of defense — only LifePool contracts should be sponsored.
- The proxy now enforces origin allowlist, rate limits, and JSON-RPC validation — see [`docs/SECURITY.md`](./SECURITY.md).
- Add user authentication before mainnet.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Paymaster not available" | Use Coinbase/Base Smart Wallet (not MetaMask extension) |
| 503 from `/api/paymaster` | Set `CDP_PAYMASTER_URL` on server |
| Sponsorship rejected | Add contract + method to CDP allowlist |
| IPFS site, no gasless | Point `VITE_PAYMASTER_PROXY_URL` at Vercel proxy |

Test the proxy:

```bash
curl -X POST http://localhost:5173/api/paymaster \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"pm_getPaymasterStubData","params":[{},{},"0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789","84532"]}'
```
