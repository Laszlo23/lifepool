import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLiveOpsSignal } from "../../src/lib/ops-signal";

/**
 * Ops signal for B3OS workflows and treasury automation.
 * GET /api/ops/signal
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const signal = await getLiveOpsSignal();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    return res.status(200).json(signal);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Signal fetch failed";
    return res.status(500).json({ error: message });
  }
}
