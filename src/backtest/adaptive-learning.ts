import type { GridSimulatorParams, RegimeAllocationMap } from "./grid-params";
import type { PriceSeries, StrategyId } from "./types";
import type { IntelSnapshot, MarketSignal } from "./signals";
import { detectSignalSeries, generateMoves } from "./signals";
import { dailyReturns, getCloseOnDate } from "./market-data";

export interface PatternStats {
  id: string;
  triggers: number;
  wins30d: number;
  winRate30d: number;
  avgReturn30d: number;
  /** Blended learned confidence (prior + empirical). */
  learnedWeight: number;
}

export interface WalkForwardMetrics {
  trainScore: number;
  holdoutScore: number;
  upliftVsBaseline: number;
  folds: number;
}

export interface LearnedStrategyConfig {
  version: 1;
  learnedAt: string;
  gridParams: GridSimulatorParams;
  regime: RegimeAllocationMap;
  staticGrid: number;
  patternStats: PatternStats[];
  walkForward: WalkForwardMetrics;
}

const PATTERN_PRIORS: Record<string, { winRate: number; weight: number }> = {
  "grid-vol-expansion": { winRate: 0.81, weight: 0.75 },
  "capitulation-flush": { winRate: 0.79, weight: 0.85 },
  "swing-rally": { winRate: 0.72, weight: 0.55 },
  "accumulation-zone": { winRate: 0.76, weight: 0.7 },
  "bull-stake-tilt": { winRate: 0.74, weight: 0.6 },
  "recovery-breakout": { winRate: 0.71, weight: 0.65 },
  "hold-course": { winRate: 0.55, weight: 0.4 },
};

let cachedLearned: LearnedStrategyConfig | null = null;

export function setLearnedStrategy(config: LearnedStrategyConfig | null): void {
  cachedLearned = config;
}

export function getLearnedStrategySync(): LearnedStrategyConfig | null {
  return cachedLearned;
}

export function getLearnedPatternMap(): Map<string, PatternStats> {
  const map = new Map<string, PatternStats>();
  for (const p of cachedLearned?.patternStats ?? []) {
    map.set(p.id, p);
  }
  return map;
}

/** Fetch learned config for browser runtime (PoolContext / BacktestLab). */
export async function fetchLearnedStrategy(): Promise<LearnedStrategyConfig | null> {
  try {
    const res = await fetch("/data/prices/learned-strategy.json");
    if (!res.ok) return null;
    const data = (await res.json()) as LearnedStrategyConfig;
    if (data.version !== 1) return null;
    cachedLearned = data;
    return data;
  } catch {
    return null;
  }
}

const FORWARD_DAYS = 30;
const MIN_TRIGGERS = 3;

/** Calibrate pattern win rates from historical signal triggers vs forward BTC returns. */
export function learnPatternStats(
  store: Map<string, PriceSeries>,
  dates: string[],
): PatternStats[] {
  const signals = detectSignalSeries(store, dates);
  const returnMap = dailyReturns(store, "BTCUSDT", dates);

  const accum = new Map<string, { triggers: number; wins: number; sumRet: number }>();

  for (const signal of signals) {
    const moves = generateMoves(signal);
    const idx = dates.indexOf(signal.date);
    if (idx < 0 || idx + FORWARD_DAYS >= dates.length) continue;

    let forward = 1;
    for (let d = 1; d <= FORWARD_DAYS; d++) {
      const r = returnMap.get(dates[idx + d]!);
      if (r !== undefined) forward *= 1 + r;
    }
    const ret30 = forward - 1;
    const win = ret30 > 0;

    for (const move of moves) {
      const entry = accum.get(move.id) ?? { triggers: 0, wins: 0, sumRet: 0 };
      entry.triggers += 1;
      if (win) entry.wins += 1;
      entry.sumRet += ret30;
      accum.set(move.id, entry);
    }
  }

  const stats: PatternStats[] = [];

  for (const [id, prior] of Object.entries(PATTERN_PRIORS)) {
    const emp = accum.get(id);
    const triggers = emp?.triggers ?? 0;
    const wins = emp?.wins ?? 0;
    const empiricalWin = triggers >= MIN_TRIGGERS ? wins / triggers : prior.winRate;
    const empiricalRet = triggers >= MIN_TRIGGERS ? (emp!.sumRet / triggers) : 0.08;

    // Bayesian blend: more data → trust empirical more
    const dataWeight = Math.min(1, triggers / 25);
    const winRate30d = prior.winRate * (1 - dataWeight) + empiricalWin * dataWeight;
    const learnedWeight = Math.min(0.95, prior.weight * (0.6 + winRate30d * 0.4));

    stats.push({
      id,
      triggers,
      wins30d: wins,
      winRate30d,
      avgReturn30d: empiricalRet,
      learnedWeight,
    });
  }

  return stats.sort((a, b) => b.learnedWeight - a.learnedWeight);
}

/** Enrich intel moves with empirically learned pattern confidence. */
export function enrichIntelMoves(intel: IntelSnapshot): IntelSnapshot {
  const map = getLearnedPatternMap();
  if (map.size === 0) return intel;

  const moves = intel.moves.map((move) => {
    const learned = map.get(move.id);
    if (!learned || learned.triggers < MIN_TRIGGERS) return move;
    return {
      ...move,
      confidence: learned.learnedWeight,
      historicalEdge: `${(learned.winRate30d * 100).toFixed(0)}% win · +${(learned.avgReturn30d * 100).toFixed(0)}% avg 30d · n=${learned.triggers}`,
    };
  });

  return { ...intel, moves };
}

/** Apply top pattern moves with learned confidence onto base allocation weights. */
export function applyAdaptiveWeights(
  signal: MarketSignal,
  baseWeights: Record<StrategyId, number>,
  patternMap?: Map<string, PatternStats>,
): Record<StrategyId, number> {
  const moves = generateMoves(signal);
  let grid = baseWeights["btc-grid"] ?? 0.7;
  let stake = baseWeights["btc-stake"] ?? 0.3;

  for (const move of moves.slice(0, 3)) {
    const shift = move.allocationShift;
    if (shift["btc-grid"] === undefined) continue;

    const stats = patternMap?.get(move.id);
    const confidence = stats?.learnedWeight ?? move.confidence;
    const priorityWeight =
      move.priority === "now" ? 0.4 : move.priority === "soon" ? 0.25 : 0.12;
    const blend = priorityWeight * confidence;

    const targetGrid = shift["btc-grid"];
    const targetStake = shift["btc-stake"] ?? 1 - targetGrid;
    grid = grid * (1 - blend) + targetGrid * blend;
    stake = stake * (1 - blend) + targetStake * blend;
  }

  const sum = grid + stake;
  if (sum <= 0) return { ...baseWeights };
  return { "btc-grid": grid / sum, "btc-stake": stake / sum };
}

/** Walk-forward date windows: 15mo train → 5mo holdout, step 3mo. */
export function buildWalkForwardWindows(
  dates: string[],
  trainDays = 450,
  holdoutDays = 150,
  stepDays = 90,
): { train: { start: string; end: string }; holdout: { start: string; end: string } }[] {
  const windows: { train: { start: string; end: string }; holdout: { start: string; end: string } }[] =
    [];

  for (let i = trainDays; i + holdoutDays < dates.length; i += stepDays) {
    const trainStart = dates[i - trainDays]!;
    const trainEnd = dates[i - 1]!;
    const holdStart = dates[i]!;
    const holdEnd = dates[Math.min(i + holdoutDays - 1, dates.length - 1)]!;
    windows.push({
      train: { start: trainStart, end: trainEnd },
      holdout: { start: holdStart, end: holdEnd },
    });
  }

  return windows;
}

export function forwardBtcReturn(
  store: Map<string, PriceSeries>,
  fromDate: string,
  days: number,
): number | null {
  const btc = store.get("BTCUSDT");
  if (!btc) return null;
  const startClose = getCloseOnDate(store, "BTCUSDT", fromDate);
  if (startClose === null) return null;

  const idx = btc.candles.findIndex((c) => c.date === fromDate);
  if (idx < 0 || idx + days >= btc.candles.length) return null;

  const endClose = btc.candles[idx + days]!.close;
  return endClose / startClose - 1;
}
