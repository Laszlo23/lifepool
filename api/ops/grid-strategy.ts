import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLiveGridStrategy } from "../../src/strategy/grid-bot";

/**
 * Full grid bot + copy-trade strategy for B3OS and LifePool UI.
 * GET /api/ops/grid-strategy
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const operator = process.env.B3OS_OPERATOR_ADDRESS;
    const strategy = await getLiveGridStrategy(operator);
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");
    return res.status(200).json(strategy);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Grid strategy fetch failed";
    return res.status(500).json({ error: message });
  }
}
