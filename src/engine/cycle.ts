/** Minimum commitment per investment cycle */
export const CYCLE_LOCK = {
  years: 4,
  months: 4,
  days: 4,
} as const;

export const CYCLE_LOCK_LABEL = "4 years · 4 months · 4 days";

export function addCycleLock(startDate: string): string {
  const [y, m, d] = startDate.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  date.setUTCFullYear(date.getUTCFullYear() + CYCLE_LOCK.years);
  date.setUTCMonth(date.getUTCMonth() + CYCLE_LOCK.months);
  date.setUTCDate(date.getUTCDate() + CYCLE_LOCK.days);
  return date.toISOString().slice(0, 10);
}

export function cycleProgress(
  cycleStart: string,
  cycleEnd: string,
  asOf: string,
): number {
  const start = Date.parse(cycleStart);
  const end = Date.parse(cycleEnd);
  const now = Date.parse(asOf);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.min(100, ((now - start) / (end - start)) * 100);
}

export function cycleDaysRemaining(cycleEnd: string, asOf: string): number {
  const end = Date.parse(cycleEnd);
  const now = Date.parse(asOf);
  if (now >= end) return 0;
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

export function isCycleComplete(cycleEnd: string, asOf: string): boolean {
  return Date.parse(asOf) >= Date.parse(cycleEnd);
}
