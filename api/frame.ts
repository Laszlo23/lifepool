import type { VercelRequest, VercelResponse } from "@vercel/node";

const APP_URL = process.env.VITE_APP_URL ?? "https://lifepool.app";
/** Base Sepolia LifePoolFaucet — from deployments/base-sepolia.json */
const FAUCET_ADDRESS =
  process.env.LIFEPOOL_FAUCET_ADDRESS ?? "0xDbb8dDcf2c9b03A1d64B2284C0Aa0971FBB7ce2E";

/**
 * Farcaster Frame endpoint — GET returns frame HTML, POST handles button actions.
 * Deploy with Vercel: routes in vercel.json
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta property="og:title" content="LifePool · Testnet PoC on Base" />
    <meta property="og:description" content="Proof of concept on Base Sepolia · Not regulated insurance · Claim testnet funds" />
    <meta property="og:image" content="${APP_URL}/api/og" />
    <meta name="fc:frame" content="vNext" />
    <meta name="fc:frame:image" content="${APP_URL}/api/og" />
    <meta name="fc:frame:button:1" content="Claim testnet funds" />
    <meta name="fc:frame:button:1:action" content="post" />
    <meta name="fc:frame:button:2" content="Open LifePool" />
    <meta name="fc:frame:button:2:action" content="link" />
    <meta name="fc:frame:button:2:target" content="${APP_URL}/?ref=farcaster" />
    <meta name="fc:frame:post_url" content="${APP_URL}/api/frame" />
  </head>
  <body>LifePool Frame · Base Sepolia testnet</body>
</html>`;
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(html);
  }

  if (req.method === "POST") {
    const frameHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta name="fc:frame" content="vNext" />
    <meta name="fc:frame:image" content="${APP_URL}/api/og" />
    <meta name="fc:frame:button:1" content="Sign claim tx" />
    <meta name="fc:frame:button:1:action" content="tx" />
    <meta name="fc:frame:button:1:target" content="${FAUCET_ADDRESS}" />
    <meta name="fc:frame:button:2" content="Open app" />
    <meta name="fc:frame:button:2:action" content="link" />
    <meta name="fc:frame:button:2:target" content="${APP_URL}/?ref=farcaster" />
  </head>
  <body>Claim tWBTC · tXRP · LIFEUR · testnet only</body>
</html>`;
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(frameHtml);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
