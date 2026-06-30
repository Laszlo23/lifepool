import {
  AGENTS,
  RISK_TIERS,
  STRATEGIES,
  YIELD_ENGINE,
  YIELD_WATERFALL,
  type RiskTier,
  type YieldStrategy,
} from "../../data/yield-strategies";
import { STRATEGY_META } from "../../backtest/types";
import { CYCLE_LOCK_LABEL } from "../../engine/cycle";
import { usePool } from "../../context/PoolContext";
import { formatCurrency } from "../../data/pool";
import { Badge } from "../ui/Badge";
import { GridCopyTradePanel } from "../strategy/GridCopyTradePanel";

const TIER_ORDER: RiskTier[] = ["grid", "stake"];

const STATUS_LABELS: Record<YieldStrategy["status"], string> = {
  active: "Active",
  harvesting: "Harvesting",
  rebalancing: "Rebalancing",
  executing: "Executing",
  standby: "Standby",
};

export function YieldEngine() {
  const { live } = usePool();
  const pool = live?.poolResult;
  const allocation = live?.currentAllocation ?? {};
  const intel = live?.intel;

  const tierPcts = computeTierPercentages(allocation);
  const latestSnap = pool?.snapshots.at(-1);

  return (
    <div className="min-h-full bg-void pb-4">
      <header className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">BTC/USDC grid + BTC stake only</p>
            <h1 className="text-xl font-semibold tracking-tight">Yield Engine</h1>
          </div>
          <Badge tone="neon">{(live?.poolApy ?? 0).toFixed(1)}% blended</Badge>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Cycle lock {CYCLE_LOCK_LABEL} · Grid Trader win rate{" "}
          {(YIELD_ENGINE.gridApy > 0 ? 81 : 0)}%
          {intel ? ` · ${intel.signal.regime} regime` : ""}
        </p>
      </header>

      <div className="px-5 space-y-4">
        <BlendedApyCard
          gridApy={YIELD_ENGINE.gridApy}
          stakeApy={YIELD_ENGINE.stakeApy}
          blended={live?.poolApy ?? YIELD_ENGINE.blendedApy}
          deployed={latestSnap?.nav ?? 0}
        />
        <RiskTierBar tierPcts={tierPcts} />
        <GridStatsCard />
        <GridCopyTradePanel />
        <AgentFleet />
        <StrategyList allocation={allocation} strategies={pool?.strategies ?? []} />
        <WaterfallSection />
      </div>
    </div>
  );
}

function computeTierPercentages(allocation: Record<string, number>) {
  const totals: Record<RiskTier, number> = { grid: 0, stake: 0 };
  for (const [id, weight] of Object.entries(allocation)) {
    const tier = STRATEGY_META[id as keyof typeof STRATEGY_META]?.tier;
    if (tier === "grid" || tier === "stake") totals[tier] += weight;
  }
  return totals;
}

function BlendedApyCard({
  gridApy,
  stakeApy,
  blended,
  deployed,
}: {
  gridApy: number;
  stakeApy: number;
  blended: number;
  deployed: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-neon/20 bg-card p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-neon/[0.05]" />
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
        Two-sleeve strategy
      </span>
      <div className="mt-1 text-[40px] font-semibold tracking-tight text-neon">
        {blended.toFixed(1)}%
      </div>
      <p className="mt-1 text-xs text-muted">
        {formatCurrency(deployed, true)} deployed · grid {gridApy}% · stake {stakeApy}%
      </p>
    </div>
  );
}

function GridStatsCard() {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="text-center">
        <div className="text-lg font-semibold text-neon">{YIELD_ENGINE.gridLevels}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted">Grid levels</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold">{YIELD_ENGINE.swingTrades30d}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted">Swings / 30d</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-neon">{YIELD_ENGINE.agentUptime}%</div>
        <div className="text-[9px] uppercase tracking-wider text-muted">Uptime</div>
      </div>
    </div>
  );
}

function RiskTierBar({ tierPcts }: { tierPcts: Record<RiskTier, number> }) {
  const total = Object.values(tierPcts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Live allocation</span>
        <span className="text-[10px] text-muted">Grid + stake only</span>
      </div>
      <div className="flex h-4 overflow-hidden rounded-full">
        {TIER_ORDER.map((tier) => (
          <div
            key={tier}
            className="h-full"
            style={{
              width: `${(tierPcts[tier] / total) * 100}%`,
              backgroundColor: RISK_TIERS[tier].color,
            }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {TIER_ORDER.map((tier) => {
          const info = RISK_TIERS[tier];
          const pct = ((tierPcts[tier] / total) * 100).toFixed(0);
          return (
            <div key={tier} className="flex items-start gap-2">
              <div
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: info.color }}
              />
              <div>
                <div className="text-xs font-medium">
                  {info.label} <span className="text-muted">{pct}%</span>
                </div>
                <div className="text-[10px] text-muted leading-snug">{info.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentFleet() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Agent fleet</h2>
        <Badge tone="neon">Grid Trader</Badge>
      </div>
      <div className="space-y-2">
        {AGENTS.map((agent) => (
          <div
            key={agent.id}
            className="rounded-2xl border border-border bg-card/60 px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AgentDot status={agent.status} />
                <span className="text-sm font-medium">{agent.name}</span>
              </div>
              <span className="text-[10px] font-mono text-neon">
                {(agent.winRate * 100).toFixed(0)}% win
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted leading-snug">{agent.role}</p>
            <p className="mt-1.5 truncate font-mono text-[10px] text-neon/70">
              {agent.lastAction}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "bg-neon",
    executing: "bg-warn animate-pulse",
    idle: "bg-muted",
  };
  return (
    <div className={`h-2 w-2 rounded-full ${colors[status] ?? "bg-muted"}`} />
  );
}

function StrategyList({
  allocation,
  strategies,
}: {
  allocation: Record<string, number>;
  strategies: { id: string; cagr: number }[];
}) {
  const liveById = new Map(strategies.map((s) => [s.id, s]));

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">Strategies</h2>
      <div className="space-y-2">
        {STRATEGIES.map((strategy) => {
          const weight = allocation[strategy.id] ?? 0;
          const live = liveById.get(strategy.id);
          return (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              weight={weight}
              liveApy={(live?.cagr ?? 0) * 100}
            />
          );
        })}
      </div>
    </div>
  );
}

function StrategyCard({
  strategy,
  weight,
  liveApy,
}: {
  strategy: YieldStrategy;
  weight: number;
  liveApy: number;
}) {
  const tier = RISK_TIERS[strategy.tier];

  return (
    <div className="rounded-2xl border border-border bg-card/40 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: tier.color }}
            />
            <span className="truncate text-sm font-medium">{strategy.name}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {strategy.assets.map((a) => (
              <span
                key={a}
                className="rounded-md bg-border/60 px-1.5 py-0.5 font-mono text-[9px] text-muted"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-semibold text-neon">{liveApy.toFixed(1)}%</div>
          <div className="text-[10px] text-muted">{(weight * 100).toFixed(1)}% live</div>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted">{strategy.mechanism}</p>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-muted">
        {strategy.agent && <span className="text-neon">{strategy.agent}</span>}
        <span>{STATUS_LABELS[strategy.status]}</span>
      </div>
    </div>
  );
}

function WaterfallSection() {
  return (
    <div className="mb-4">
      <h2 className="mb-3 text-sm font-semibold">Capital flow</h2>
      <div className="relative space-y-0">
        {YIELD_WATERFALL.map((step, i) => (
          <div key={step.step} className="relative flex gap-3 pb-4">
            {i < YIELD_WATERFALL.length - 1 && (
              <div className="absolute left-[11px] top-6 h-full w-px bg-border" />
            )}
            <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neon/30 bg-card text-[10px] font-semibold text-neon">
              {step.step}
            </div>
            <div className="flex-1 pt-0.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium">{step.label}</span>
                <span className="font-mono text-xs text-neon">{step.value}</span>
              </div>
              <p className="text-[10px] text-muted">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
