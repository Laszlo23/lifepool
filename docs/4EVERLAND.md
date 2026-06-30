# 4EVERLAND deployment

## Your domains

| Domain | Use |
|--------|-----|
| `https://lifepool-e17s.ipfs.4everland.app` | **Primary** — set `VITE_APP_URL` to this |
| `https://lifepool-gbudx64a-laszlo23.ipfs.4everland.app` | Per-deployment mirror (same build, auto-assigned) |

Both URLs are issued automatically by 4EVERLAND. You do not DNS-configure `*.ipfs.4everland.app` — they are ready once a deploy succeeds.

## Assign primary domain + env vars

1. Open [4EVERLAND Hosting](https://dashboard.4everland.org/hosting) → **lifepool** project.
2. **Settings → Environment Variables** — add or update:

```
VITE_CHAIN_ID=84532
VITE_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
VITE_APP_URL=https://lifepool-e17s.ipfs.4everland.app
VITE_B3OS_OPERATOR_ADDRESS=0xaaf620ee9e2a805323BF7363992E33e4412be3FB
```

3. **Settings → General** — confirm build:
   - Build command: `npm install && npm run build`
   - Output directory: `dist`
4. **Deployments** → **Redeploy** latest (or push to `main` on GitHub for auto-deploy).
5. **Settings → Domains** — the primary `lifepool-e17s…` URL should show as the production domain. The `lifepool-gbudx64a-laszlo23…` URL is tied to a specific deployment hash and updates each release.

## Custom domain (optional)

To use your own domain (e.g. `lifepool.xyz`):

1. Project → **Settings → Domains → Add Custom Domain**
2. Add the CNAME/TXT records 4EVERLAND shows at your DNS provider
3. After verification, set `VITE_APP_URL=https://yourdomain.com` and redeploy

## Investor links

- App: https://lifepool-e17s.ipfs.4everland.app
- Deck: https://lifepool-e17s.ipfs.4everland.app/deck/

## Limitations on IPFS static hosting

`/api/*` routes (Farcaster Frame webhook, dynamic OG image) do not run on static IPFS deploys. The wallet app, faucet, mint, pool, and treasury UI work fully via Base Sepolia RPC.
