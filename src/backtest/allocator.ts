import { dailyReturns, rollingVolatility } from "./market-data";
import type { MarketRegime, PriceSeries, RegimeSnapshot, StrategyId } from "./types";
import {
  getActiveRegimeAllocations,
  type RegimeAllocationMap,
} from "./grid-params";

export type { MarketRegime };

let regimeOverride: RegimeAllocationMap | null = null;

export function setRegimeAllocationOverride(map: RegimeAllocationMap | null) {
  regimeOverride = map;
}

export function clearRegimeAllocationOverride() {
  regimeOverride = null;
}

function activeRegimeAllocations(): RegimeAllocationMap {
  return regimeOverride ?? getActiveRegimeAllocations();
}

/** Regime-aware split: grid agent vs BTC stake */
export function getRegimeAllocations(): RegimeAllocationMap {
  return activeRegimeAllocations();
}

/** @deprecated use getRegimeAllocations() */
export const REGIME_ALLOCATIONS: RegimeAllocationMap = getActiveRegimeAllocations();

const COMPOUND_STRATEGIES: StrategyId[] = ["btc-grid"];

export function detectRegimeSeries(
  store: Map<string, PriceSeries>,
  dates: string[],
): RegimeSnapshot[] {
  const btcReturns = dailyReturns(store, "BTCUSDT", dates);
  const snapshots: RegimeSnapshot[] = [];

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]!;
    let momentum = 0;
    let count = 0;
    for (let j = Math.max(1, i - 29); j <= i; j++) {
      const r = btcReturns.get(dates[j]!);
      if (r !== undefined) {
        momentum += r;
        count++;
      }
    }
    const btcMomentum30d = count > 0 ? momentum : 0;
    const btcVol30d = rollingVolatility(btcReturns, dates, i, 30);
    const regime = classifyRegime(btcMomentum30d, btcVol30d);

    snapshots.push({
      date,
      regime,
      btcMomentum30d,
      btcVol30d,
      confidence: Math.min(0.5 + btcVol30d * 4, 0.95),
    });
  }

  return snapshots;
}

function classifyRegime(momentum: number, vol: number): MarketRegime {
  if (momentum < -0.12 || (momentum < -0.05 && vol > 0.04)) return "bear";
  if (momentum > 0.1 || (momentum > 0.05 && vol < 0.035)) return "bull";
  return "neutral";
}

export function getTargetWeights(
  regime: MarketRegime,
  optimized: boolean,
  staticWeights: Record<StrategyId, number>,
): Record<StrategyId, number> {
  if (!optimized) return { ...staticWeights };
  return { ...activeRegimeAllocations()[regime] };
}

export function buildStaticWeightMap(
  weights: { id: StrategyId; weight: number }[],
): Record<StrategyId, number> {
  const map = {} as Record<StrategyId, number>;
  for (const { id, weight } of weights) {
    map[id] = weight;
  }
  return map;
}

export function routeDcaContribution(
  amount: number,
  strategyValues: Map<StrategyId, number>,
  targetWeights: Record<StrategyId, number>,
): Map<StrategyId, number> {
  const routing = new Map<StrategyId, number>();
  const smartWeight = 0.55;
  const propWeight = 1 - smartWeight;

  const totalNav = [...strategyValues.values()].reduce((a, b) => a + b, 0);
  const smart = new Map<StrategyId, number>();

  if (totalNav <= 0) {
    for (const [id, target] of Object.entries(targetWeights)) {
      routing.set(id as StrategyId, amount * target);
    }
    return routing;
  }

  for (const [id, target] of Object.entries(targetWeights)) {
    const sid = id as StrategyId;
    const actual = (strategyValues.get(sid) ?? 0) / totalNav;
    const underweight = Math.max(0, target - actual);
    smart.set(sid, underweight);
  }

  const smartTotal = [...smart.values()].reduce((a, b) => a + b, 0) || 1;

  for (const id of Object.keys(targetWeights) as StrategyId[]) {
    const target = targetWeights[id] ?? 0;
    routing.set(
      id,
      smartWeight * ((smart.get(id) ?? 0) / smartTotal) * amount +
        propWeight * amount * target,
    );
  }

  return routing;
}

export function computeRebalanceTrades(
  strategyValues: Map<StrategyId, number>,
  targetWeights: Record<StrategyId, number>,
  maxDrift = 0.03,
): Map<StrategyId, number> {
  const totalNav = [...strategyValues.values()].reduce((a, b) => a + b, 0);
  const adjustments = new Map<StrategyId, number>();

  if (totalNav <= 0) return adjustments;

  for (const [id, target] of Object.entries(targetWeights)) {
    const sid = id as StrategyId;
    const actual = (strategyValues.get(sid) ?? 0) / totalNav;
    const drift = actual - target;
    if (Math.abs(drift) > maxDrift) {
      adjustments.set(sid, -drift * totalNav * 0.25);
    }
  }

  return adjustments;
}

export function computeDailyCompound(
  strategyId: StrategyId,
  dailyReturn: number,
  principal: number,
  regime: MarketRegime,
): number {
  if (!COMPOUND_STRATEGIES.includes(strategyId)) return 0;
  if (dailyReturn <= 0 || principal <= 0) return 0;

  const harvestRate =
    regime === "bull" ? 0.9 : regime === "bear" ? 0.82 : 0.86;
  const feeEstimate = Math.max(dailyReturn * 0.5, 0.00002);
  const compoundEdge = 0.12;
  return feeEstimate * harvestRate * compoundEdge * principal;
}

export function getRegimeColor(regime: MarketRegime): string {
  const colors: Record<MarketRegime, string> = {
    bear: "#f59e0b",
    neutral: "#6b7280",
    bull: "#00e5a0",
  };
  return colors[regime];
}

export function getRegimeLabel(regime: MarketRegime): string {
  const labels: Record<MarketRegime, string> = {
    bear: "Bear · Grid harvest",
    neutral: "Neutral · Balanced",
    bull: "Bull · Stake tilt",
  };
  return labels[regime];
}
