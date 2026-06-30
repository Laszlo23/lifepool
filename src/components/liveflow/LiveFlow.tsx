import { ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { usePool } from "../../context/PoolContext";
import type { MonthlyLedgerEntry } from "../../backtest/types";
import { formatCurrency } from "../../data/pool";
import { Badge } from "../ui/Badge";
import { Metric } from "../ui/Metric";

export function LiveFlow() {
  const { live, computing, phase } = usePool();
  const ledger = live?.memberResult.monthlyLedger ?? [];
  const monthlyContribution = live?.memberResult.member.avgMonthlyContribution ?? 89;
  const flowItems = useMemo(
    () => buildFlowEvents(ledger, monthlyContribution),
    [ledger, monthlyContribution],
  );

  if (!live) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 px-5 text-center text-sm text-muted">
        <p>{computing ? "Loading live flow…" : "Waiting for engine data…"}</p>
      </div>
    );
  }

  const { memberResult } = live;
  const summary = memberResult.member;
  const recent = ledger.slice(-6);
  const maxBalance = Math.max(...ledger.map((l) => l.balance), 1);

  const totalIn = summary.totalContributed;
  const totalYield = summary.yieldEarned;

  return (
    <div className="min-h-full bg-void px-5 pb-6 pt-5">
      <div className="mb-5">
        <p className="text-xs text-muted">Simulated · backtest engine</p>
        <h1 className="text-xl font-semibold tracking-tight">Projected flow</h1>
        <p className="mt-1 text-[11px] text-muted">
          Illustrative income timeline — not onchain events · Base Sepolia PoC
          {phase === "guest" ? " · guest preview" : ""}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-neon/25 bg-gradient-to-br from-neon/10 via-card to-void p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-neon/10 blur-2xl" />
        <Badge tone="neon">Net position</Badge>
        <div className="mt-3 text-[36px] font-semibold tracking-tight text-neon">
          {formatCurrency(summary.finalBalance)}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
          <span className="text-muted">
            In <span className="font-medium text-text">{formatCurrency(totalIn)}</span>
          </span>
          <span className="text-muted">
            Yield{" "}
            <span className="font-medium text-neon">+{formatCurrency(totalYield)}</span>
          </span>
          <span className="text-muted">
            ROI <span className="font-medium text-neon">{(summary.roi * 100).toFixed(1)}%</span>
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric
          label="Monthly income"
          value={formatCurrency(summary.avgMonthlyContribution)}
          sub="USDC contribution"
          size="sm"
        />
        <Metric
          label="Yield APY"
          value={`${live.memberApy.toFixed(1)}%`}
          sub="Your portfolio"
          highlight
          size="sm"
        />
        <Metric
          label="Beat cash"
          value={formatCurrency(summary.beatCash)}
          sub="vs savings account"
          size="sm"
        />
        <Metric
          label="Pool APY"
          value={`${live.poolApy.toFixed(1)}%`}
          sub="Network blended"
          size="sm"
        />
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Balance trajectory</h2>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex h-[120px] items-end gap-1">
            {recent.map((row) => (
              <div key={row.month} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full max-w-[32px] rounded-t-md bg-neon/60"
                  style={{ height: `${(row.balance / maxBalance) * 100}px` }}
                />
                <span className="text-[9px] text-muted">{row.month.slice(5)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
            {recent.slice(-3).map((row) => (
              <div key={row.month}>
                <div className="text-[9px] uppercase tracking-wider text-muted">
                  {row.month}
                </div>
                <div className="text-xs font-semibold">{formatCurrency(row.balance)}</div>
                <div
                  className={`text-[10px] ${row.yieldEarned >= 0 ? "text-neon" : "text-danger"}`}
                >
                  {row.yieldEarned >= 0 ? "+" : ""}
                  {formatCurrency(row.yieldEarned)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Money flow</h2>
          <Badge tone="muted">{flowItems.length} events</Badge>
        </div>
        <div className="space-y-2">
          {flowItems
            .slice()
            .reverse()
            .slice(0, 8)
            .map((item) => (
              <FlowRow key={item.id} item={item} />
            ))}
        </div>
      </section>

      {memberResult.baseline && (
        <section className="mt-6 rounded-2xl border border-border bg-card/40 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-neon" />
            <h2 className="text-sm font-semibold">Engine uplift</h2>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Optimized strategy vs static allocation:{" "}
            <span className="font-semibold text-neon">
              +
              {formatCurrency(
                memberResult.endNav - memberResult.baseline.endNav,
              )}
            </span>{" "}
            extra yield on the same contributions.
          </p>
        </section>
      )}
    </div>
  );
}

interface FlowEvent {
  id: string;
  type: "in" | "yield";
  label: string;
  amount: number;
  month: string;
}

function buildFlowEvents(
  ledger: MonthlyLedgerEntry[],
  monthly: number,
): FlowEvent[] {
  const events: FlowEvent[] = [];
  for (const row of ledger) {
    if (row.contributed > 0) {
      events.push({
        id: `${row.month}-in`,
        type: "in",
        label: "Monthly contribution",
        amount: row.contributed,
        month: row.month,
      });
    }
    if (row.yieldEarned !== 0) {
      events.push({
        id: `${row.month}-yield`,
        type: "yield",
        label: "Yield credited",
        amount: row.yieldEarned,
        month: row.month,
      });
    }
  }
  if (events.length === 0 && monthly > 0) {
    events.push({
      id: "projected",
      type: "in",
      label: "Next contribution",
      amount: monthly,
      month: "upcoming",
    });
  }
  return events;
}

function FlowRow({ item }: { item: FlowEvent }) {
  const isIn = item.type === "in";
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/50 px-4 py-3">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          isIn ? "bg-border text-muted" : "bg-neon/15 text-neon"
        }`}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{item.label}</div>
        <div className="text-[10px] text-muted">{item.month}</div>
      </div>
      <div
        className={`text-sm font-semibold ${isIn ? "text-text" : "text-neon"}`}
      >
        {isIn ? "" : "+"}
        {formatCurrency(item.amount)}
      </div>
    </div>
  );
}
