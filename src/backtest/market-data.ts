import type {
  BacktestConfig,
  Candle,
  ContributionRecord,
  DataProvenance,
  MemberSummary,
  MonthlyLedgerEntry,
  PortfolioSnapshot,
  PriceSeries,
  StrategyAllocation,
} from "./types";

export function getLatestMarketDate(store: Map<string, PriceSeries>): string {
  const btc = store.get("BTCUSDT");
  return btc?.candles[btc.candles.length - 1]?.date ?? "2026-06-30";
}

export function normalizeAllocations(
  allocations: StrategyAllocation[],
): { id: StrategyAllocation["id"]; weight: number }[] {
  const total = allocations.reduce((s, a) => s + a.weight, 0);
  return allocations.map((a) => ({
    id: a.id,
    weight: a.weight / total,
  }));
}

const SYMBOL_FILES: Record<string, string> = {
  BTCUSDT: "BTCUSDT",
  ETHUSDT: "ETHUSDT",
  XRPUSDT: "XRPUSDT",
  SOLUSDT: "SOLUSDT",
  AVAXUSDT: "AVAXUSDT",
  LINKUSDT: "LINKUSDT",
  ARBUSDT: "ARBUSUSDT",
  OPUSDT: "OPUSDT",
  SUIUSDT: "SUIUSDT",
  INJUSDT: "INJUSDT",
};

export async function loadMarketData(
  baseUrl = "/data/prices",
): Promise<Map<string, PriceSeries>> {
  const manifestRes = await fetch(`${baseUrl}/manifest.json`);
  if (!manifestRes.ok) throw new Error("Market data manifest not found. Run: npm run fetch-data");

  const manifest = (await manifestRes.json()) as Record<string, unknown>;
  const store = new Map<string, PriceSeries>();

  for (const symbol of Object.keys(manifest)) {
    const res = await fetch(`${baseUrl}/${symbol}.json`);
    if (!res.ok) continue;
    const candles = (await res.json()) as Candle[];
    store.set(symbol, { symbol, candles });
  }

  return store;
}

export function loadMarketDataSync(
  raw: Record<string, Candle[]>,
): Map<string, PriceSeries> {
  const store = new Map<string, PriceSeries>();
  for (const [symbol, candles] of Object.entries(raw)) {
    store.set(symbol, { symbol, candles });
  }
  return store;
}

export const MARKET_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "XRPUSDT",
  "SOLUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "ARBUSDT",
  "OPUSDT",
  "SUIUSDT",
  "INJUSDT",
] as const;

export function getContributionDates(
  startDate: string,
  endDate: string,
): string[] {
  const dates: string[] = [];
  const [startY, startM] = startDate.slice(0, 7).split("-").map(Number) as [
    number,
    number,
  ];
  const endYM = endDate.slice(0, 7);

  let y = startY;
  let m = startM;

  while (true) {
    const ym = `${y}-${String(m).padStart(2, "0")}`;
    if (ym > endYM) break;
    dates.push(`${ym}-01`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return dates;
}

export function buildProvenance(
  store: Map<string, PriceSeries>,
  tradingDays: number,
  rangeStart: string,
  rangeEnd: string,
): DataProvenance {
  const symbols = [...store.keys()].sort();
  let dataFrom = rangeStart;
  let dataTo = rangeEnd;

  for (const series of store.values()) {
    const first = series.candles[0]?.date;
    const last = series.candles[series.candles.length - 1]?.date;
    if (first && first > dataFrom) dataFrom = first;
    if (last && last < dataTo) dataTo = last;
  }

  return {
    source: "Binance Public API · daily OHLCV",
    symbols,
    dataFrom,
    dataTo,
    tradingDays,
    fetchedAt: "2026-06-30",
  };
}

export function buildMonthlyLedger(
  contributions: ContributionRecord[],
  snapshots: PortfolioSnapshot[],
  initialCapital: number,
): MonthlyLedgerEntry[] {
  const byMonth = new Map<string, number>();
  for (const c of contributions) {
    const month = c.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + c.amount);
  }

  const months = new Set<string>();
  for (const s of snapshots) months.add(s.date.slice(0, 7));
  for (const m of byMonth.keys()) months.add(m);

  const sorted = [...months].sort();
  let cumulative = initialCapital;
  const ledger: MonthlyLedgerEntry[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const month = sorted[i]!;
    const contributed = byMonth.get(month) ?? 0;
    cumulative += contributed;

    const monthSnaps = snapshots.filter((s) => s.date.startsWith(month));
    const lastSnap = monthSnaps[monthSnaps.length - 1];
    const balance = lastSnap?.nav ?? (ledger[i - 1]?.balance ?? cumulative);

    const prevBalance = i > 0 ? ledger[i - 1]!.balance : initialCapital;
    const poolReturn =
      prevBalance > 0 && lastSnap
        ? (balance - contributed - prevBalance) / prevBalance
        : 0;

    ledger.push({
      month,
      contributed,
      cumulativeContributed: cumulative,
      balance,
      yieldEarned: balance - cumulative,
      poolReturn,
    });
  }

  return ledger;
}

export function buildMemberSummary(
  config: BacktestConfig,
  contributions: ContributionRecord[],
  endNav: number,
  _returnIndex: number,
): MemberSummary {
  const flowTotal = contributions.reduce((s, c) => s + c.amount, 0);
  const totalContributed = config.initialCapital + flowTotal;
  const yieldEarned = endNav - totalContributed;
  const roi = totalContributed > 0 ? yieldEarned / totalContributed : 0;
  const contributionMonths = contributions.length;
  const avgMonthly =
    contributionMonths > 0 ? flowTotal / contributionMonths : config.monthlyInflow;

  const days = Math.max(1, contributions.length * 30);
  const cashAlternative = totalContributed * (1 + 0.045 * (days / 365.25));
  const beatCash = endNav - cashAlternative;

  return {
    totalContributed,
    initialDeposit: config.initialCapital,
    finalBalance: endNav,
    yieldEarned,
    netGain: yieldEarned,
    roi,
    contributionMonths,
    avgMonthlyContribution: avgMonthly,
    beatCash,
  };
}

export function computeBtcDcaBalance(
  store: Map<string, PriceSeries>,
  config: BacktestConfig,
  contributions: ContributionRecord[],
): number {
  const btc = store.get("BTCUSDT");
  if (!btc) return 0;

  const byDate = new Map(btc.candles.map((c) => [c.date, c.close]));
  let units = 0;

  if (config.initialCapital > 0) {
    const price = byDate.get(config.startDate) ?? btc.candles[0]?.close ?? 0;
    if (price > 0) units += config.initialCapital / price;
  }

  for (const c of contributions) {
    const price = byDate.get(c.date) ?? 0;
    if (price > 0) units += c.amount / price;
  }

  const endPrice =
    byDate.get(config.endDate) ??
    btc.candles[btc.candles.length - 1]?.close ??
    0;

  return units * endPrice;
}

export function alignDates(
  store: Map<string, PriceSeries>,
  startDate: string,
  endDate: string,
): string[] {
  const btc = store.get("BTCUSDT");
  if (!btc) throw new Error("BTCUSDT data required");

  return btc.candles
    .map((c) => c.date)
    .filter((d) => d >= startDate && d <= endDate);
}

export function getCloseOnDate(
  store: Map<string, PriceSeries>,
  symbol: string,
  date: string,
): number | null {
  const series = store.get(symbol);
  if (!series) return null;
  const candle = series.candles.find((c) => c.date === date);
  return candle?.close ?? null;
}

export function dailyReturns(
  store: Map<string, PriceSeries>,
  symbol: string,
  dates: string[],
): Map<string, number> {
  const series = store.get(symbol);
  const returns = new Map<string, number>();
  if (!series) return returns;

  const byDate = new Map(series.candles.map((c) => [c.date, c.close]));

  for (let i = 1; i < dates.length; i++) {
    const prev = byDate.get(dates[i - 1]!);
    const curr = byDate.get(dates[i]!);
    if (prev && curr && prev > 0) {
      returns.set(dates[i]!, (curr - prev) / prev);
    }
  }

  return returns;
}

export function rollingVolatility(
  returns: Map<string, number>,
  dates: string[],
  idx: number,
  window = 30,
): number {
  const slice: number[] = [];
  for (let i = Math.max(1, idx - window + 1); i <= idx; i++) {
    const r = returns.get(dates[i]!);
    if (r !== undefined) slice.push(r);
  }
  if (slice.length < 5) return 0.02;
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance =
    slice.reduce((a, b) => a + (b - mean) ** 2, 0) / (slice.length - 1);
  return Math.sqrt(variance);
}

/** Impermanent loss for 50/50 pool given price ratio k = P1/P0 */
export function impermanentLoss(k: number): number {
  if (k <= 0) return 0;
  return (2 * Math.sqrt(k)) / (1 + k) - 1;
}

/** LP daily return: fees minus IL vs holding */
export function lpDailyReturn(
  assetReturn: number,
  feeApr = 0.18,
): number {
  const k = 1 + assetReturn;
  const il = impermanentLoss(k);
  const feeDaily = feeApr / 365;
  const hodlReturn = assetReturn / 2;
  const lpReturn = hodlReturn + il + feeDaily;
  return lpReturn;
}

export function tbillDailyRate(date: string): number {
  const year = parseInt(date.slice(0, 4), 10);
  const month = parseInt(date.slice(5, 7), 10);
  let annual: number;
  if (year <= 2022) annual = 0.018;
  else if (year === 2023) annual = 0.048;
  else if (year === 2024) annual = 0.052;
  else annual = 0.048;
  const seasonal = Math.sin((month / 12) * Math.PI * 2) * 0.002;
  return (annual + seasonal) / 365;
}

export function ethStakingDailyRate(date: string): number {
  const ts = Date.parse(date);
  const postMerge = Date.parse("2022-09-15");
  const annual = ts >= postMerge ? 0.038 : 0.004;
  return annual / 365;
}

export { SYMBOL_FILES };
