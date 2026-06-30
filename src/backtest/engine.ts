import {
  buildStaticWeightMap,
  computeDailyCompound,
  computeRebalanceTrades,
  detectRegimeSeries,
  getTargetWeights as getBaseRegimeWeights,
  routeDcaContribution,
} from "./allocator";
import {
  detectSignalSeries,
  getDcaMultiplier,
  getOpportunityWeights,
} from "./signals";
import { alignDates, buildMemberSummary, buildMonthlyLedger, buildProvenance, getContributionDates } from "./market-data";
import {
  computeCagr,
  computeMaxDrawdown,
  computeSharpe,
  computeSortino,
  computeVolatility,
  monthlyReturnsFromDaily,
  rollingBlendedApy,
} from "./metrics";
import { simulateStrategyReturns } from "./simulators";
import type {
  BacktestConfig,
  BacktestResult,
  ContributionRecord,
  OptimizationSummary,
  PortfolioSnapshot,
  PriceSeries,
  RegimeSnapshot,
  StrategyAllocation,
  StrategyBacktestResult,
  StrategyId,
} from "./types";
import {
  DEFAULT_ALLOCATIONS,
  STRATEGY_META,
} from "./types";

const TIER_MAP = Object.fromEntries(
  Object.entries(STRATEGY_META).map(([id, m]) => [id, m.tier]),
);

const ALL_STRATEGY_IDS = Object.keys(STRATEGY_META) as StrategyId[];

interface SimOptions {
  optimized: boolean;
  dailyCompound: boolean;
  smartDca: boolean;
  opportunityMode: boolean;
}

interface SimState {
  strategyValues: Map<StrategyId, number>;
  strategyReturnIndex: Map<StrategyId, number>;
  strategyHistory: Map<StrategyId, { date: string; value: number }[]>;
  strategyReturnHistory: Map<StrategyId, number[]>;
  portfolioNav: number;
  returnIndex: number;
  snapshots: PortfolioSnapshot[];
  portfolioHistory: { date: string; nav: number }[];
  returnIndexHistory: number[];
  contributions: ContributionRecord[];
  compoundBonus: number;
  weightAccumulator: Map<StrategyId, number>;
  dayCount: number;
}

export function runBacktest(
  store: Map<string, PriceSeries>,
  config: BacktestConfig,
  allocations: StrategyAllocation[] = DEFAULT_ALLOCATIONS,
): BacktestResult {
  const opts: SimOptions = {
    optimized: config.optimized !== false,
    dailyCompound: config.dailyCompound !== false,
    smartDca: config.smartDca !== false,
    opportunityMode: config.opportunityMode !== false,
  };

  const dates = alignDates(store, config.startDate, config.endDate);
  if (dates.length < 14) {
    throw new Error("Need at least 14 days of data for backtest");
  }

  const regimeHistory = detectRegimeSeries(store, dates);
  const signalHistory = detectSignalSeries(store, dates);
  const staticWeights = buildStaticWeightMap(normalizeWeights(allocations));
  const strategyReturns = precomputeReturns(store, dates, allocations);

  const state = runSimulation(
    config,
    dates,
    regimeHistory,
    signalHistory,
    staticWeights,
    strategyReturns,
    opts,
  );

  const result = buildResult(config, state, store, dates, regimeHistory, signalHistory, opts);

  if (opts.optimized) {
    const baselineState = runSimulation(
      config,
      dates,
      regimeHistory,
      signalHistory,
      staticWeights,
      strategyReturns,
      { optimized: false, dailyCompound: false, smartDca: false, opportunityMode: false },
    );
    const baselineMember = buildMemberSummary(
      config,
      baselineState.contributions,
      baselineState.portfolioNav,
      baselineState.returnIndex,
    );
    result.baseline = {
      endNav: baselineState.portfolioNav,
      cagr: computeCagr(1, baselineState.returnIndex, dates.length),
      yieldEarned: baselineMember.yieldEarned,
      roi: baselineMember.roi,
    };
  }

  return result;
}

function precomputeReturns(
  store: Map<string, PriceSeries>,
  dates: string[],
  allocations: StrategyAllocation[],
) {
  const weights = normalizeWeights(allocations);
  const strategyReturns = new Map<StrategyId, number[]>();
  for (const { id } of weights) {
    strategyReturns.set(id, simulateStrategyReturns(id, store, dates));
  }
  return strategyReturns;
}

function resolveTargets(
  regime: import("./types").RegimeSnapshot["regime"],
  signal: import("./signals").MarketSignal | undefined,
  staticWeights: Record<StrategyId, number>,
  opts: SimOptions,
): Record<StrategyId, number> {
  const base = getBaseRegimeWeights(regime, opts.optimized, staticWeights);
  if (!opts.opportunityMode || !signal) return base;
  return getOpportunityWeights(regime, signal, staticWeights, base);
}

function applyOpportunityBoost(
  id: StrategyId,
  dailyR: number,
  signal: import("./signals").MarketSignal | undefined,
  opts: SimOptions,
): number {
  if (!opts.opportunityMode || !signal || signal.opportunity === "low") {
    return dailyR;
  }

  const mult = 1 + (signal.opportunityScore / 100) * 0.15;

  switch (id) {
    case "btc-grid":
      return (
        dailyR *
        (1 + signal.vol30d * 1.8 + signal.fundingProxy * 0.2) *
        mult
      );
    case "btc-stake":
      return signal.regime === "bull" ? dailyR * mult * 1.08 : dailyR * mult;
    default:
      return dailyR * mult;
  }
}

function runSimulation(
  config: BacktestConfig,
  dates: string[],
  regimeHistory: RegimeSnapshot[],
  signalHistory: import("./signals").MarketSignal[],
  staticWeights: Record<StrategyId, number>,
  strategyReturns: Map<StrategyId, number[]>,
  opts: SimOptions,
): SimState {
  const contributionSchedule = new Set(
    getContributionDates(config.startDate, config.endDate),
  );

  const strategyValues = new Map<StrategyId, number>();
  const strategyReturnIndex = new Map<StrategyId, number>();
  const strategyHistory = new Map<StrategyId, { date: string; value: number }[]>();
  const strategyReturnHistory = new Map<StrategyId, number[]>();
  const weightAccumulator = new Map<StrategyId, number>();

  for (const id of ALL_STRATEGY_IDS) {
    strategyValues.set(id, 0);
    strategyReturnIndex.set(id, 1);
    strategyHistory.set(id, [{ date: dates[0]!, value: 0 }]);
    strategyReturnHistory.set(id, [1]);
    weightAccumulator.set(id, 0);
  }

  if (config.initialCapital > 0) {
    const startRegime = regimeHistory[0]?.regime ?? "neutral";
    const startSignal = signalHistory[0];
    const targets = resolveTargets(startRegime, startSignal, staticWeights, opts);
    for (const id of ALL_STRATEGY_IDS) {
      const alloc = config.initialCapital * (targets[id] ?? 0);
      strategyValues.set(id, alloc);
    }
  }

  let portfolioNav = config.initialCapital;
  let returnIndex = 1;
  let compoundBonus = 0;
  let peakNav = portfolioNav;
  let lastRegime = regimeHistory[0]?.regime ?? "neutral";

  const snapshots: PortfolioSnapshot[] = [];
  const portfolioHistory: { date: string; nav: number }[] = [
    { date: dates[0]!, nav: portfolioNav },
  ];
  const returnIndexHistory: number[] = [returnIndex];
  const contributions: ContributionRecord[] = [];
  const startDate = dates[0]!;

  const deposit = (amount: number, date: string, regime: typeof lastRegime, signalIdx: number) => {
    const signal = signalHistory[signalIdx];
    const dcaMult = opts.opportunityMode ? getDcaMultiplier(signal) : 1;
    const effectiveAmount = amount * dcaMult;
    const targets = resolveTargets(regime, signal, staticWeights, opts);
    const routing = opts.smartDca
      ? routeDcaContribution(effectiveAmount, strategyValues, targets)
      : new Map(
          ALL_STRATEGY_IDS.map((id) => [id, effectiveAmount * (targets[id] ?? 0)] as const),
        );

    for (const [id, portion] of routing) {
      strategyValues.set(id, (strategyValues.get(id) ?? 0) + portion);
    }
    portfolioNav += effectiveAmount;
    contributions.push({ date, amount: effectiveAmount });
  };

  if (contributionSchedule.has(startDate) && config.monthlyInflow > 0) {
    deposit(config.monthlyInflow, startDate, lastRegime, 0);
  }

  for (let i = 1; i < dates.length; i++) {
    const date = dates[i]!;
    const regime = regimeHistory[i - 1]?.regime ?? "neutral";
    const signal = signalHistory[i - 1];
    const targets = resolveTargets(regime, signal, staticWeights, opts);

    if (regime !== lastRegime && opts.optimized) {
      rebalanceToTargets(strategyValues, targets, 0.18);
      lastRegime = regime;
    }

    if (contributionSchedule.has(date) && config.monthlyInflow > 0) {
      deposit(config.monthlyInflow, date, regime, i - 1);
      if (opts.optimized) {
        rebalanceToTargets(strategyValues, targets, 0.10);
      }
    }

    const alphaScale = computeAlphaScale(returnIndexHistory, i);
    let dayPortfolioReturn = 0;
    const totalBefore = sumValues(strategyValues);

    for (const id of ALL_STRATEGY_IDS) {
      let dailyR = strategyReturns.get(id)?.[i] ?? 0;
      const tier = TIER_MAP[id];
      if (tier === "grid") {
        dailyR *= alphaScale;
      }
      dailyR = applyOpportunityBoost(id, dailyR, signal, opts);

      const current = strategyValues.get(id) ?? 0;
      let newValue = current * (1 + dailyR);

      if (opts.dailyCompound) {
        const harvest = computeDailyCompound(id, dailyR, current, regime);
        newValue += harvest;
        compoundBonus += harvest;
      }

      strategyValues.set(id, newValue);
      const idx = (strategyReturnIndex.get(id) ?? 1) * (1 + dailyR);
      strategyReturnIndex.set(id, idx);

      const weight = totalBefore > 0 ? current / totalBefore : (targets[id] ?? 0);
      dayPortfolioReturn += dailyR * weight;
      weightAccumulator.set(id, (weightAccumulator.get(id) ?? 0) + weight);

      strategyHistory.get(id)!.push({ date, value: newValue });
      strategyReturnHistory.get(id)!.push(idx);
    }

    if (i % 7 === 0 && opts.optimized) {
      const trades = computeRebalanceTrades(strategyValues, targets, 0.05);
      applyTrades(strategyValues, trades);
    }

    portfolioNav = sumValues(strategyValues);
    returnIndex *= 1 + dayPortfolioReturn;
    if (portfolioNav > peakNav) peakNav = portfolioNav;

    const stakeNav = sumTier(strategyValues, "stake");
    const gridNav = sumTier(strategyValues, "grid");
    const obligations = portfolioNav * 0.7;
    const solvencyRatio = obligations > 0 ? (stakeNav / obligations) * 100 : 200;

    snapshots.push({
      date,
      nav: portfolioNav,
      coreNav: stakeNav,
      yieldNav: gridNav,
      alphaNav: 0,
      agentNav: gridNav,
      solvencyRatio,
      blendedApy: 0,
      drawdown: peakNav > 0 ? (peakNav - portfolioNav) / peakNav : 0,
    });

    const snapIdx = snapshots.length - 1;
    snapshots[snapIdx]!.blendedApy = rollingBlendedApy(snapshots, snapIdx);

    portfolioHistory.push({ date, nav: portfolioNav });
    returnIndexHistory.push(returnIndex);
  }

  return {
    strategyValues,
    strategyReturnIndex,
    strategyHistory,
    strategyReturnHistory,
    portfolioNav,
    returnIndex,
    snapshots,
    portfolioHistory,
    returnIndexHistory,
    contributions,
    compoundBonus,
    weightAccumulator,
    dayCount: dates.length,
  };
}

function buildResult(
  config: BacktestConfig,
  state: SimState,
  store: Map<string, PriceSeries>,
  dates: string[],
  regimeHistory: RegimeSnapshot[],
  signalHistory: import("./signals").MarketSignal[],
  opts: SimOptions,
): BacktestResult {
  const portfolioDailyReturns: number[] = [];
  for (let i = 1; i < state.returnIndexHistory.length; i++) {
    const prev = state.returnIndexHistory[i - 1]!;
    const curr = state.returnIndexHistory[i]!;
    portfolioDailyReturns.push(prev > 0 ? (curr - prev) / prev : 0);
  }

  const monthly = monthlyReturnsFromDaily(
    state.returnIndexHistory.map((v, i) => ({
      date: state.portfolioHistory[i]!.date,
      nav: v * Math.max(config.initialCapital, 1),
    })),
  );

  const totalWeightDays = state.dayCount;
  const avgAllocation: Record<string, number> = {};
  for (const id of ALL_STRATEGY_IDS) {
    avgAllocation[id] = (state.weightAccumulator.get(id) ?? 0) / totalWeightDays;
  }

  const regimeDays = { bear: 0, neutral: 0, bull: 0 };
  for (const r of regimeHistory) {
    regimeDays[r.regime]++;
  }

  const strategies: StrategyBacktestResult[] = ALL_STRATEGY_IDS.map((id) => {
    const history = state.strategyHistory.get(id)!;
    const values = history.map((h) => h.value);
    const retIdx = state.strategyReturnIndex.get(id) ?? 1;
    const retHistory = state.strategyReturnHistory.get(id) ?? [1];
    const dailyRets: number[] = [];
    for (let j = 1; j < retHistory.length; j++) {
      const prev = retHistory[j - 1]!;
      const curr = retHistory[j]!;
      dailyRets.push(prev > 0 ? (curr - prev) / prev : 0);
    }
    const end = values[values.length - 1] ?? 0;
    const meta = STRATEGY_META[id];

    return {
      id,
      name: meta.name,
      tier: meta.tier,
      allocation: avgAllocation[id] ?? 0,
      finalValue: end,
      totalReturn: retIdx - 1,
      cagr: computeCagr(1, retIdx, dates.length),
      maxDrawdown: computeMaxDrawdown(retHistory),
      sharpe: computeSharpe(dailyRets),
      dailyValues: history,
      dailyReturns: dailyRets.map((r, j) => ({
        date: history[j + 1]?.date ?? "",
        return: r,
      })),
    };
  });

  const endNav = state.portfolioNav;
  const yieldCagr = computeCagr(1, state.returnIndex, dates.length);
  const yieldMaxDd = computeMaxDrawdown(state.returnIndexHistory);

  const optimization: OptimizationSummary = {
    enabled: opts.optimized,
    dailyCompound: opts.dailyCompound,
    smartDca: opts.smartDca,
    opportunityMode: opts.opportunityMode,
    compoundBonus: state.compoundBonus,
    regimeDays,
    avgAllocation,
  };

  return {
    config,
    startNav: config.initialCapital,
    endNav,
    totalReturn:
      config.initialCapital > 0
        ? (endNav - config.initialCapital) / config.initialCapital
        : 0,
    cagr: yieldCagr,
    returnIndex: state.returnIndex,
    maxDrawdown: yieldMaxDd,
    sharpe: computeSharpe(portfolioDailyReturns),
    sortino: computeSortino(portfolioDailyReturns),
    calmar: yieldMaxDd > 0 ? yieldCagr / yieldMaxDd : 0,
    volatility: computeVolatility(portfolioDailyReturns),
    bestMonth: Math.max(...monthly.map((m) => m.return), 0),
    worstMonth: Math.min(...monthly.map((m) => m.return), 0),
    positiveMonths: monthly.filter((m) => m.return > 0).length,
    totalMonths: monthly.length,
    strategies,
    snapshots: state.snapshots,
    monthlyReturns: monthly,
    contributions: state.contributions,
    monthlyLedger: buildMonthlyLedger(
      state.contributions,
      state.snapshots,
      config.initialCapital,
    ),
    member: buildMemberSummary(
      config,
      state.contributions,
      endNav,
      state.returnIndex,
    ),
    provenance: buildProvenance(
      store,
      dates.length,
      config.startDate,
      config.endDate,
    ),
    regimeHistory,
    signalHistory,
    optimization,
  };
}

function rebalanceToTargets(
  values: Map<StrategyId, number>,
  targets: Record<StrategyId, number>,
  intensity: number,
) {
  const total = sumValues(values);
  if (total <= 0) return;

  for (const id of ALL_STRATEGY_IDS) {
    const target = targets[id] ?? 0;
    const current = values.get(id) ?? 0;
    const desired = total * target;
    const adjusted = current + (desired - current) * intensity;
    values.set(id, adjusted);
  }
}

function applyTrades(
  values: Map<StrategyId, number>,
  trades: Map<StrategyId, number>,
) {
  for (const [id, delta] of trades) {
    values.set(id, Math.max(0, (values.get(id) ?? 0) + delta));
  }
}

function sumValues(values: Map<StrategyId, number>): number {
  return [...values.values()].reduce((a, b) => a + b, 0);
}

function normalizeWeights(
  allocations: StrategyAllocation[],
): { id: StrategyId; weight: number }[] {
  const total = allocations.reduce((s, a) => s + a.weight, 0);
  return allocations.map((a) => ({
    id: a.id,
    weight: a.weight / total,
  }));
}

function sumTier(values: Map<StrategyId, number>, tier: string): number {
  let sum = 0;
  for (const [id, v] of values) {
    if (TIER_MAP[id] === tier) sum += v;
  }
  return sum;
}

function computeAlphaScale(returnHistory: number[], idx: number): number {
  if (idx < 30) return 1;
  const current = returnHistory[idx] ?? 1;
  let peak = returnHistory[0] ?? 1;
  for (let j = Math.max(0, idx - 30); j <= idx; j++) {
    peak = Math.max(peak, returnHistory[j] ?? 1);
  }
  const dd = peak > 0 ? (peak - current) / peak : 0;
  if (dd > 0.08) return 0.25;
  if (dd > 0.05) return 0.5;
  if (dd > 0.03) return 0.75;
  return 1;
}

export const PRESET_CONFIGS: Record<string, BacktestConfig> = {
  full: {
    startDate: "2022-01-01",
    endDate: "2026-06-30",
    initialCapital: 10_000_000,
    monthlyInflow: 2_100_000,
    optimized: true,
    dailyCompound: true,
    smartDca: true,
  },
  bear2022: {
    startDate: "2022-01-01",
    endDate: "2022-12-31",
    initialCapital: 10_000_000,
    monthlyInflow: 1_500_000,
    optimized: true,
    dailyCompound: true,
    smartDca: true,
  },
  bull2024: {
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    initialCapital: 25_000_000,
    monthlyInflow: 2_100_000,
    optimized: true,
    dailyCompound: true,
    smartDca: true,
  },
  recent: {
    startDate: "2025-01-01",
    endDate: "2026-06-30",
    initialCapital: 40_000_000,
    monthlyInflow: 2_100_000,
    optimized: true,
    dailyCompound: true,
    smartDca: true,
  },
};
