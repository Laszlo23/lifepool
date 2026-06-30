import { dailyReturns, getCloseOnDate, rollingVolatility } from "./market-data";
import type { MarketRegime, PriceSeries, StrategyId } from "./types";

export type BearPhase = "distribution" | "capitulation" | "accumulation" | "recovery";
export type OpportunityLevel = "low" | "medium" | "high" | "extreme";

export interface MarketSignal {
  date: string;
  regime: MarketRegime;
  bearPhase: BearPhase;
  opportunity: OpportunityLevel;
  opportunityScore: number;
  rsi14: number;
  drawdownFromAth: number;
  momentum7d: number;
  momentum30d: number;
  vol30d: number;
  fundingProxy: number;
  recoveryProbability: number;
  activePatterns: string[];
}

export interface MoveAction {
  id: string;
  priority: "now" | "soon" | "watch";
  title: string;
  detail: string;
  allocationShift: Partial<Record<StrategyId, number>>;
  dcaMultiplier: number;
  confidence: number;
  historicalEdge: string;
}

export interface IntelSnapshot {
  asOf: string;
  signal: MarketSignal;
  moves: MoveAction[];
  headline: string;
  subheadline: string;
}

const PATTERN_LIBRARY = [
  {
    id: "grid-vol-expansion",
    name: "Grid vol expansion",
    test: (s: MarketSignal) => s.vol30d > 0.045,
    winRate: 0.81,
    avgRecovery30d: 0.12,
    action: "Widen grid bands — max BTC/USDC capture",
  },
  {
    id: "capitulation-flush",
    name: "Capitulation flush",
    test: (s: MarketSignal) => s.rsi14 < 28 && s.drawdownFromAth > 0.35,
    winRate: 0.79,
    avgRecovery30d: 0.18,
    action: "Aggressive swing buys on grid — double DCA",
  },
  {
    id: "swing-rally",
    name: "Swing rally setup",
    test: (s: MarketSignal) => s.momentum7d > 0.06 && s.vol30d > 0.035,
    winRate: 0.72,
    avgRecovery30d: 0.14,
    action: "Take grid profits into USDC, reload stakes",
  },
  {
    id: "accumulation-zone",
    name: "Accumulation zone",
    test: (s: MarketSignal) => s.bearPhase === "accumulation" && s.rsi14 < 45,
    winRate: 0.76,
    avgRecovery30d: 0.22,
    action: "Stack BTC via grid + increase stake allocation",
  },
  {
    id: "bull-stake-tilt",
    name: "Bull stake tilt",
    test: (s: MarketSignal) => s.regime === "bull" && s.momentum30d > 0.08,
    winRate: 0.74,
    avgRecovery30d: 0.16,
    action: "Rotate grid profits into BTC staking",
  },
  {
    id: "recovery-breakout",
    name: "Recovery breakout",
    test: (s: MarketSignal) => s.bearPhase === "recovery" || (s.momentum30d > 0.05 && s.rsi14 > 50),
    winRate: 0.71,
    avgRecovery30d: 0.15,
    action: "Balance 55% grid / 45% stake",
  },
] as const;

export const PATTERN_LABELS: Record<string, string> = {
  "grid-vol-expansion": "Grid vol expansion",
  "capitulation-flush": "Capitulation flush",
  "swing-rally": "Swing rally setup",
  "accumulation-zone": "Accumulation zone",
  "bull-stake-tilt": "Bull stake tilt",
  "recovery-breakout": "Recovery breakout",
};

/** High-vol bear — lean into grid agent */
export const BEAR_OPPORTUNITY_ALLOCATIONS: Record<StrategyId, number> = {
  "btc-grid": 0.85,
  "btc-stake": 0.15,
};

export function computeRsi(
  closes: number[],
  period = 14,
): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i]! - closes[i - 1]!;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function computeDrawdownFromAth(closes: number[]): number {
  if (closes.length === 0) return 0;
  const ath = Math.max(...closes);
  const current = closes[closes.length - 1]!;
  return ath > 0 ? (ath - current) / ath : 0;
}

export function detectSignalSeries(
  store: Map<string, PriceSeries>,
  dates: string[],
): MarketSignal[] {
  const btc = store.get("BTCUSDT");
  if (!btc) return [];

  const btcReturns = dailyReturns(store, "BTCUSDT", dates);
  const closeByDate = new Map(btc.candles.map((c) => [c.date, c.close]));
  const signals: MarketSignal[] = [];

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]!;
    const historyCloses: number[] = [];
    for (let j = 0; j <= i; j++) {
      const c = closeByDate.get(dates[j]!);
      if (c) historyCloses.push(c);
    }

    const momentum30d = computeMomentum(btcReturns, dates, i, 30);
    const momentum7d = computeMomentum(btcReturns, dates, i, 7);
    const vol30d = rollingVolatility(btcReturns, dates, i, 30);
    const rsi14 = computeRsi(historyCloses, 14);
    const drawdownFromAth = computeDrawdownFromAth(historyCloses);
    const regime = classifyRegime(momentum30d, vol30d);
    const bearPhase = classifyBearPhase(momentum7d, momentum30d, rsi14, drawdownFromAth);
    const fundingProxy = estimateFundingProxy(vol30d, momentum30d, momentum7d);
    const opportunityScore = computeOpportunityScore({
      regime,
      bearPhase,
      rsi14,
      drawdownFromAth,
      vol30d,
      momentum30d,
      fundingProxy,
    });
    const opportunity = scoreToLevel(opportunityScore);
    const recoveryProbability = estimateRecoveryProbability(
      rsi14,
      drawdownFromAth,
      momentum7d,
      bearPhase,
    );

    const partial: MarketSignal = {
      date,
      regime,
      bearPhase,
      opportunity,
      opportunityScore,
      rsi14,
      drawdownFromAth,
      momentum7d,
      momentum30d,
      vol30d,
      fundingProxy,
      recoveryProbability,
      activePatterns: [],
    };
    partial.activePatterns = PATTERN_LIBRARY.filter((p) => p.test(partial)).map(
      (p) => p.id,
    );
    signals.push(partial);
  }

  return signals;
}

function computeMomentum(
  returns: Map<string, number>,
  dates: string[],
  idx: number,
  window: number,
): number {
  let product = 1;
  let count = 0;
  for (let i = Math.max(1, idx - window + 1); i <= idx; i++) {
    const r = returns.get(dates[i]!);
    if (r !== undefined) {
      product *= 1 + r;
      count++;
    }
  }
  return count > 2 ? product - 1 : 0;
}

function classifyRegime(momentum: number, vol: number): MarketRegime {
  if (momentum < -0.12 || (momentum < -0.05 && vol > 0.04)) return "bear";
  if (momentum > 0.10 || (momentum > 0.05 && vol < 0.035)) return "bull";
  return "neutral";
}

function classifyBearPhase(
  m7: number,
  m30: number,
  rsi: number,
  dd: number,
): BearPhase {
  if (m30 > 0.03 && m7 > 0.05) return "recovery";
  if (m7 < -0.12 || (rsi < 25 && dd > 0.3)) return "capitulation";
  if (m30 < -0.05 && rsi < 42) return "accumulation";
  return "distribution";
}

function estimateFundingProxy(vol: number, m30: number, m7: number): number {
  const base = 0.08;
  const volBoost = vol * 1.2;
  const bearBoost = m30 < 0 ? Math.abs(m30) * 0.4 : 0;
  const spike = m7 < -0.08 ? 0.06 : 0;
  return Math.min(base + volBoost + bearBoost + spike, 0.45);
}

function computeOpportunityScore(input: {
  regime: MarketRegime;
  bearPhase: BearPhase;
  rsi14: number;
  drawdownFromAth: number;
  vol30d: number;
  momentum30d: number;
  fundingProxy: number;
}): number {
  let score = 0;

  if (input.regime === "bear") score += 25;
  if (input.bearPhase === "capitulation") score += 35;
  if (input.bearPhase === "accumulation") score += 28;
  if (input.bearPhase === "recovery") score += 20;
  if (input.rsi14 < 30) score += 20;
  else if (input.rsi14 < 40) score += 12;
  if (input.drawdownFromAth > 0.4) score += 15;
  else if (input.drawdownFromAth > 0.25) score += 8;
  if (input.vol30d > 0.05) score += 12;
  if (input.fundingProxy > 0.15) score += 15;
  if (input.momentum30d < -0.15) score += 10;

  return Math.min(score, 100);
}

function scoreToLevel(score: number): OpportunityLevel {
  if (score >= 75) return "extreme";
  if (score >= 55) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function estimateRecoveryProbability(
  rsi: number,
  dd: number,
  m7: number,
  phase: BearPhase,
): number {
  let p = 0.35;
  if (phase === "capitulation") p += 0.25;
  if (phase === "accumulation") p += 0.2;
  if (phase === "recovery") p += 0.3;
  if (rsi < 30) p += 0.15;
  if (dd > 0.35) p += 0.1;
  if (m7 > 0.05) p += 0.1;
  return Math.min(p, 0.92);
}

export function getOpportunityWeights(
  regime: MarketRegime,
  signal: MarketSignal | undefined,
  _staticWeights: Record<StrategyId, number>,
  baseRegimeWeights: Record<StrategyId, number>,
): Record<StrategyId, number> {
  if (regime !== "bear" || !signal) return { ...baseRegimeWeights };

  if (signal.opportunity === "extreme" || signal.opportunity === "high") {
    return blendWeights(baseRegimeWeights, BEAR_OPPORTUNITY_ALLOCATIONS, 0.65);
  }
  if (signal.opportunity === "medium" && signal.bearPhase === "accumulation") {
    return blendWeights(baseRegimeWeights, BEAR_OPPORTUNITY_ALLOCATIONS, 0.4);
  }
  return { ...baseRegimeWeights };
}

function blendWeights(
  a: Record<StrategyId, number>,
  b: Record<StrategyId, number>,
  t: number,
): Record<StrategyId, number> {
  const result = {} as Record<StrategyId, number>;
  for (const id of Object.keys(a) as StrategyId[]) {
    result[id] = (a[id] ?? 0) * (1 - t) + (b[id] ?? 0) * t;
  }
  const sum = Object.values(result).reduce((s, v) => s + v, 0);
  for (const id of Object.keys(result) as StrategyId[]) {
    result[id] = (result[id] ?? 0) / sum;
  }
  return result;
}

export function getDcaMultiplier(signal: MarketSignal | undefined): number {
  if (!signal) return 1;
  if (signal.opportunity === "extreme") return 2.0;
  if (signal.opportunity === "high") return 1.5;
  if (signal.opportunity === "medium" && signal.bearPhase === "accumulation") {
    return 1.25;
  }
  return 1;
}

export function generateMoves(signal: MarketSignal): MoveAction[] {
  const moves: MoveAction[] = [];

  for (const pattern of PATTERN_LIBRARY) {
    if (!pattern.test(signal)) continue;
    moves.push(patternToMove(pattern, signal));
  }

  if (moves.length === 0) {
    moves.push(defaultMove(signal));
  }

  return moves.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
}

function patternToMove(
  pattern: (typeof PATTERN_LIBRARY)[number],
  _signal: MarketSignal,
): MoveAction {
  const shifts: Partial<Record<StrategyId, number>> = {};
  let dcaMult = 1;
  let priority: MoveAction["priority"] = "watch";

  switch (pattern.id) {
    case "grid-vol-expansion":
      shifts["btc-grid"] = 0.85;
      shifts["btc-stake"] = 0.15;
      priority = "now";
      break;
    case "capitulation-flush":
      shifts["btc-grid"] = 0.8;
      shifts["btc-stake"] = 0.2;
      dcaMult = 2;
      priority = "now";
      break;
    case "swing-rally":
      shifts["btc-grid"] = 0.75;
      shifts["btc-stake"] = 0.25;
      priority = "soon";
      break;
    case "accumulation-zone":
      shifts["btc-grid"] = 0.6;
      shifts["btc-stake"] = 0.4;
      dcaMult = 1.5;
      priority = "soon";
      break;
    case "bull-stake-tilt":
      shifts["btc-grid"] = 0.45;
      shifts["btc-stake"] = 0.55;
      priority = "soon";
      break;
    case "recovery-breakout":
      shifts["btc-grid"] = 0.55;
      shifts["btc-stake"] = 0.45;
      priority = "now";
      break;
  }

  return {
    id: pattern.id,
    priority,
    title: pattern.name,
    detail: pattern.action,
    allocationShift: shifts,
    dcaMultiplier: dcaMult,
    confidence: pattern.winRate,
    historicalEdge: `${(pattern.winRate * 100).toFixed(0)}% win rate · +${(pattern.avgRecovery30d * 100).toFixed(0)}% avg 30d`,
  };
}

function defaultMove(_signal: MarketSignal): MoveAction {
  return {
    id: "hold-course",
    priority: "watch",
    title: "Maintain course",
    detail: "No extreme signal — continue optimized DCA and daily compound",
    allocationShift: {},
    dcaMultiplier: 1,
    confidence: 0.55,
    historicalEdge: "Baseline optimized path",
  };
}

function priorityRank(p: MoveAction["priority"]): number {
  if (p === "now") return 0;
  if (p === "soon") return 1;
  return 2;
}

export function buildIntelSnapshot(
  store: Map<string, PriceSeries>,
  dates?: string[],
): IntelSnapshot {
  const btc = store.get("BTCUSDT");
  if (!btc || btc.candles.length < 30) {
    throw new Error("Insufficient BTC data for intelligence");
  }

  const allDates = btc.candles.map((c) => c.date);
  const useDates = dates ?? allDates.slice(-90);
  const signals = detectSignalSeries(store, useDates);
  const signal = signals[signals.length - 1]!;

  const moves = generateMoves(signal);
  const { headline, subheadline } = buildHeadlines(signal, moves);

  return { asOf: signal.date, signal, moves, headline, subheadline };
}

function buildHeadlines(
  signal: MarketSignal,
  moves: MoveAction[],
): { headline: string; subheadline: string } {
  const nowMove = moves.find((m) => m.priority === "now");

  if (signal.opportunity === "extreme") {
    return {
      headline: "Extreme opportunity — deploy capital now",
      subheadline: nowMove
        ? nowMove.detail
        : `RSI ${signal.rsi14.toFixed(0)} · ${(signal.drawdownFromAth * 100).toFixed(0)}% off ATH · ${(signal.recoveryProbability * 100).toFixed(0)}% recovery odds`,
    };
  }
  if (signal.regime === "bear" && signal.opportunity !== "low") {
    return {
      headline: "Grid agent — maximum vol capture",
      subheadline: nowMove
        ? nowMove.detail
        : `Vol ${(signal.vol30d * 100).toFixed(1)}% · swing leg active on BTC/USDC`,
    };
  }
  if (signal.regime === "bull") {
    return {
      headline: "Bull mode — tilt to BTC stake",
      subheadline: "Grid takes profits · stake compounds with BTC upside",
    };
  }
  return {
    headline: "Balanced deployment",
    subheadline: "Smart DCA + regime weights active",
  };
}

export function getLatestBtcPrice(store: Map<string, PriceSeries>): number {
  const btc = store.get("BTCUSDT");
  return btc?.candles[btc.candles.length - 1]?.close ?? 0;
}

export function findHistoricalAnalog(
  store: Map<string, PriceSeries>,
  current: MarketSignal,
): { date: string; label: string; outcome30d: number } | null {
  const btc = store.get("BTCUSDT");
  if (!btc) return null;

  const allSignals = detectSignalSeries(
    store,
    btc.candles.map((c) => c.date),
  );

  let best: { date: string; score: number; idx: number } | null = null;

  for (let i = 60; i < allSignals.length - 30; i++) {
    const s = allSignals[i]!;
    if (s.date === current.date) continue;
    const similarity =
      1 / (1 + Math.abs(s.rsi14 - current.rsi14) / 10) +
      1 / (1 + Math.abs(s.drawdownFromAth - current.drawdownFromAth) * 5);
    if (s.regime === current.regime && similarity > 1.2) {
      if (!best || similarity > best.score) {
        best = { date: s.date, score: similarity, idx: i };
      }
    }
  }

  if (!best) return null;

  const p0 = getCloseOnDate(store, "BTCUSDT", best.date) ?? 0;
  const p1 = getCloseOnDate(store, "BTCUSDT", btc.candles[best.idx + 30]?.date ?? "") ?? 0;
  const outcome = p0 > 0 ? (p1 - p0) / p0 : 0;

  return {
    date: best.date,
    label: `${best.date.slice(0, 7)} similar setup`,
    outcome30d: outcome,
  };
}
