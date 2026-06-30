import { useCallback, useEffect, useMemo, useState } from "react";
import { getRegimeColor, getRegimeLabel } from "../../backtest/allocator";
import { runBacktest } from "../../backtest/engine";
import { computeBtcDcaBalance } from "../../backtest/market-data";
import { PATTERN_LABELS } from "../../backtest/signals";
import { describeSimulator } from "../../backtest/simulators";
import type { BacktestConfig, BacktestResult, PriceSeries, RegimeSnapshot } from "../../backtest/types";
import { usePool } from "../../context/PoolContext";
import { formatCurrency } from "../../data/pool";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

type FormState = {
  monthlyContribution: string;
  initialDeposit: string;
  startDate: string;
  endDate: string;
  optimized: boolean;
  dailyCompound: boolean;
  smartDca: boolean;
  opportunityMode: boolean;
};

function buildMemberForm(
  monthly: number,
  joinDate: string,
  endDate: string,
  settings: FormState,
): FormState {
  return {
    monthlyContribution: String(monthly),
    initialDeposit: "0",
    startDate: joinDate,
    endDate,
    optimized: settings.optimized,
    dailyCompound: settings.dailyCompound,
    smartDca: settings.smartDca,
    opportunityMode: settings.opportunityMode,
  };
}

type QuickExample = FormState & { label: string };

const QUICK_EXAMPLES: QuickExample[] = [
  {
    label: "$444 · Feb 22 – Apr 23",
    monthlyContribution: "444",
    initialDeposit: "0",
    startDate: "2022-02-01",
    endDate: "2023-04-30",
    optimized: true,
    dailyCompound: true,
    smartDca: true,
    opportunityMode: true,
  },
  {
    label: "$89 · Standard tier · 2024",
    monthlyContribution: "89",
    initialDeposit: "0",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    optimized: true,
    dailyCompound: true,
    smartDca: true,
    opportunityMode: true,
  },
  {
    label: "$169 · Premium · Bull run",
    monthlyContribution: "169",
    initialDeposit: "500",
    startDate: "2024-01-01",
    endDate: "2025-06-30",
    optimized: true,
    dailyCompound: true,
    smartDca: true,
    opportunityMode: true,
  },
];

export function BacktestLab() {
  const {
    member,
    live,
    marketData,
    settings,
    updateSettings,
    phase,
  } = usePool();

  const memberForm = useMemo(() => {
    if (!member || !live) return null;
    return buildMemberForm(
      member.monthlyContribution,
      member.joinDate,
      live.lastUpdated,
      {
        monthlyContribution: String(member.monthlyContribution),
        initialDeposit: "0",
        startDate: member.joinDate,
        endDate: live.lastUpdated,
        ...settings,
      },
    );
  }, [member, live, settings]);

  const [form, setForm] = useState<FormState>(
    memberForm ?? QUICK_EXAMPLES[0]!,
  );
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProof, setShowProof] = useState(false);

  const loading = phase === "loading" || !marketData;

  useEffect(() => {
    if (memberForm) {
      setForm(memberForm);
      setResult(live?.memberResult ?? null);
    }
  }, [memberForm, live?.memberResult]);

  const runWithForm = useCallback(
    (f: FormState) => {
      if (!marketData) return;

      setComputing(true);
      setError(null);
      updateSettings({
        optimized: f.optimized,
        dailyCompound: f.dailyCompound,
        smartDca: f.smartDca,
        opportunityMode: f.opportunityMode,
      });

      try {
        const monthly = parseFloat(f.monthlyContribution);
        const initial = parseFloat(f.initialDeposit);

        if (Number.isNaN(monthly) || monthly < 0) {
          throw new Error("Enter a valid monthly contribution");
        }
        if (Number.isNaN(initial) || initial < 0) {
          throw new Error("Enter a valid initial deposit");
        }
        if (f.startDate >= f.endDate) {
          throw new Error("End date must be after start date");
        }

        const config: BacktestConfig = {
          startDate: f.startDate,
          endDate: f.endDate,
          initialCapital: initial,
          monthlyInflow: monthly,
          optimized: f.optimized,
          dailyCompound: f.dailyCompound,
          smartDca: f.smartDca,
          opportunityMode: f.opportunityMode,
        };

        const res = runBacktest(marketData, config);
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Backtest failed");
        setResult(null);
      } finally {
        setComputing(false);
      }
    },
    [marketData, updateSettings],
  );

  useEffect(() => {
    if (marketData && !memberForm) runWithForm(QUICK_EXAMPLES[0]!);
  }, [marketData, memberForm, runWithForm]);

  const contributionCount = useMemo(() => {
    if (!result) return 0;
    return result.contributions.length;
  }, [result]);

  return (
    <div className="min-h-full bg-void">
      <header className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">LifePool</p>
            <h1 className="text-xl font-semibold tracking-tight">
              Yield Calculator
            </h1>
          </div>
          <Badge tone="neon">Live backtest</Badge>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Real Binance price data · 11 onchain strategies · verifiable math
        </p>
      </header>

      <div className="px-5 space-y-4">
        <CalculatorForm
          form={form}
          onChange={setForm}
          onSubmit={() => runWithForm(form)}
          computing={computing}
          disabled={loading}
        />

        {member && memberForm && (
          <button
            type="button"
            onClick={() => {
              setForm(memberForm);
              setResult(live?.memberResult ?? null);
            }}
            className="w-full rounded-2xl border border-neon/30 bg-neon/5 px-4 py-3 text-left text-[11px] text-neon"
          >
            Load your live portfolio ({formatCurrency(member.monthlyContribution)}/mo since {member.joinDate})
          </button>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => {
                setForm(ex);
                runWithForm(ex);
              }}
              className="shrink-0 rounded-xl border border-border bg-card/40 px-3 py-2 text-[10px] text-muted hover:border-neon/30"
            >
              {ex.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="py-8 text-center text-sm text-muted">
            Loading market data…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {result && !computing && (
          <>
            <MemberResults result={result} contributionCount={contributionCount} />
            {result.baseline && <OptimizationGain result={result} />}
            <OptimizationPanel result={result} />
            <SignalPanel result={result} />
            <RegimeChart history={result.regimeHistory} />
            <BalanceChart ledger={result.monthlyLedger} />
            <ComparisonCard result={result} marketData={marketData} />
            <button
              type="button"
              onClick={() => setShowProof(!showProof)}
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-card/40 px-4 py-3 text-left"
            >
              <span className="text-sm font-medium">Proof & methodology</span>
              <span className="text-xs text-neon">{showProof ? "Hide" : "Show"}</span>
            </button>
            {showProof && <ProofPanel result={result} />}
          </>
        )}
      </div>
    </div>
  );
}

function CalculatorForm({
  form,
  onChange,
  onSubmit,
  computing,
  disabled,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  onSubmit: () => void;
  computing: boolean;
  disabled: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 space-y-4">
      <div>
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Monthly contribution
        </label>
        <div className="relative mt-1.5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            $
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={form.monthlyContribution}
            onChange={(e) =>
              onChange({ ...form, monthlyContribution: e.target.value })
            }
            className="w-full rounded-2xl border border-border bg-void py-3.5 pl-8 pr-4 text-lg font-semibold text-neon outline-none focus:border-neon/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Start date
          </label>
          <input
            type="date"
            value={form.startDate}
            min="2022-01-01"
            max="2026-06-30"
            onChange={(e) => onChange({ ...form, startDate: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-border bg-void px-3 py-2.5 text-sm outline-none focus:border-neon/50"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted">
            End date
          </label>
          <input
            type="date"
            value={form.endDate}
            min="2022-01-01"
            max="2026-06-30"
            onChange={(e) => onChange({ ...form, endDate: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-border bg-void px-3 py-2.5 text-sm outline-none focus:border-neon/50"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Initial deposit (optional)
        </label>
        <div className="relative mt-1.5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            $
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={form.initialDeposit}
            onChange={(e) =>
              onChange({ ...form, initialDeposit: e.target.value })
            }
            className="w-full rounded-xl border border-border bg-void py-2.5 pl-8 pr-4 text-sm outline-none focus:border-neon/50"
          />
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Optimization engine
        </p>
        <ToggleRow
          label="Regime-aware allocation"
          sub="Bear / bull / neutral weight shifts"
          checked={form.optimized}
          onChange={(v) => onChange({ ...form, optimized: v })}
        />
        <ToggleRow
          label="Smart DCA routing"
          sub="Contributions flow to underweight strategies"
          checked={form.smartDca}
          onChange={(v) => onChange({ ...form, smartDca: v })}
        />
        <ToggleRow
          label="Daily compound"
          sub="Harvester reinvests LP rewards every day"
          checked={form.dailyCompound}
          onChange={(v) => onChange({ ...form, dailyCompound: v })}
        />
        <ToggleRow
          label="Bear opportunity mode"
          sub="Historical signals drive aggressive bear allocation + DCA"
          checked={form.opportunityMode}
          onChange={(v) => onChange({ ...form, opportunityMode: v })}
        />
      </div>

      <Button fullWidth size="lg" onClick={onSubmit} disabled={disabled || computing}>
        {computing ? "Calculating…" : "Calculate returns"}
      </Button>
    </div>
  );
}

function MemberResults({
  result,
  contributionCount,
}: {
  result: BacktestResult;
  contributionCount: number;
}) {
  const { member } = result;
  const positive = member.yieldEarned >= 0;

  return (
    <div className="rounded-3xl border border-neon/20 bg-card p-5">
      <div className="text-center">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Your final balance
        </span>
        <div className="mt-1 text-[40px] font-semibold tracking-tight text-neon">
          {formatCurrency(member.finalBalance)}
        </div>
        <p className="mt-1 text-xs text-muted">
          {contributionCount} monthly contributions ·{" "}
          {result.provenance.tradingDays} trading days simulated
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5">
        <ResultCell
          label="Total contributed"
          value={formatCurrency(member.totalContributed)}
        />
        <ResultCell
          label="Yield earned"
          value={formatCurrency(member.yieldEarned)}
          accent={positive}
          negative={!positive}
        />
        <ResultCell
          label="Return on contributions"
          value={`${member.roi >= 0 ? "+" : ""}${(member.roi * 100).toFixed(1)}%`}
          accent={positive}
          negative={!positive}
        />
        <ResultCell
          label="Pool CAGR"
          value={`${(result.cagr * 100).toFixed(1)}%`}
        />
        <ResultCell
          label="vs cash (4.5%)"
          value={formatCurrency(member.beatCash)}
          accent={member.beatCash >= 0}
          negative={member.beatCash < 0}
        />
        <ResultCell
          label="Max drawdown"
          value={`${(result.maxDrawdown * 100).toFixed(1)}%`}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl bg-void/50 px-3 py-2.5 text-left"
    >
      <div>
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-muted">{sub}</div>
      </div>
      <div
        className={`h-6 w-10 rounded-full p-0.5 transition-colors ${checked ? "bg-neon" : "bg-border"}`}
      >
        <div
          className={`h-5 w-5 rounded-full bg-void transition-transform ${checked ? "translate-x-4" : ""}`}
        />
      </div>
    </button>
  );
}

function OptimizationGain({ result }: { result: BacktestResult }) {
  const { member, baseline } = result;
  if (!baseline) return null;

  const extraYield = member.yieldEarned - baseline.yieldEarned;
  const extraRoi = (member.roi - baseline.roi) * 100;

  return (
    <div className="rounded-2xl border border-neon/30 bg-neon/5 px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-neon">
        Optimization uplift vs static allocation
      </div>
      <div className="mt-2 flex gap-6">
        <div>
          <div className={`text-lg font-semibold ${extraYield >= 0 ? "text-neon" : "text-danger"}`}>
            {extraYield >= 0 ? "+" : ""}{formatCurrency(extraYield)}
          </div>
          <div className="text-[9px] text-muted">extra yield</div>
        </div>
        <div>
          <div className={`text-lg font-semibold ${extraRoi >= 0 ? "text-neon" : "text-danger"}`}>
            {extraRoi >= 0 ? "+" : ""}{extraRoi.toFixed(1)}%
          </div>
          <div className="text-[9px] text-muted">ROI vs static</div>
        </div>
        <div>
          <div className="text-lg font-semibold">
            +{formatCurrency(result.optimization.compoundBonus)}
          </div>
          <div className="text-[9px] text-muted">daily compound</div>
        </div>
      </div>
    </div>
  );
}

function OptimizationPanel({ result }: { result: BacktestResult }) {
  const { optimization } = result;
  const total =
    optimization.regimeDays.bear +
    optimization.regimeDays.neutral +
    optimization.regimeDays.bull;

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <h2 className="mb-3 text-sm font-semibold">Active optimization</h2>
      <div className="flex h-3 overflow-hidden rounded-full">
        {(["bear", "neutral", "bull"] as const).map((r) => (
          <div
            key={r}
            style={{
              width: `${(optimization.regimeDays[r] / total) * 100}%`,
              backgroundColor: getRegimeColor(r),
              opacity: r === "neutral" ? 0.7 : 0.9,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted">
        <span>Bear {((optimization.regimeDays.bear / total) * 100).toFixed(0)}%</span>
        <span>Neutral {((optimization.regimeDays.neutral / total) * 100).toFixed(0)}%</span>
        <span>Bull {((optimization.regimeDays.bull / total) * 100).toFixed(0)}%</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {(["bear", "neutral", "bull"] as const).map((r) => (
          <div key={r} className="rounded-lg bg-void/40 px-2 py-2">
            <div className="text-[10px] font-medium" style={{ color: getRegimeColor(r) }}>
              {getRegimeLabel(r)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegimeChart({ history }: { history: BacktestResult["regimeHistory"] }) {
  const sample = downsample(history, 60);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">Market regime detection</h2>
      <div className="flex h-[24px] gap-px overflow-hidden rounded-lg">
        {sample.map((r: RegimeSnapshot) => (
          <div
            key={r.date}
            className="flex-1"
            style={{ backgroundColor: getRegimeColor(r.regime) }}
            title={`${r.date}: ${getRegimeLabel(r.regime)}`}
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted">
        BTC 30d momentum + volatility · allocation shifts on regime change
      </p>
    </div>
  );
}

function SignalPanel({ result }: { result: BacktestResult }) {
  const signals = result.signalHistory;
  if (!signals.length) return null;

  const highOppDays = signals.filter(
    (s) => s.opportunity === "high" || s.opportunity === "extreme",
  ).length;
  const patternCounts = new Map<string, number>();
  for (const s of signals) {
    for (const p of s.activePatterns) {
      patternCounts.set(p, (patternCounts.get(p) ?? 0) + 1);
    }
  }
  const topPatterns = [...patternCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="rounded-2xl border border-neon/20 bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Bear opportunity signals</h2>
        {result.optimization.opportunityMode && (
          <span className="rounded-full bg-neon/10 px-2 py-0.5 text-[10px] font-medium text-neon">
            Active
          </span>
        )}
      </div>
      <p className="mt-1 text-[10px] text-muted">
        Historical pattern detection across your simulation window
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-void/50 px-3 py-2.5">
          <div className="text-[9px] uppercase tracking-wider text-muted">
            High-opportunity days
          </div>
          <div className="mt-0.5 text-base font-semibold text-neon">
            {highOppDays}
          </div>
        </div>
        <div className="rounded-xl bg-void/50 px-3 py-2.5">
          <div className="text-[9px] uppercase tracking-wider text-muted">
            Avg opportunity score
          </div>
          <div className="mt-0.5 text-base font-semibold">
            {(
              signals.reduce((s, x) => s + x.opportunityScore, 0) / signals.length
            ).toFixed(0)}
          </div>
        </div>
      </div>
      {topPatterns.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {topPatterns.map(([id, count]) => (
            <span
              key={id}
              className="rounded-lg border border-border bg-void/40 px-2 py-1 text-[10px] text-muted"
            >
              {PATTERN_LABELS[id] ?? id}{" "}
              <span className="text-neon">{count}d</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCell({
  label,
  value,
  accent,
  negative,
}: {
  label: string;
  value: string;
  accent?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl bg-void/50 px-3 py-2.5">
      <div className="text-[9px] uppercase tracking-wider text-muted">{label}</div>
      <div
        className={`mt-0.5 text-base font-semibold ${
          accent ? "text-neon" : negative ? "text-danger" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function BalanceChart({
  ledger,
}: {
  ledger: BacktestResult["monthlyLedger"];
}) {
  if (ledger.length === 0) return null;

  const max = Math.max(...ledger.map((l) => l.balance));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Balance over time</h2>
        <div className="flex gap-3 text-[9px] text-muted">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-neon/60" /> Balance
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-muted/40" /> Contributed
          </span>
        </div>
      </div>
      <div className="flex h-[110px] items-end gap-1">
        {ledger.map((row) => (
          <div key={row.month} className="flex flex-1 flex-col items-center gap-0.5">
            <div className="relative w-full" style={{ height: 90 }}>
              <div
                className="absolute bottom-0 w-full rounded-t-sm bg-neon/50"
                style={{ height: `${(row.balance / max) * 100}%` }}
              />
              <div
                className="absolute bottom-0 w-full rounded-t-sm bg-muted/30"
                style={{
                  height: `${(row.cumulativeContributed / max) * 100}%`,
                }}
              />
            </div>
            <span className="text-[8px] text-muted">{row.month.slice(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonCard({
  result,
  marketData,
}: {
  result: BacktestResult;
  marketData: Map<string, PriceSeries> | null;
}) {
  const { member } = result;
  const cashEnd =
    member.totalContributed *
    (1 + 0.045 * (result.contributions.length / 12));
  const hodlBtc =
    marketData != null
      ? computeBtcDcaBalance(marketData, result.config, result.contributions)
      : 0;

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <h2 className="mb-3 text-sm font-semibold">What if you did nothing?</h2>
      <div className="space-y-2">
        <CompareRow
          label="LifePool (your calc)"
          value={formatCurrency(member.finalBalance)}
          highlight
        />
        <CompareRow
          label="Cash savings @ 4.5%"
          value={formatCurrency(cashEnd)}
        />
        <CompareRow
          label="DCA into BTC only"
          value={formatCurrency(hodlBtc)}
          sub="Same dates · Binance BTCUSDT"
        />
        <CompareRow
          label="Contributions only"
          value={formatCurrency(member.totalContributed)}
        />
      </div>
    </div>
  );
}

function CompareRow({
  label,
  value,
  highlight,
  sub,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-void/40 px-3 py-2">
      <div>
        <span className="text-xs text-muted">{label}</span>
        {sub && <div className="text-[9px] text-muted">{sub}</div>}
      </div>
      <span className={`text-sm font-semibold ${highlight ? "text-neon" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function ProofPanel({ result }: { result: BacktestResult }) {
  const { provenance, contributions, strategies } = result;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/30 p-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Data source
        </h3>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          {provenance.source}. {provenance.symbols.length} pairs loaded. Range{" "}
          {provenance.dataFrom} → {provenance.dataTo}. {provenance.tradingDays}{" "}
          trading days in your simulation window.
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {provenance.symbols.map((s) => (
            <span
              key={s}
              className="rounded-md bg-border/60 px-1.5 py-0.5 font-mono text-[9px] text-muted"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Contribution log
        </h3>
        <div className="mt-2 max-h-[140px] overflow-y-auto space-y-1">
          {contributions.map((c) => (
            <div
              key={c.date}
              className="flex justify-between font-mono text-[10px] text-muted"
            >
              <span>{c.date}</span>
              <span className="text-text">+{formatCurrency(c.amount)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted">
          Total: {formatCurrency(contributions.reduce((s, c) => s + c.amount, 0))}{" "}
          across {contributions.length} months
        </p>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Monthly ledger
        </h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-1 pr-2">Month</th>
                <th className="pb-1 pr-2">In</th>
                <th className="pb-1 pr-2">Balance</th>
                <th className="pb-1">Yield</th>
              </tr>
            </thead>
            <tbody>
              {result.monthlyLedger.map((row) => (
                <tr key={row.month} className="border-t border-border/50">
                  <td className="py-1 pr-2 font-mono">{row.month}</td>
                  <td className="py-1 pr-2 font-mono">
                    {row.contributed > 0 ? formatCurrency(row.contributed) : "—"}
                  </td>
                  <td className="py-1 pr-2 font-mono">
                    {formatCurrency(row.balance)}
                  </td>
                  <td
                    className={`py-1 font-mono ${row.yieldEarned >= 0 ? "text-neon" : "text-danger"}`}
                  >
                    {row.yieldEarned >= 0 ? "+" : ""}
                    {formatCurrency(row.yieldEarned)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Strategy models used
        </h3>
        <div className="mt-2 space-y-1.5">
          {strategies.slice(0, 5).map((s) => (
            <p key={s.id} className="text-[10px] text-muted">
              <span className="text-text">{s.name}</span> —{" "}
              {describeSimulator(s.id as Parameters<typeof describeSimulator>[0])}
            </p>
          ))}
          <p className="text-[10px] text-muted">
            + {strategies.length - 5} more strategies with Sentinel de-risking
          </p>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-muted border-t border-border pt-3">
        Simulation applies daily returns from real price data through 11 LifePool
        yield strategies with regime-aware allocation, smart DCA, and daily
        compounding. Past performance does not guarantee future results. Not
        financial advice.
      </p>
    </div>
  );
}

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const result: T[] = [];
  for (let i = 0; i < max; i++) {
    result.push(arr[Math.floor(i * step)]!);
  }
  return result;
}
