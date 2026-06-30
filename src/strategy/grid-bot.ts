import { getRegimeAllocations } from "../backtest/allocator";
import {
  getActiveGridParams,
} from "../backtest/grid-params";
import type { MarketRegime } from "../backtest/types";
import { COVERAGE_TIERS } from "../data/pool";
import { getWalletRoles, type WalletRole } from "../data/wallets";
import {
  computeOpsSignal,
  fetchBtcMomentum7d,
  fetchBtcUsd,
  type OpsSignal,
} from "../lib/ops-signal";

/** Core grid bot parameters — synced with backtest grid-params. */
export const GRID_BOT_CONFIG = {
  pair: "BTC/USDC",
  levels: 24,
  get swingThresholdPct() {
    return getActiveGridParams().swingThreshold * 100;
  },
  usdcIdleApyPct: 2.9,
  targetWinRate: 0.82,
  agentUptimePct: 99.9,
  rebalanceDriftPct: 3,
  copyTradeMode: "pro_rata_stake" as const,
  minGridSpacingPct: 0.35,
  maxGridSpacingPct: 1.2,
} as const;

export interface GridLevel {
  index: number;
  priceUsd: number;
  side: "buy" | "sell";
  sizeUsdc: number;
  filled: boolean;
}

export interface GridAction {
  id: string;
  type: "dca" | "rebalance" | "swing" | "harvest" | "copy_mirror";
  label: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export interface CopyTradeTier {
  tierId: string;
  tierName: string;
  mirrorWeight: number;
  monthlyPremium: number;
}

export interface CopyTradePlan {
  mode: typeof GRID_BOT_CONFIG.copyTradeMode;
  masterWallet: string;
  followerCountProxy: number;
  tiers: CopyTradeTier[];
  lastMirror: string;
}

export interface GridStrategySnapshot {
  timestamp: string;
  signal: OpsSignal;
  regime: MarketRegime;
  gridAllocationPct: number;
  stakeAllocationPct: number;
  gridLevels: GridLevel[];
  midPrice: number;
  spacingPct: number;
  swingThresholdPct: number;
  winRateProxy: number;
  expectedDailyGridCapturePct: number;
  wallets: WalletRole[];
  copyTrade: CopyTradePlan;
  actions: GridAction[];
}

function mapRegime(signalRegime: OpsSignal["regime"]): MarketRegime {
  return signalRegime;
}

function estimateVol7d(momentum: number): number {
  return Math.min(0.12, Math.max(0.015, Math.abs(momentum) * 2.5 + 0.02));
}

function computeSpacingPct(vol7d: number): number {
  const raw = vol7d * 100 * 0.45;
  return Math.min(
    GRID_BOT_CONFIG.maxGridSpacingPct,
    Math.max(GRID_BOT_CONFIG.minGridSpacingPct, raw),
  );
}

/** 24-level symmetric grid around mid — winning vol-harvest layout. */
export function buildGridLevels(btcUsd: number, spacingPct: number): GridLevel[] {
  return buildGridLevelsDeterministic(btcUsd, spacingPct);
}

/** Deterministic grid levels for SSR/API. */
export function buildGridLevelsDeterministic(btcUsd: number, spacingPct: number): GridLevel[] {
  const levels: GridLevel[] = [];
  const half = GRID_BOT_CONFIG.levels / 2;
  const baseSize = 2_500;

  for (let i = 0; i < GRID_BOT_CONFIG.levels; i++) {
    const offset = (i - half + 0.5) * spacingPct;
    const priceUsd = btcUsd * (1 + offset / 100);
    const side: "buy" | "sell" = i < half ? "buy" : "sell";
    const distFromMid = Math.abs(i - half);
    const filled = distFromMid <= 1;
    levels.push({
      index: i + 1,
      priceUsd: Math.round(priceUsd),
      side,
      sizeUsdc: Math.round(baseSize * (1 + distFromMid * 0.08)),
      filled,
    });
  }
  return levels;
}

function computeWinRateProxy(regime: MarketRegime, vol7d: number): number {
  const base = GRID_BOT_CONFIG.targetWinRate;
  const volBoost = regime === "bear" ? 0.05 : regime === "neutral" ? 0.02 : -0.01;
  const volPenalty = vol7d > 0.08 ? -0.02 : 0;
  return Math.min(0.88, Math.max(0.74, base + volBoost + volPenalty));
}

function computeDailyGridCapture(vol7d: number, regime: MarketRegime): number {
  const gridWeight = getRegimeAllocations()[regime]["btc-grid"];
  const p = getActiveGridParams();
  return (vol7d * p.vol7Coeff + vol7d * p.vol30Coeff) * gridWeight * 100;
}

function buildCopyTradePlan(signal: OpsSignal, operator: string): CopyTradePlan {
  const tiers: CopyTradeTier[] = COVERAGE_TIERS.map((t) => ({
    tierId: t.id,
    tierName: t.name,
    mirrorWeight: t.rewardShareBps / 10_000,
    monthlyPremium: t.monthly,
  }));

  const swing =
    Math.abs(signal.btcUsd) > 0 && signal.regime === "bear"
      ? "Swing leg armed · mirroring grid fills"
      : "Grid passive · mirroring DCA allocation";

  return {
    mode: GRID_BOT_CONFIG.copyTradeMode,
    masterWallet: operator,
    followerCountProxy: 12_847,
    tiers,
    lastMirror: swing,
  };
}

function buildActions(
  signal: OpsSignal,
  regime: MarketRegime,
  spacingPct: number,
): GridAction[] {
  const actions: GridAction[] = [
    {
      id: "dca",
      type: "dca",
      label: "Treasury DCA",
      detail: `Deploy $${signal.suggestedDcaUsdc} · ${signal.gridAllocationBps / 100}% grid / ${100 - signal.gridAllocationBps / 100}% stake`,
      priority: "high",
    },
    {
      id: "rebalance",
      type: "rebalance",
      label: "Grid rebalance",
      detail: `${getRegimeAllocations()[regime]["btc-grid"] * 100}% grid target · ${spacingPct.toFixed(2)}% level spacing`,
      priority: regime === "bear" ? "high" : "medium",
    },
    {
      id: "swing",
      type: "swing",
      label: "Swing leg",
      detail: `Fire on ≥${GRID_BOT_CONFIG.swingThresholdPct}% BTC moves · ${signal.regime} regime`,
      priority: Math.abs(signal.dcaMultiplier) > 1 ? "high" : "low",
    },
    {
      id: "harvest",
      type: "harvest",
      label: "Harvest to rewards",
      detail: `Pipe ${signal.suggestedHarvestLifeEur} LIFEUR → copy-trade followers`,
      priority: "medium",
    },
    {
      id: "copy",
      type: "copy_mirror",
      label: "Copy-trade mirror",
      detail: "All members mirror master wallet pro-rata by cycle stake × tier weight",
      priority: "high",
    },
  ];
  return actions;
}

export async function getLiveGridStrategy(operatorAddress?: string): Promise<GridStrategySnapshot> {
  const [btcUsd, momentum] = await Promise.all([fetchBtcUsd(), fetchBtcMomentum7d()]);
  const signal = computeOpsSignal(btcUsd, momentum);
  const regime = mapRegime(signal.regime);
  const vol7d = estimateVol7d(momentum);
  const spacingPct = computeSpacingPct(vol7d);
  const wallets = getWalletRoles(operatorAddress);
  const operator =
    wallets.find((w) => w.id === "grid_operator")?.address ?? "0xaaf620ee9e2a805323BF7363992E33e4412be3FB";

  return {
    timestamp: new Date().toISOString(),
    signal,
    regime,
    gridAllocationPct: signal.gridAllocationBps / 100,
    stakeAllocationPct: 100 - signal.gridAllocationBps / 100,
    gridLevels: buildGridLevelsDeterministic(btcUsd, spacingPct),
    midPrice: btcUsd,
    spacingPct,
    swingThresholdPct: GRID_BOT_CONFIG.swingThresholdPct,
    winRateProxy: computeWinRateProxy(regime, vol7d),
    expectedDailyGridCapturePct: computeDailyGridCapture(vol7d, regime),
    wallets,
    copyTrade: buildCopyTradePlan(signal, operator),
    actions: buildActions(signal, regime, spacingPct),
  };
}

export function getLiveGridStrategySync(
  btcUsd: number,
  momentum: number,
  operatorAddress?: string,
): GridStrategySnapshot {
  const signal = computeOpsSignal(btcUsd, momentum);
  const regime = mapRegime(signal.regime);
  const vol7d = estimateVol7d(momentum);
  const spacingPct = computeSpacingPct(vol7d);
  const wallets = getWalletRoles(operatorAddress);
  const operator =
    wallets.find((w) => w.id === "grid_operator")?.address ?? "0xaaf620ee9e2a805323BF7363992E33e4412be3FB";

  return {
    timestamp: new Date().toISOString(),
    signal,
    regime,
    gridAllocationPct: signal.gridAllocationBps / 100,
    stakeAllocationPct: 100 - signal.gridAllocationBps / 100,
    gridLevels: buildGridLevelsDeterministic(btcUsd, spacingPct),
    midPrice: btcUsd,
    spacingPct,
    swingThresholdPct: GRID_BOT_CONFIG.swingThresholdPct,
    winRateProxy: computeWinRateProxy(regime, vol7d),
    expectedDailyGridCapturePct: computeDailyGridCapture(vol7d, regime),
    wallets,
    copyTrade: buildCopyTradePlan(signal, operator),
    actions: buildActions(signal, regime, spacingPct),
  };
}
