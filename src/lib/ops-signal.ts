import { getActiveGridParams, regimeToGridBps } from "../backtest/grid-params";

export interface OpsSignal {
  timestamp: string;
  regime: "bear" | "bull" | "neutral";
  gridAllocationBps: number;
  dcaMultiplier: number;
  btcUsd: number;
  rewardRateBps: number;
  suggestedDcaUsdc: number;
  suggestedHarvestLifeEur: number;
  swingThresholdPct: number;
  winRateTarget: number;
}

export async function fetchBtcUsd(): Promise<number> {
  const res = await fetch(
    "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
  );
  if (!res.ok) throw new Error(`Binance BTCUSDT: ${res.status}`);
  const data = (await res.json()) as { price: string };
  return Number(data.price);
}

export async function fetchBtcMomentum7d(): Promise<number> {
  const res = await fetch(
    "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=8",
  );
  if (!res.ok) throw new Error(`Binance klines: ${res.status}`);
  const rows = (await res.json()) as string[][];
  const first = Number(rows[0]![4]);
  const last = Number(rows[rows.length - 1]![4]);
  return (last - first) / first;
}

export function computeOpsSignal(btcUsd: number, momentum: number): OpsSignal {
  const absMom = Math.abs(momentum);
  const regime: OpsSignal["regime"] =
    momentum < -0.05 ? "bear" : momentum > 0.05 ? "bull" : "neutral";

  const gridParams = getActiveGridParams();
  const gridAllocationBps = regimeToGridBps(regime);
  const dcaMultiplier = absMom > 0.1 ? 2 : absMom > 0.05 ? 1.5 : 1;
  const baseBps = 400;
  const volBoost = Math.min(600, Math.round(absMom * 5000));
  const rewardRateBps = baseBps + volBoost;

  return {
    timestamp: new Date().toISOString(),
    regime,
    gridAllocationBps,
    dcaMultiplier,
    btcUsd,
    rewardRateBps,
    suggestedDcaUsdc: Math.round(89 * dcaMultiplier * 1e6) / 1e6,
    suggestedHarvestLifeEur: Math.round(50 * (1 + absMom * 2)),
    swingThresholdPct: gridParams.swingThreshold * 100,
    winRateTarget: 0.82,
  };
}

export async function getLiveOpsSignal(): Promise<OpsSignal> {
  const [btcUsd, momentum] = await Promise.all([
    fetchBtcUsd(),
    fetchBtcMomentum7d(),
  ]);
  return computeOpsSignal(btcUsd, momentum);
}
