import { Radar } from "lucide-react";
import { usePool } from "../../context/PoolContext";
import {
  CYCLE_LOCK_LABEL,
  cycleDaysRemaining,
  cycleProgress,
} from "../../engine/cycle";
import { formatLifeEur, useLifeEurBalance } from "../../hooks/useLifeEUR";
import { useClaimRewards, useLifePoolOnchain } from "../../hooks/useLifePool";
import { formatCurrency } from "../../data/pool";
import { Badge } from "../ui/Badge";
import { Metric } from "../ui/Metric";
import { Button } from "../ui/Button";

export function Dashboard() {
  const { member, live, computing, error, setTab, refreshEngine, signOut, openFaucet } =
    usePool();
  const onchain = useLifePoolOnchain();
  const { data: lifeEurBalance } = useLifeEurBalance();
  const { claimRewards, isPending: claiming } = useClaimRewards();

  if (!member) return null;

  const cycleStart = onchain.cycleStartDate ?? member.cycleStartDate;
  const cycleEnd = onchain.cycleEndDate ?? member.cycleEndDate;
  const asOf = live?.lastUpdated ?? member.joinDate;
  const progressPct = onchain.isMember
    ? onchain.cycleProgress
    : cycleProgress(cycleStart, cycleEnd, asOf);
  const daysLeft = cycleDaysRemaining(cycleEnd, asOf);

  const memberSummary = live?.memberResult.member;
  const poolSnap = live?.poolResult.snapshots.at(-1);
  const ledger = live?.memberResult.monthlyLedger ?? [];
  const intel = live?.intel;
  const maxBalance = Math.max(...ledger.map((l) => l.balance), 1);

  return (
    <div className="min-h-full bg-void">
      <header className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Live engine · {live?.lastUpdated}</p>
            <h1 className="text-xl font-semibold tracking-tight">Your protection</h1>
            {onchain.isMember && (
              <span className="mt-1 inline-block">
                <Badge tone="neon">Onchain member</Badge>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshEngine}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-xs font-medium text-neon"
              title="Refresh engine"
            >
              ↻
            </button>
            <button
              type="button"
              onClick={signOut}
              className="rounded-full border border-border bg-card px-3 py-2 text-[10px] text-muted"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {computing && (
        <div className="mx-5 mb-3 rounded-xl border border-neon/20 bg-neon/5 px-3 py-2 text-[11px] text-neon">
          Running backtest engine on live market data…
        </div>
      )}

      {error && (
        <div className="mx-5 mb-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
          {error}
        </div>
      )}

      {intel &&
        (intel.signal.opportunity === "high" ||
          intel.signal.opportunity === "extreme") && (
          <button
            type="button"
            onClick={() => setTab("intel")}
            className="mx-5 mb-4 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-2xl border border-neon/30 bg-neon/5 px-4 py-3 text-left"
          >
            <Radar size={18} className="shrink-0 text-neon" />
            <div>
              <div className="text-xs font-semibold text-neon">Move now</div>
              <div className="text-[10px] text-muted">{intel.headline}</div>
            </div>
          </button>
        )}

      <div className="px-5">
        <CoverageCard
          coverage={member.coverageAmount}
          tierName={member.tierName}
          balance={memberSummary?.finalBalance ?? 0}
          poolNav={live?.poolResult.endNav ?? 0}
        />

        <CycleCard
          cycleStart={cycleStart}
          cycleEnd={cycleEnd}
          progress={progressPct}
          daysLeft={daysLeft}
          onchain={onchain.isMember}
        />

        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Onchain · testnet
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm">LIFEUR balance</span>
            <span className="font-semibold text-neon">{formatLifeEur(lifeEurBalance)}</span>
          </div>
          {onchain.pendingRewardFormatted && Number(onchain.pendingRewardFormatted) > 0 && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted">Pending rewards</span>
              <span>{Number(onchain.pendingRewardFormatted).toFixed(2)} LIFEUR</span>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary" onClick={openFaucet}>
              Faucet
            </Button>
            {onchain.isMember && (
              <Button size="sm" onClick={claimRewards} disabled={claiming}>
                {claiming ? "…" : "Claim rewards"}
              </Button>
            )}
          </div>
          <p className="mt-2 text-[10px] text-muted">
            Yield projection below is simulated · onchain balances are live on Base Sepolia.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard
            label="Monthly contribution"
            value={formatCurrency(member.monthlyContribution)}
            sub="USDC · auto-debit"
          />
          <StatCard
            label="Yield earned"
            value={formatCurrency(memberSummary?.yieldEarned ?? 0)}
            sub={`${memberSummary?.contributionMonths ?? 0} months · ${(live?.memberApy ?? 0).toFixed(1)}% APY`}
            accent
          />
        </div>

        <SolvencyCard ratio={poolSnap?.solvencyRatio ?? 0} />

        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Your balance growth</h2>
            <Badge tone="muted">{ledger.length} months</Badge>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex h-[100px] items-end justify-between gap-1">
              {ledger.slice(-7).map((row) => (
                <div key={row.month} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full max-w-[28px] rounded-t-md bg-neon/70"
                    style={{ height: `${(row.balance / maxBalance) * 80}px` }}
                  />
                  <span className="text-[9px] text-muted">
                    {row.month.slice(5)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-border pt-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">
                  Your balance
                </div>
                <div className="text-lg font-semibold">
                  {formatCurrency(memberSummary?.finalBalance ?? 0)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted">
                  Pool APY
                </div>
                <div className="text-lg font-semibold text-neon">
                  {(live?.poolApy ?? 0).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard
            label="Pool NAV"
            value={formatCurrency(live?.poolResult.endNav ?? 0, true)}
            sub="Full network"
          />
          <StatCard
            label="ROI"
            value={`${((memberSummary?.roi ?? 0) * 100).toFixed(1)}%`}
            sub="Since activation"
            accent={(memberSummary?.roi ?? 0) > 0}
          />
        </div>

        <MechanicsStrip />
      </div>
    </div>
  );
}

function CycleCard({
  cycleStart,
  cycleEnd,
  progress,
  daysLeft,
  onchain,
}: {
  cycleStart: string;
  cycleEnd: string;
  progress: number;
  daysLeft: number;
  onchain: boolean;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Investment cycle
          </p>
          <p className="mt-0.5 text-sm font-semibold">{CYCLE_LOCK_LABEL} lock</p>
        </div>
        <Badge tone="muted">{daysLeft > 0 ? `${daysLeft}d left` : "Complete"}</Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-neon transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-[10px] text-muted">
        {cycleStart} → {cycleEnd} · Grid + stake · {onchain ? "enforced onchain" : "simulated"}
      </p>
    </div>
  );
}

function CoverageCard({
  coverage,
  tierName,
  balance,
  poolNav,
}: {
  coverage: number;
  tierName: string;
  balance: number;
  poolNav: number;
}) {
  const coveragePct = Math.min(100, Math.round((balance / coverage) * 100));
  const poolShare = poolNav > 0 ? balance / poolNav : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-neon/[0.06]" />

      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Your coverage amount
          </span>
          <div className="mt-1 text-[32px] font-semibold tracking-tight text-neon">
            {formatCurrency(coverage)}
          </div>
          <Badge tone="neon">Active · {tierName} tier</Badge>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-muted">Pool share</span>
          <div className="text-sm font-mono text-text">
            {(poolShare * 100).toFixed(3)}%
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs">
          <span className="text-muted">Capital backing</span>
          <span className="font-medium text-neon">{coveragePct}% funded</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-neon transition-all"
            style={{ width: `${coveragePct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function SolvencyCard({ ratio }: { ratio: number }) {
  const rounded = Math.round(ratio);
  const status =
    rounded >= 120 ? "healthy" : rounded >= 100 ? "adequate" : "watch";

  const statusConfig = {
    healthy: { label: "Healthy", color: "text-neon", bar: "bg-neon" },
    adequate: { label: "Adequate", color: "text-warn", bar: "bg-warn" },
    watch: { label: "Watch", color: "text-danger", bar: "bg-danger" },
  } as const;

  const config = statusConfig[status];

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <Metric
            label="Solvency ratio"
            value={`${rounded}%`}
            sub="Pool obligations vs capital"
            highlight
            size="lg"
          />
        </div>
        <div className="text-right">
          <span className={`text-sm font-semibold ${config.color}`}>
            {config.label}
          </span>
          <p className="mt-0.5 max-w-[120px] text-[10px] leading-snug text-muted">
            Live from pool backtest engine
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="flex h-3 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full ${config.bar} rounded-full`}
            style={{ width: `${Math.min(rounded, 150)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-muted">
          <span>0%</span>
          <span>100% min</span>
          <span>150%</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <Metric label={label} value={value} sub={sub} highlight={accent} size="md" />
    </div>
  );
}

function MechanicsStrip() {
  const items = [
    { label: "Transparent", desc: "Onchain visible" },
    { label: "Yield-bearing", desc: "Capital works" },
    { label: "Parametric", desc: "Auto payouts" },
  ];

  return (
    <div className="mt-6 mb-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">
        How your protection works
      </p>
      <div className="flex gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex-1 rounded-xl border border-border bg-card/40 px-3 py-3 text-center"
          >
            <div className="text-xs font-medium text-neon">{item.label}</div>
            <div className="mt-0.5 text-[10px] text-muted">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
