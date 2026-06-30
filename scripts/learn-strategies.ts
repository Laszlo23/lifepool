/**
 * Walk-forward learning: optimize grid params, calibrate patterns, persist learned config.
 * Run: npm run learn
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { alignDates } from "../src/backtest/market-data";
import { runBacktest, PRESET_CONFIGS } from "../src/backtest/engine";
import { loadMarketDataSync } from "../src/backtest/market-data";
import {
  BASELINE_GRID_PARAMS,
  BASELINE_REGIME_ALLOCATIONS,
  OPTIMIZED_GRID_PARAMS,
  OPTIMIZED_REGIME_ALLOCATIONS,
  type GridSimulatorParams,
  type RegimeAllocationMap,
} from "../src/backtest/grid-params";
import {
  buildWalkForwardWindows,
  learnPatternStats,
  setLearnedStrategy,
  type LearnedStrategyConfig,
} from "../src/backtest/adaptive-learning";
import { setGridParamOverride, clearGridParamOverride } from "../src/backtest/simulators";
import {
  setRegimeAllocationOverride,
  clearRegimeAllocationOverride,
} from "../src/backtest/allocator";
import type { BacktestResult, Candle, StrategyAllocation } from "../src/backtest/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data/prices");
const PUBLIC_DIR = join(__dirname, "../public/data/prices");

interface Candidate {
  gridParams: GridSimulatorParams;
  regime: RegimeAllocationMap;
  staticGrid: number;
  holdoutScore: number;
  trainScore: number;
  metrics: BacktestResult;
}

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

function scoreResult(r: BacktestResult): number {
  const winRate = r.totalMonths > 0 ? r.positiveMonths / r.totalMonths : 0;
  return (
    r.sharpe * 0.35 +
    r.calmar * 0.25 +
    r.cagr * 0.2 +
    winRate * 0.1 -
    r.maxDrawdown * 0.1
  );
}

function runWindow(
  store: ReturnType<typeof loadData>,
  gridParams: GridSimulatorParams,
  regime: RegimeAllocationMap,
  staticGrid: number,
  start: string,
  end: string,
  adaptiveMode: boolean,
): BacktestResult {
  setGridParamOverride(gridParams);
  setRegimeAllocationOverride(regime);
  const allocations: StrategyAllocation[] = [
    { id: "btc-grid", weight: staticGrid },
    { id: "btc-stake", weight: 1 - staticGrid },
  ];
  const result = runBacktest(
    store,
    {
      startDate: start,
      endDate: end,
      initialCapital: 10_000_000,
      monthlyInflow: 1_800_000,
      optimized: true,
      dailyCompound: true,
      smartDca: true,
      opportunityMode: true,
      adaptiveMode,
    },
    allocations,
  );
  clearGridParamOverride();
  clearRegimeAllocationOverride();
  return result;
}

function evaluateCandidate(
  store: ReturnType<typeof loadData>,
  allDates: string[],
  gridParams: GridSimulatorParams,
  regime: RegimeAllocationMap,
  staticGrid: number,
): Candidate {
  const windows = buildWalkForwardWindows(allDates);
  let trainTotal = 0;
  let holdoutTotal = 0;

  for (const w of windows) {
    const train = runWindow(store, gridParams, regime, staticGrid, w.train.start, w.train.end, false);
    const hold = runWindow(store, gridParams, regime, staticGrid, w.holdout.start, w.holdout.end, true);
    trainTotal += scoreResult(train);
    holdoutTotal += scoreResult(hold);
  }

  const folds = Math.max(windows.length, 1);
  const full = runWindow(
    store,
    gridParams,
    regime,
    staticGrid,
    allDates[0]!,
    allDates[allDates.length - 1]!,
    true,
  );

  return {
    gridParams,
    regime,
    staticGrid,
    trainScore: trainTotal / folds,
    holdoutScore: holdoutTotal / folds,
    metrics: full,
  };
}

function mutateParams(base: GridSimulatorParams): GridSimulatorParams {
  const jitter = (v: number, pct: number) => v * (1 + (Math.random() - 0.5) * pct);
  return {
    ...base,
    vol7Coeff: jitter(base.vol7Coeff, 0.08),
    vol30Coeff: jitter(base.vol30Coeff, 0.08),
    swingCapture: Math.min(0.62, jitter(base.swingCapture, 0.06)),
    maxDailyLoss: Math.max(-0.03, jitter(base.maxDailyLoss, 0.05)),
  };
}

function* sampleCandidates(): Generator<{
  gridParams: GridSimulatorParams;
  regime: RegimeAllocationMap;
  staticGrid: number;
}> {
  const seeds = [
    { grid: OPTIMIZED_GRID_PARAMS, regime: OPTIMIZED_REGIME_ALLOCATIONS, staticGrid: 0.7 },
    { grid: BASELINE_GRID_PARAMS, regime: BASELINE_REGIME_ALLOCATIONS, staticGrid: 0.68 },
  ];

  for (const seed of seeds) {
    yield seed;
    for (let i = 0; i < 12; i++) {
      yield {
        gridParams: mutateParams(seed.grid),
        regime: seed.regime,
        staticGrid: seed.staticGrid,
      };
    }
  }

  const vol7 = [0.54, 0.58, 0.62, 0.66];
  const vol30 = [0.28, 0.32, 0.36];
  const bearGrid = [0.82, 0.86];
  const neutralGrid = [0.68, 0.72];
  const bullGrid = [0.54, 0.58];

  for (const v7 of vol7) {
    for (const v30 of vol30) {
      for (const bg of bearGrid) {
        for (const ng of neutralGrid) {
          for (const ug of bullGrid) {
            yield {
              gridParams: { ...OPTIMIZED_GRID_PARAMS, vol7Coeff: v7, vol30Coeff: v30 },
              regime: {
                bear: { "btc-grid": bg, "btc-stake": 1 - bg },
                neutral: { "btc-grid": ng, "btc-stake": 1 - ng },
                bull: { "btc-grid": ug, "btc-stake": 1 - ug },
              },
              staticGrid: 0.7,
            };
          }
        }
      }
    }
  }
}

async function main() {
  console.log("LifePool adaptive learning (walk-forward)\n");
  const store = loadData();
  const fullPreset = PRESET_CONFIGS.full!;
  const allDates = alignDates(store, fullPreset.startDate, fullPreset.endDate);

  console.log(`Data: ${allDates.length} days · ${allDates[0]} → ${allDates[allDates.length - 1]}`);
  const windows = buildWalkForwardWindows(allDates);
  console.log(`Walk-forward folds: ${windows.length}\n`);

  console.log("── Pattern calibration ──");
  const patternStats = learnPatternStats(store, allDates);
  for (const p of patternStats.filter((s) => s.triggers > 0).slice(0, 6)) {
    console.log(
      `  ${p.id}: ${(p.winRate30d * 100).toFixed(0)}% win · n=${p.triggers} · weight=${p.learnedWeight.toFixed(2)}`,
    );
  }

  console.log("\n── Walk-forward param search ──");
  const candidates = [...sampleCandidates()];
  let best = evaluateCandidate(store, allDates, OPTIMIZED_GRID_PARAMS, OPTIMIZED_REGIME_ALLOCATIONS, 0.7);
  let i = 0;

  for (const c of candidates) {
    i++;
    const result = evaluateCandidate(store, allDates, c.gridParams, c.regime, c.staticGrid);
    if (result.holdoutScore > best.holdoutScore) best = result;
    if (i % 20 === 0) {
      process.stdout.write(`  ${i}/${candidates.length} · best holdout ${best.holdoutScore.toFixed(3)}\r`);
    }
  }
  console.log(`\n  Evaluated ${candidates.length} candidates`);

  const baseline = evaluateCandidate(
    store,
    allDates,
    BASELINE_GRID_PARAMS,
    BASELINE_REGIME_ALLOCATIONS,
    0.68,
  );

  console.log("\n── Results ──");
  console.log(`Baseline holdout: ${baseline.holdoutScore.toFixed(3)} · Sharpe ${baseline.metrics.sharpe.toFixed(2)}`);
  console.log(
    `Learned holdout:  ${best.holdoutScore.toFixed(3)} (+${((best.holdoutScore / baseline.holdoutScore - 1) * 100).toFixed(1)}%) · Sharpe ${best.metrics.sharpe.toFixed(2)}`,
  );
  console.log(`CAGR ${(best.metrics.cagr * 100).toFixed(1)}% · Max DD ${(best.metrics.maxDrawdown * 100).toFixed(1)}%`);

  const config: LearnedStrategyConfig = {
    version: 1,
    learnedAt: new Date().toISOString(),
    gridParams: best.gridParams,
    regime: best.regime,
    staticGrid: best.staticGrid,
    patternStats,
    walkForward: {
      trainScore: best.trainScore,
      holdoutScore: best.holdoutScore,
      upliftVsBaseline: best.holdoutScore / baseline.holdoutScore - 1,
      folds: windows.length,
    },
  };

  setLearnedStrategy(config);

  const json = JSON.stringify(config, null, 2);
  writeFileSync(join(DATA_DIR, "learned-strategy.json"), json);
  mkdirSync(PUBLIC_DIR, { recursive: true });
  writeFileSync(join(PUBLIC_DIR, "learned-strategy.json"), json);

  console.log(`\nSaved data/prices/learned-strategy.json`);
  console.log(`Saved public/data/prices/learned-strategy.json`);
  console.log("\nRestart dev server or redeploy to pick up learned params in the app.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
