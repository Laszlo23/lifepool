import { buildStaticWeightMap, getTargetWeights as getBaseRegimeWeights } from "../backtest/allocator";
import { runBacktest, PRESET_CONFIGS } from "../backtest/engine";
import { getLatestMarketDate, normalizeAllocations } from "../backtest/market-data";
import {
  applyAdaptiveWeights,
  enrichIntelMoves,
  getLearnedPatternMap,
} from "../backtest/adaptive-learning";
import {
  buildIntelSnapshot,
  getOpportunityWeights,
  type IntelSnapshot,
} from "../backtest/signals";
import type { BacktestResult, PriceSeries, StrategyId } from "../backtest/types";
import { DEFAULT_ALLOCATIONS } from "../backtest/types";
import type { EngineSettings, MemberProfile } from "../types/member";

export interface LivePoolState {
  memberResult: BacktestResult;
  poolResult: BacktestResult;
  intel: IntelSnapshot;
  currentAllocation: Record<string, number>;
  poolApy: number;
  memberApy: number;
  lastUpdated: string;
}

export function subtractMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y!, m! - 1 - months, d);
  return date.toISOString().slice(0, 10);
}

export function computeMemberJoinDate(
  store: Map<string, PriceSeries>,
  monthsBack = 8,
): string {
  const latest = getLatestMarketDate(store);
  const earliest = store.get("BTCUSDT")?.candles[0]?.date ?? "2022-01-01";
  const candidate = subtractMonths(latest, monthsBack);
  return candidate < earliest ? earliest : candidate;
}

export function computeLivePoolState(
  store: Map<string, PriceSeries>,
  member: MemberProfile,
  settings: EngineSettings = {
    optimized: true,
    dailyCompound: true,
    smartDca: true,
    opportunityMode: true,
    adaptiveMode: true,
  },
): LivePoolState {
  const endDate = getLatestMarketDate(store);

  const memberConfig = {
    startDate: member.joinDate,
    endDate,
    initialCapital: 0,
    monthlyInflow: member.monthlyContribution,
    ...settings,
  };

  const memberResult = runBacktest(store, memberConfig);
  const poolResult = runBacktest(store, {
    ...PRESET_CONFIGS.full!,
    opportunityMode: settings.opportunityMode,
    adaptiveMode: settings.adaptiveMode,
  });
  const intel = enrichIntelMoves(buildIntelSnapshot(store));

  const latestSignal =
    memberResult.signalHistory[memberResult.signalHistory.length - 1];
  const latestRegime =
    memberResult.regimeHistory[memberResult.regimeHistory.length - 1];
  const staticWeights = buildStaticWeightMap(
    normalizeAllocations(DEFAULT_ALLOCATIONS),
  );
  const baseWeights = getBaseRegimeWeights(
    latestRegime?.regime ?? "neutral",
    settings.optimized,
    staticWeights,
  );
  const currentAllocation =
    settings.adaptiveMode !== false && latestSignal
      ? applyAdaptiveWeights(
          latestSignal,
          getOpportunityWeights(
            latestRegime?.regime ?? "neutral",
            latestSignal,
            staticWeights,
            baseWeights,
          ),
          getLearnedPatternMap(),
        )
      : getOpportunityWeights(
          latestRegime?.regime ?? "neutral",
          latestSignal,
          staticWeights,
          baseWeights,
        );

  return {
    memberResult,
    poolResult,
    intel,
    currentAllocation,
    poolApy: poolResult.cagr * 100,
    memberApy: memberResult.cagr * 100,
    lastUpdated: endDate,
  };
}

export function mergeStrategyAllocations(
  currentAllocation: Record<string, number>,
): { id: StrategyId; weight: number }[] {
  return Object.entries(currentAllocation)
    .map(([id, weight]) => ({ id: id as StrategyId, weight }))
    .filter((s) => s.weight > 0.001)
    .sort((a, b) => b.weight - a.weight);
}
