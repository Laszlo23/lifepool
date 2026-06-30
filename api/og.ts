import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#0a0a0f"/>
    <text x="80" y="120" fill="#00e5a0" font-family="system-ui,sans-serif" font-size="28" font-weight="600">LifePool</text>
    <text x="80" y="220" fill="#ffffff" font-family="system-ui,sans-serif" font-size="52" font-weight="700">Winning BTC/USDC Grid + Stake</text>
    <text x="80" y="290" fill="#9ca3af" font-family="system-ui,sans-serif" font-size="28">Mint LIFEUR · BTC/XRP collateral · 4y cycle lock</text>
    <rect x="80" y="340" width="320" height="56" rx="28" fill="#00e5a0"/>
    <text x="120" y="378" fill="#0a0a0f" font-family="system-ui,sans-serif" font-size="22" font-weight="600">Base Sepolia Testnet</text>
  </svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "s-maxage=3600");
  return res.status(200).send(svg);
}
