import type { VercelRequest, VercelResponse } from "@vercel/node";

const APP_URL = process.env.VITE_APP_URL ?? "https://lifepool.app";
const FAUCET_ADDRESS = process.env.VITE_POOL_FAUCET_ADDRESS ?? "";

/**
 * Farcaster Frame endpoint — GET returns frame HTML, POST handles button actions.
 * Deploy with Vercel: routes in vercel.json
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta property="og:title" content="LifePool · LIFEUR on Base" />
    <meta property="og:description" content="Mint EUR stablecoin against BTC/XRP · Grid + stake · 4y cycle" />
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
  <body>LifePool Frame</body>
</html>`;
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(html);
  }

  if (req.method === "POST") {
    const txTarget = FAUCET_ADDRESS || "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
    const frameHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta name="fc:frame" content="vNext" />
    <meta name="fc:frame:image" content="${APP_URL}/api/og" />
    <meta name="fc:frame:button:1" content="Sign claim tx" />
    <meta name="fc:frame:button:1:action" content="tx" />
    <meta name="fc:frame:button:1:target" content="${txTarget}" />
    <meta name="fc:frame:button:2" content="Open app" />
    <meta name="fc:frame:button:2:action" content="link" />
    <meta name="fc:frame:button:2:target" content="${APP_URL}/?ref=farcaster" />
  </head>
  <body>Claim tWBTC · tXRP · LIFEUR</body>
</html>`;
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(frameHtml);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
