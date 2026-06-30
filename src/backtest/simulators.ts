import {
  getActiveGridParams,
  type GridSimulatorParams,
} from "./grid-params";
import { dailyReturns, rollingVolatility } from "./market-data";
import type { PriceSeries, StrategyId } from "./types";

type ReturnGenerator = (
  dates: string[],
  idx: number,
  store: Map<string, PriceSeries>,
  caches: SimCaches,
  params: GridSimulatorParams,
) => number;

interface SimCaches {
  btcReturns: Map<string, number>;
}

let overrideParams: GridSimulatorParams | null = null;

/** Override grid params for optimization runs (restore with clearGridParamOverride). */
export function setGridParamOverride(params: GridSimulatorParams | null) {
  overrideParams = params;
}

export function clearGridParamOverride() {
  overrideParams = null;
}

function resolveParams(): GridSimulatorParams {
  return overrideParams ?? getActiveGridParams();
}

function buildCaches(
  store: Map<string, PriceSeries>,
  dates: string[],
): SimCaches {
  return {
    btcReturns: dailyReturns(store, "BTCUSDT", dates),
  };
}

function simulateBtcGrid(
  dates: string[],
  idx: number,
  caches: SimCaches,
  params: GridSimulatorParams,
): number {
  const date = dates[idx]!;
  const btcR = caches.btcReturns.get(date) ?? 0;
  const vol7 = rollingVolatility(caches.btcReturns, dates, idx, 7);
  const vol30 = rollingVolatility(caches.btcReturns, dates, idx, 30);

  const gridCapture = vol7 * params.vol7Coeff + vol30 * params.vol30Coeff;
  const swingProfit =
    Math.abs(btcR) >= params.swingThreshold
      ? Math.abs(btcR) * params.swingCapture - params.swingFee
      : 0;
  const trendDrag =
    Math.abs(btcR) > params.trendMoveThreshold
      ? Math.abs(btcR) * params.trendDragCoeff * Math.sign(btcR) * -1
      : 0;

  return Math.max(
    gridCapture + swingProfit + params.usdcIdleDaily + trendDrag,
    params.maxDailyLoss,
  );
}

function simulateBtcStake(
  dates: string[],
  idx: number,
  caches: SimCaches,
  params: GridSimulatorParams,
): number {
  const date = dates[idx]!;
  const btcR = caches.btcReturns.get(date) ?? 0;
  return params.stakingDaily + btcR * params.stakingBtcExposure;
}

const SIMULATORS: Record<
  StrategyId,
  ReturnGenerator
> = {
  "btc-grid": (dates, idx, _store, caches, params) =>
    simulateBtcGrid(dates, idx, caches, params),
  "btc-stake": (dates, idx, _store, caches, params) =>
    simulateBtcStake(dates, idx, caches, params),
};

export function simulateStrategyReturns(
  id: StrategyId,
  store: Map<string, PriceSeries>,
  dates: string[],
): number[] {
  const params = resolveParams();
  const caches = buildCaches(store, dates);
  const sim = SIMULATORS[id];
  const returns: number[] = [0];

  for (let i = 1; i < dates.length; i++) {
    returns.push(sim(dates, i, store, caches, params));
  }

  return returns;
}

export function describeSimulator(id: StrategyId): string {
  const p = resolveParams();
  const descriptions: Record<StrategyId, string> = {
    "btc-grid":
      `BTC/USDC grid: vol7×${p.vol7Coeff} vol30×${p.vol30Coeff}, swing≥${(p.swingThreshold * 100).toFixed(1)}%`,
    "btc-stake": `BTC stake ${(p.stakingDaily * 365 * 100).toFixed(1)}% APY proxy + ${(p.stakingBtcExposure * 100).toFixed(0)}% BTC beta`,
  };
  return descriptions[id];
}
