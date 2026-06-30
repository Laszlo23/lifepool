import type { MarketRegime } from "./types";
import type { StrategyId } from "./types";

/** Tunable BTC/USDC grid simulator coefficients. */
export interface GridSimulatorParams {
  vol7Coeff: number;
  vol30Coeff: number;
  swingThreshold: number;
  swingCapture: number;
  swingFee: number;
  usdcIdleDaily: number;
  trendDragCoeff: number;
  trendMoveThreshold: number;
  maxDailyLoss: number;
  stakingDaily: number;
  stakingBtcExposure: number;
}

export type RegimeAllocationMap = Record<
  MarketRegime,
  Record<StrategyId, number>
>;

/** Baseline params (pre-optimization). */
export const BASELINE_GRID_PARAMS: GridSimulatorParams = {
  vol7Coeff: 0.52,
  vol30Coeff: 0.28,
  swingThreshold: 0.015,
  swingCapture: 0.48,
  swingFee: 0.0015,
  usdcIdleDaily: 0.00007,
  trendDragCoeff: 0.08,
  trendMoveThreshold: 0.045,
  maxDailyLoss: -0.025,
  stakingDaily: 0.0001,
  stakingBtcExposure: 0.92,
};

/** Backtest-optimized params — updated by `npm run optimize`. */
export const OPTIMIZED_GRID_PARAMS: GridSimulatorParams = {
  vol7Coeff: 0.62,
  vol30Coeff: 0.36,
  swingThreshold: 0.015,
  swingCapture: 0.54,
  swingFee: 0.0015,
  usdcIdleDaily: 0.00008,
  trendDragCoeff: 0.06,
  trendMoveThreshold: 0.045,
  maxDailyLoss: -0.022,
  stakingDaily: 0.0001,
  stakingBtcExposure: 0.92,
};

export const BASELINE_REGIME_ALLOCATIONS: RegimeAllocationMap = {
  bear: { "btc-grid": 0.78, "btc-stake": 0.22 },
  neutral: { "btc-grid": 0.65, "btc-stake": 0.35 },
  bull: { "btc-grid": 0.52, "btc-stake": 0.48 },
};

/** Backtest-optimized regime splits (180-candidate search, +285% score vs baseline). */
export const OPTIMIZED_REGIME_ALLOCATIONS: RegimeAllocationMap = {
  bear: { "btc-grid": 0.86, "btc-stake": 0.14 },
  neutral: { "btc-grid": 0.72, "btc-stake": 0.28 },
  bull: { "btc-grid": 0.58, "btc-stake": 0.42 },
};

export const DEFAULT_STATIC_ALLOCATION = { grid: 0.7, stake: 0.3 };

/** Live production uses optimized set. */
export function getActiveGridParams(): GridSimulatorParams {
  return OPTIMIZED_GRID_PARAMS;
}

export function getActiveRegimeAllocations(): RegimeAllocationMap {
  return OPTIMIZED_REGIME_ALLOCATIONS;
}

export function regimeToGridBps(regime: MarketRegime): number {
  return Math.round(getActiveRegimeAllocations()[regime]["btc-grid"] * 10_000);
}
