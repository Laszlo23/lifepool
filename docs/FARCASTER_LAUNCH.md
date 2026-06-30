# Farcaster launch cast

## Cast (main)

**LifePool is live on Base Sepolia testnet.**

We built a EUR stablecoin (LIFEUR) you mint against BTC + XRP collateral — then lock into a 4 year · 4 month · 4 day cycle while our BTC/USDC grid agent trades swings and BTC stake compounds.

Try it:
1. Tap the Frame → claim testnet drip
2. Mint LIFEUR from collateral
3. Join the pool onchain

Testnet only. Not financial advice.

`https://lifepool.app/?ref=farcaster`

---

## Thread outline

**Cast 1** — Problem: EU lacks compelling onchain EUR. USDC dominates; we want BTC/XRP-backed mint + long-cycle grid yield.

**Cast 2** — Product: LIFEUR minted at 150% collateral. Grid agent (81% win rate in sim) + BTC stake. Rewards boosted 1.25× if you mint AND join the pool.

**Cast 3** — Frame demo: claim faucet → mint → join. Cycle lock enforced in `LifePoolVault.sol`.

**Cast 4** — CTA: feedback welcome. Mainnet path: Chainlink oracles, bridged XRP, Farcaster Mini App v2.

---

## E2E test checklist

- [ ] Frame loads in Warpcast preview
- [ ] "Claim testnet funds" returns tx to `LifePoolFaucet.claim()`
- [ ] "Open LifePool" opens app with `?ref=farcaster`
- [ ] Faucet screen: connect wallet → claim → receive tWBTC, tXRP, LIFEUR
- [ ] Mint screen: approve → deposit → mint LIFEUR
- [ ] Onboarding review: join pool onchain
- [ ] Dashboard shows onchain balance + cycle lock

---

## Domain setup

1. Deploy to Vercel with `VITE_APP_URL` set to production domain
2. Replace placeholders in `public/.well-known/farcaster.json` via [Farcaster manifest tool](https://warpcast.com/~/developers)
3. Point cast image to `/api/og`
