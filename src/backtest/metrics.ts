import type { DailyReturn, PortfolioSnapshot } from "./types";

export function computeMaxDrawdown(values: number[]): number {
  if (values.length === 0) return 0;
  let peak = values[0] ?? 0;
  let maxDd = 0;

  for (const v of values) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }

  return maxDd;
}

export function computeCagr(
  startValue: number,
  endValue: number,
  days: number,
): number {
  if (startValue <= 0 || days <= 0) return 0;
  const years = days / 365.25;
  return Math.pow(endValue / startValue, 1 / years) - 1;
}

export function computeSharpe(
  dailyReturns: number[],
  riskFreeDaily = 0.00012,
): number {
  if (dailyReturns.length < 2) return 0;
  const excess = dailyReturns.map((r) => r - riskFreeDaily);
  const mean = excess.reduce((a, b) => a + b, 0) / excess.length;
  const variance =
    excess.reduce((a, b) => a + (b - mean) ** 2, 0) / (excess.length - 1);
  const std = Math.sqrt(variance);
  if (std < 1e-10) return mean > 0 ? 3 : 0;
  return (mean / std) * Math.sqrt(365.25);
}

export function computeSortino(
  dailyReturns: number[],
  riskFreeDaily = 0.00012,
): number {
  if (dailyReturns.length < 2) return 0;
  const excess = dailyReturns.map((r) => r - riskFreeDaily);
  const mean = excess.reduce((a, b) => a + b, 0) / excess.length;
  const downside = excess.filter((r) => r < 0);
  if (downside.length === 0) return mean > 0 ? 10 : 0;
  const downsideVar =
    downside.reduce((a, b) => a + b * b, 0) / downside.length;
  const downsideStd = Math.sqrt(downsideVar);
  if (downsideStd === 0) return 0;
  return (mean / downsideStd) * Math.sqrt(365.25);
}

export function computeVolatility(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) /
    (dailyReturns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(365.25);
}

export function monthlyReturnsFromDaily(
  snapshots: { date: string; nav: number }[],
): { month: string; return: number }[] {
  const byMonth = new Map<string, number[]>();

  for (const s of snapshots) {
    const month = s.date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month)!.push(s.nav);
  }

  const result: { month: string; return: number }[] = [];
  let prevEnd = snapshots[0]?.nav ?? 0;

  for (const [month, navs] of [...byMonth.entries()].sort()) {
    const end = navs[navs.length - 1]!;
    const ret = prevEnd > 0 ? (end - prevEnd) / prevEnd : 0;
    result.push({ month, return: ret });
    prevEnd = end;
  }

  return result;
}

export function rollingBlendedApy(
  snapshots: PortfolioSnapshot[],
  idx: number,
  window = 30,
): number {
  if (idx < window) return 0;
  const start = snapshots[idx - window]!.nav;
  const end = snapshots[idx]!.nav;
  if (start <= 0) return 0;
  const totalReturn = end / start - 1;
  return totalReturn * (365.25 / window);
}

export function tierNav(
  strategyValues: Map<string, number>,
  tier: string,
  tierMap: Record<string, string>,
): number {
  let sum = 0;
  for (const [id, value] of strategyValues) {
    if (tierMap[id] === tier) sum += value;
  }
  return sum;
}

export function toDailyReturnSeries(
  values: { date: string; value: number }[],
): DailyReturn[] {
  const returns: DailyReturn[] = [];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1]!.value;
    const curr = values[i]!.value;
    returns.push({
      date: values[i]!.date,
      return: prev > 0 ? (curr - prev) / prev : 0,
    });
  }
  return returns;
}
