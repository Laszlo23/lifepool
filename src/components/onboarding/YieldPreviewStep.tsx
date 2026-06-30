import { useMemo } from "react";
import { runBacktest } from "../../backtest/engine";
import { COVERAGE_TIERS, formatCurrency } from "../../data/pool";
import { usePoolOptional } from "../../context/PoolContext";
import { CYCLE_LOCK_LABEL } from "../../engine/cycle";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface YieldPreviewStepProps {
  tierId: string;
  onNext: () => void;
}

export function YieldPreviewStep({ tierId, onNext }: YieldPreviewStepProps) {
  const pool = usePoolOptional();
  const tier = COVERAGE_TIERS.find((t) => t.id === tierId) ?? COVERAGE_TIERS[1]!;
  const monthly = tier.monthly;

  const preview = useMemo(() => {
    if (!pool?.marketData) return null;
    try {
      const result = runBacktest(pool.marketData, {
        startDate: "2024-01-01",
        endDate: "2025-06-30",
        initialCapital: 0,
        monthlyInflow: monthly,
        optimized: true,
        dailyCompound: true,
        smartDca: true,
        opportunityMode: true,
      });
      const grid = result.strategies.find((s) => s.id === "btc-grid");
      return {
        endNav: result.endNav,
        cagr: result.cagr,
        gridCagr: grid?.cagr ?? 0,
        positiveMonths: result.positiveMonths,
        totalMonths: result.totalMonths,
      };
    } catch {
      return null;
    }
  }, [pool?.marketData, monthly]);

  const loading = !pool?.marketData;

  return (
    <div className="flex h-full flex-col animate-slide-up">
      <div className="flex-1">
        <Badge tone="accent">Yield calculator</Badge>
        <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight">
          Your projected flow
        </h2>
        <p className="mt-2 text-sm text-muted">
          {formatCurrency(monthly)}/mo into the BTC/USDC grid + stake treasury ·{" "}
          {CYCLE_LOCK_LABEL} cycle lock.
        </p>

        <div className="mt-6 rounded-3xl border border-neon/25 bg-gradient-to-b from-neon/10 to-card/40 p-5">
          {loading ? (
            <p className="text-center text-sm text-muted">Running backtest engine…</p>
          ) : preview ? (
            <>
              <div className="text-center">
                <div className="text-[11px] font-medium uppercase tracking-widest text-muted">
                  Projected portfolio · Jan 24 – Jun 25
                </div>
                <div className="mt-2 text-4xl font-semibold tracking-tight text-neon">
                  {formatCurrency(preview.endNav)}
                </div>
                <div className="mt-1 text-sm text-muted">
                  {(preview.cagr * 100).toFixed(1)}% CAGR · grid{" "}
                  {(preview.gridCagr * 100).toFixed(0)}%
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Stat label="Win months" value={`${preview.positiveMonths}/${preview.totalMonths}`} />
                <Stat label="Monthly" value={formatCurrency(monthly)} />
                <Stat label="Grid agent" value="BTC/USDC" />
                <Stat label="Stake sleeve" value="BTC native" />
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-muted">
              Engine warming up — continue to see live projections in the Calculator tab.
            </p>
          )}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted">
          Backtested grid + stake mix. Not a guarantee. Full calculator available after you join.
        </p>
      </div>

      <Button fullWidth size="lg" onClick={onNext} className="mt-6">
        Continue with smart wallet
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-void/50 px-3 py-2.5 text-center">
      <div className="text-sm font-semibold">{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}
