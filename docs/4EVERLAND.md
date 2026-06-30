# 4EVERLAND deployment

## Your domains

| Domain | Role |
|--------|------|
| `https://lifepool-e17s.ipfs.4everland.app` | Primary project URL |
| `https://lifepool-lmexdg6w-laszlo23.ipfs.4everland.app` | Latest deployment mirror |

A **404** on these URLs almost always means the build failed or nothing was pinned to IPFS yet — not a DNS problem.

---

## Recommended: GitHub Actions deploy (Node 20)

4EVERLAND’s built-in builder often runs **Node 14**, which cannot build Vite 8. Use GitHub Actions instead:

### 1. Get an auth token

1. [4EVERLAND Dashboard](https://dashboard.4everland.org) → connect wallet  
2. **Hosting → Auth Tokens** → create token  

### 2. Add GitHub secret

Repo → **Settings → Secrets and variables → Actions → New secret**

| Name | Value |
|------|-------|
| `EVER_TOKEN` | your 4EVERLAND auth token |

### 3. Push to `main`

Workflow [`.github/workflows/deploy-4everland.yml`](../.github/workflows/deploy-4everland.yml) will:

1. Build on **Node 20** with production `VITE_*` env vars  
2. Pin `./dist` to your **lifepool** project via `4everland/pin-action`  
3. Update the live IPFS deployment  

Check **Actions** tab on GitHub for build logs and the IPFS link.

---

## Alternative: 4EVERLAND dashboard build

If you prefer git-triggered builds inside 4EVERLAND:

| Setting | Value |
|---------|-------|
| Build command | `bash scripts/hosting-build.sh` |
| Output directory | `dist` |

Uses `vite build` only (no `tsc`) so hosting never fails on Node type checks.
| Framework | Vite (or Other) |

**Environment variables (required):**

```env
NODE_VERSION=20
VITE_CHAIN_ID=84532
VITE_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
VITE_APP_URL=https://lifepool-e17s.ipfs.4everland.app
VITE_B3OS_OPERATOR_ADDRESS=0xaaf620ee9e2a805323BF7363992E33e4412be3FB
```

If `NODE_VERSION=20` is missing, the build script exits immediately with a clear error instead of obscure Vite/Rolldown failures.

---

## After a successful deploy

- App: https://lifepool-e17s.ipfs.4everland.app  
- Deck: https://lifepool-e17s.ipfs.4everland.app/deck/  
- Verify on IPFS link in the 4EVERLAND deployment detail page  

`dist/ipfs-404.html` is generated at build time for IPFS gateway 404 fallback.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build log shows Node 14 | Set `NODE_VERSION=20` or use GitHub Actions deploy |
| `Cannot find name 'process'` | Pull latest `main` (fixed in `src/lib/env.ts`) |
| Site 404, build “success” | Wrong output dir — must be `dist`, not `/` |
| Pin action fails | Add `EVER_TOKEN` secret; project name must be `lifepool` |
| `eth_getLogs` errors in app | Use Alchemy/Infura RPC in `VITE_BASE_SEPOLIA_RPC_URL` |

---

## Limitations

`/api/*` serverless routes (Farcaster Frame, dynamic OG) do not run on static IPFS. The wallet app, faucet, mint, pool, and treasury UI work via Base Sepolia RPC.
