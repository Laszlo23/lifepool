/**
 * Grid-search optimizer for LifePool BTC/USDC grid + stake strategy.
 * Run: npm run optimize
 */

import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runBacktest, PRESET_CONFIGS } from "../src/backtest/engine";
import { loadMarketDataSync } from "../src/backtest/market-data";
import {
  BASELINE_GRID_PARAMS,
  BASELINE_REGIME_ALLOCATIONS,
  type GridSimulatorParams,
  type RegimeAllocationMap,
} from "../src/backtest/grid-params";
import { setGridParamOverride, clearGridParamOverride } from "../src/backtest/simulators";
import {
  setRegimeAllocationOverride,
  clearRegimeAllocationOverride,
} from "../src/backtest/allocator";
import type { BacktestResult, Candle, StrategyAllocation } from "../src/backtest/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data/prices");

interface Candidate {
  gridParams: GridSimulatorParams;
  regime: RegimeAllocationMap;
  staticGrid: number;
  score: number;
  metrics: {
    sharpe: number;
    calmar: number;
    maxDrawdown: number;
    cagr: number;
    positiveMonths: number;
    totalMonths: number;
  };
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
  const ddPenalty = r.maxDrawdown;
  return (
    r.sharpe * 0.35 +
    r.calmar * 0.25 +
    r.cagr * 0.2 +
    winRate * 0.1 -
    ddPenalty * 0.1
  );
}

function runCandidate(
  store: ReturnType<typeof loadData>,
  gridParams: GridSimulatorParams,
  regime: RegimeAllocationMap,
  staticGrid: number,
): Candidate {
  setGridParamOverride(gridParams);
  setRegimeAllocationOverride(regime);

  const allocations: StrategyAllocation[] = [
    { id: "btc-grid", weight: staticGrid },
    { id: "btc-stake", weight: 1 - staticGrid },
  ];

  const presets = ["full", "bear2022", "recent"] as const;
  let totalScore = 0;
  let lastResult: BacktestResult | null = null;

  for (const preset of presets) {
    const config = {
      ...PRESET_CONFIGS[preset]!,
      optimized: true,
      dailyCompound: true,
      smartDca: true,
      opportunityMode: true,
    };
    const result = runBacktest(store, config, allocations);
    totalScore += scoreResult(result);
    lastResult = result;
  }

  clearGridParamOverride();
  clearRegimeAllocationOverride();

  const avgScore = totalScore / presets.length;
  const r = lastResult!;

  return {
    gridParams,
    regime,
    staticGrid,
    score: avgScore,
    metrics: {
      sharpe: r.sharpe,
      calmar: r.calmar,
      maxDrawdown: r.maxDrawdown,
      cagr: r.cagr,
      positiveMonths: r.positiveMonths,
      totalMonths: r.totalMonths,
    },
  };
}

function* generateCandidates(): Generator<Candidate["gridParams"] & { regime: RegimeAllocationMap; staticGrid: number }> {
  const vol7 = [0.48, 0.52, 0.58, 0.62];
  const vol30 = [0.24, 0.28, 0.32, 0.36];
  const swingTh = [0.011, 0.013, 0.015, 0.017];
  const swingCap = [0.46, 0.5, 0.54];
  const bearGrid = [0.78, 0.82, 0.86];
  const neutralGrid = [0.64, 0.68, 0.72];
  const bullGrid = [0.5, 0.54, 0.58];
  const staticGrids = [0.66, 0.68, 0.7];

  for (const v7 of vol7) {
    for (const v30 of vol30) {
      for (const st of swingTh) {
        for (const sc of swingCap) {
          for (const bg of bearGrid) {
            for (const ng of neutralGrid) {
              for (const ug of bullGrid) {
                for (const sg of staticGrids) {
                  yield {
                    ...BASELINE_GRID_PARAMS,
                    vol7Coeff: v7,
                    vol30Coeff: v30,
                    swingThreshold: st,
                    swingCapture: sc,
                    usdcIdleDaily: 0.00008,
                    trendDragCoeff: 0.06,
                    maxDailyLoss: -0.022,
                    regime: {
                      bear: { "btc-grid": bg, "btc-stake": 1 - bg },
                      neutral: { "btc-grid": ng, "btc-stake": 1 - ng },
                      bull: { "btc-grid": ug, "btc-stake": 1 - ug },
                    },
                    staticGrid: sg,
                  };
                }
              }
            }
          }
        }
      }
    }
  }
}

async function main() {
  console.log("LifePool strategy optimizer\n");
  const store = loadData();

  console.log("── Baseline ──");
  const baseline = runCandidate(
    store,
    BASELINE_GRID_PARAMS,
    BASELINE_REGIME_ALLOCATIONS,
    0.68,
  );
  console.log(
    `Score ${baseline.score.toFixed(3)} · Sharpe ${baseline.metrics.sharpe.toFixed(2)} · CAGR ${(baseline.metrics.cagr * 100).toFixed(1)}% · DD ${(baseline.metrics.maxDrawdown * 100).toFixed(1)}%`,
  );

  console.log("\n── Grid search (sampled) ──");
  const all = [...generateCandidates()];
  const sampleSize = Math.min(180, all.length);
  const step = Math.floor(all.length / sampleSize);
  const sampled = all.filter((_, i) => i % step === 0).slice(0, sampleSize);

  let best = baseline;
  let i = 0;
  for (const c of sampled) {
    i++;
    const { regime, staticGrid, ...gridParams } = c;
    const result = runCandidate(store, gridParams, regime, staticGrid);
    if (result.score > best.score) best = result;
    if (i % 30 === 0) {
      process.stdout.write(`  ${i}/${sampled.length} · best score ${best.score.toFixed(3)}\r`);
    }
  }
  console.log(`\n  Evaluated ${sampled.length} candidates`);

  console.log("\n── Optimized winner ──");
  console.log(`Score ${best.score.toFixed(3)} (+${((best.score / baseline.score - 1) * 100).toFixed(1)}% vs baseline)`);
  console.log(`Sharpe ${best.metrics.sharpe.toFixed(2)} · Calmar ${best.metrics.calmar.toFixed(2)}`);
  console.log(`CAGR ${(best.metrics.cagr * 100).toFixed(1)}% · Max DD ${(best.metrics.maxDrawdown * 100).toFixed(1)}%`);
  console.log(`Win months ${best.metrics.positiveMonths}/${best.metrics.totalMonths}`);
  console.log("\nGrid params:", JSON.stringify(best.gridParams, null, 2));
  console.log("\nRegime allocations:", JSON.stringify(best.regime, null, 2));
  console.log(`Static grid weight: ${(best.staticGrid * 100).toFixed(0)}%`);

  const outPath = join(DATA_DIR, "optimization-result.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        optimizedAt: new Date().toISOString(),
        baseline: {
          score: baseline.score,
          metrics: baseline.metrics,
          gridParams: BASELINE_GRID_PARAMS,
          regime: BASELINE_REGIME_ALLOCATIONS,
        },
        optimized: {
          score: best.score,
          metrics: best.metrics,
          gridParams: best.gridParams,
          regime: best.regime,
          staticGrid: best.staticGrid,
        },
        upliftPct: (best.score / baseline.score - 1) * 100,
      },
      null,
      2,
    ),
  );
  console.log(`\nSaved ${outPath}`);

  console.log("\n── Full-period backtest (optimized) ──");
  setGridParamOverride(best.gridParams);
  setRegimeAllocationOverride(best.regime);
  const full = runBacktest(
    store,
    { ...PRESET_CONFIGS.full!, opportunityMode: true },
    [
      { id: "btc-grid", weight: best.staticGrid },
      { id: "btc-stake", weight: 1 - best.staticGrid },
    ],
  );
  clearGridParamOverride();
  clearRegimeAllocationOverride();

  console.log(`CAGR ${(full.cagr * 100).toFixed(2)}% · Sharpe ${full.sharpe.toFixed(2)} · DD ${(full.maxDrawdown * 100).toFixed(1)}%`);
  for (const s of full.strategies) {
    console.log(
      `  ${s.name}: ${(s.cagr * 100).toFixed(1)}% CAGR · Sharpe ${s.sharpe.toFixed(2)} · DD ${(s.maxDrawdown * 100).toFixed(1)}%`,
    );
  }
  if (full.baseline) {
    console.log(
      `\nUplift vs static: CAGR +${((full.cagr - full.baseline.cagr) * 100).toFixed(1)}pp · yield +$${(full.member.yieldEarned - full.baseline.yieldEarned).toFixed(0)}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
