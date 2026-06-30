import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runBacktest } from "../src/backtest/engine";
import { loadMarketDataSync } from "../src/backtest/market-data";
import type { Candle } from "../src/backtest/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data/prices");

const manifest = JSON.parse(
  readFileSync(join(DATA_DIR, "manifest.json"), "utf-8"),
) as Record<string, unknown>;
const raw: Record<string, Candle[]> = {};
for (const symbol of Object.keys(manifest)) {
  raw[symbol] = JSON.parse(
    readFileSync(join(DATA_DIR, `${symbol}.json`), "utf-8"),
  ) as Candle[];
}
const store = loadMarketDataSync(raw);
const base = {
  startDate: "2022-02-01",
  endDate: "2023-04-30",
  initialCapital: 0,
  monthlyInflow: 444,
};

const staticOnly = runBacktest(store, {
  ...base,
  optimized: false,
  opportunityMode: false,
});
const optimized = runBacktest(store, {
  ...base,
  optimized: true,
  dailyCompound: true,
  smartDca: true,
  opportunityMode: false,
});
const full = runBacktest(store, {
  ...base,
  optimized: true,
  dailyCompound: true,
  smartDca: true,
  opportunityMode: true,
});

for (const [name, r] of [
  ["Static", staticOnly],
  ["Optimized", optimized],
  ["+ Opportunity", full],
] as const) {
  console.log(
    `${name}: NAV $${r.endNav.toFixed(0)} · ROI ${(r.member.roi * 100).toFixed(1)}% · yield +$${r.member.yieldEarned.toFixed(0)}`,
  );
}

const highDays = full.signalHistory.filter(
  (s) => s.opportunity === "high" || s.opportunity === "extreme",
).length;
console.log(`High-opportunity days in window: ${highDays}`);
console.log(
  `Opportunity uplift vs optimized: +$${(full.endNav - optimized.endNav).toFixed(0)}`,
);
