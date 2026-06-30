import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runBacktest, PRESET_CONFIGS } from "../src/backtest/engine";
import { loadMarketDataSync } from "../src/backtest/market-data";
import type { Candle } from "../src/backtest/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data/prices");

function loadData() {
  const manifest = JSON.parse(
    readFileSync(join(DATA_DIR, "manifest.json"), "utf-8"),
  ) as Record<string, unknown>;

  const raw: Record<string, Candle[]> = {};
  for (const symbol of Object.keys(manifest)) {
    raw[symbol] = JSON.parse(
      readFileSync(join(DATA_DIR, `${symbol}.json`), "utf-8"),
    ) as Candle[];
  }
  return loadMarketDataSync(raw);
}

const preset = process.argv[2] ?? "full";
const config = PRESET_CONFIGS[preset];
if (!config) {
  console.error(`Unknown preset: ${preset}. Use: full | bear2022 | bull2024 | recent`);
  process.exit(1);
}

const store = loadData();
const result = runBacktest(store, config);

console.log("\n═══ LifePool Backtest Engine ═══\n");
console.log(`Period:     ${config.startDate} → ${config.endDate}`);
console.log(`Capital:    $${(config.initialCapital / 1e6).toFixed(1)}M + $${(config.monthlyInflow / 1e6).toFixed(2)}M/mo inflow`);
console.log(`CAGR:       ${(result.cagr * 100).toFixed(2)}% (yield only)`);
console.log(`End NAV:    $${(result.endNav / 1e6).toFixed(2)}M (incl. inflows)`);
console.log(`Return idx: ${result.returnIndex.toFixed(3)}x`);
console.log(`Max DD:     ${(result.maxDrawdown * 100).toFixed(1)}%`);
console.log(`Sharpe:     ${result.sharpe.toFixed(2)}`);
console.log(`Sortino:    ${result.sortino.toFixed(2)}`);
console.log(`Volatility: ${(result.volatility * 100).toFixed(1)}%`);
console.log(`Win months: ${result.positiveMonths}/${result.totalMonths}`);

console.log("\n── Strategy breakdown ──\n");
for (const s of result.strategies.sort((a, b) => b.totalReturn - a.totalReturn)) {
  console.log(
    `${s.name.padEnd(28)} ${(s.allocation * 100).toFixed(0).padStart(2)}%  ` +
      `CAGR ${(s.cagr * 100).toFixed(1).padStart(5)}%  ` +
      `DD ${(s.maxDrawdown * 100).toFixed(1).padStart(5)}%  ` +
      `Sharpe ${s.sharpe.toFixed(2)}`,
  );
}

const outPath = join(DATA_DIR, `backtest-${preset}.json`);
writeFileSync(outPath, JSON.stringify(result, null, 0));
console.log(`\nResults saved to ${outPath}\n`);
