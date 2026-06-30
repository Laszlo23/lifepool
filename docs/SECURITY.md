# Security notes

LifePool is a **Base Sepolia testnet proof of concept**. This document covers known risks and how to harden deployments.

## Secrets

| Variable | Where | Rule |
|----------|-------|------|
| `CDP_PAYMASTER_URL` | Server only | Never `VITE_` prefix |
| `KEEPER_PRIVATE_KEY` | Server / CI / Docker | Never commit; rotate if exposed |
| `DEPLOYER_PRIVATE_KEY` | Deploy scripts only | Testnet keys only in repo scripts |
| `.env` | Local | Gitignored — verify with `git status` before push |

If `.env` was ever committed or shared, **rotate all private keys** and CDP API keys immediately.

## Paymaster proxy

The paymaster proxy (`api/paymaster.ts`, `scripts/paymaster-proxy.mjs`) forwards JSON-RPC to CDP.

**Hardening in place:**
- Origin allowlist (`PAYMASTER_ALLOWED_ORIGINS`, `VITE_APP_URL`)
- Rate limit (~30 req/min per IP)
- JSON-RPC validation (`pm_*`, `eth_*` methods only)
- Max body size 32 KB
- CORS restricted to allowed origins (not `*`)

**Before production mainnet:**
- Add user authentication
- Persistent rate limiting (Redis)
- Log and alert on abuse
- Keep CDP contract allowlists minimal

## Client-side trust

- `localStorage` member profile is **not cryptographically verified** — anyone can edit it. Onchain membership (`LifePoolVault.membershipOf`) is the source of truth for pool status.
- Simulated yields and cover amounts are **not onchain** — clearly labeled in UI.

## API routes

| Route | Auth | Risk |
|-------|------|------|
| `/api/paymaster` | Origin + rate limit | Gas credit spend |
| `/api/ops/*` | None | Read-only chain/signal data |
| `/api/frame` | None | Public Frame HTML |

## Dependency surface

- Smart wallet SDKs (`@coinbase/wallet-sdk`, `@base-org/account`) handle key material
- Binance public API used for price signals (no keys in client)

See also [`docs/PAYMASTER.md`](./PAYMASTER.md).
