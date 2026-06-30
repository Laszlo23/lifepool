import { useMemo } from "react";
import { getRegimeColor, getRegimeLabel } from "../../backtest/allocator";
import { findHistoricalAnalog, getDcaMultiplier, getLatestBtcPrice, PATTERN_LABELS, type IntelSnapshot, type MoveAction } from "../../backtest/signals";
import { usePool } from "../../context/PoolContext";
import { formatCurrency } from "../../data/pool";
import { Metric } from "../ui/Metric";

const OPPORTUNITY_COLORS = {
  low: "#6b7280",
  medium: "#f59e0b",
  high: "#00e5a0",
  extreme: "#00ffcc",
} as const;

export function MarketIntel() {
  const { live, marketData, member, computing, refreshEngine } = usePool();

  const intel = live?.intel;
  const analog = useMemo(() => {
    if (!marketData || !intel) return null;
    return findHistoricalAnalog(marketData, intel.signal);
  }, [marketData, intel]);

  if (!member) return null;

  if (!intel) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm text-muted">
        {computing ? "Computing market signals…" : "Waiting for engine…"}
      </div>
    );
  }

  const btcPrice = marketData ? getLatestBtcPrice(marketData) : 0;
  const dcaMult = getDcaMultiplier(intel.signal);

  return (
    <div className="min-h-full bg-void">
      <header className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">LifePool · live engine</p>
            <h1 className="text-xl font-semibold tracking-tight">Move Now</h1>
          </div>
          <button
            type="button"
            onClick={refreshEngine}
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-[10px] text-neon"
          >
            Refresh
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Historical patterns · bear-market opportunity engine · data as of{" "}
          {intel.asOf}
        </p>
      </header>

      <div className="px-5 space-y-4">
        <HeadlineCard intel={intel} btcPrice={btcPrice} />

        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Opportunity"
            value={intel.signal.opportunity.toUpperCase()}
            sub={`Score ${intel.signal.opportunityScore}/100`}
            highlight={intel.signal.opportunity !== "low"}
            size="sm"
          />
          <Metric
            label="Recovery odds"
            value={`${(intel.signal.recoveryProbability * 100).toFixed(0)}%`}
            sub="30d historical analog"
            size="sm"
          />
        </div>

        <SignalGauge signal={intel.signal} />

        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="RSI 14" value={intel.signal.rsi14.toFixed(0)} />
          <MiniStat
            label="Off ATH"
            value={`${(intel.signal.drawdownFromAth * 100).toFixed(0)}%`}
            accent={intel.signal.drawdownFromAth > 0.25}
          />
          <MiniStat
            label="Funding proxy"
            value={`${(intel.signal.fundingProxy * 100).toFixed(0)}%`}
            accent={intel.signal.fundingProxy > 0.15}
          />
        </div>

        {analog && (
          <div className="rounded-2xl border border-border bg-card/40 p-4">
            <h2 className="text-sm font-semibold">Historical analog</h2>
            <p className="mt-1 text-[11px] text-muted">
              Similar setup on {analog.date} → BTC{" "}
              <span
                className={
                  analog.outcome30d >= 0 ? "text-neon" : "text-danger"
                }
              >
                {analog.outcome30d >= 0 ? "+" : ""}
                {(analog.outcome30d * 100).toFixed(1)}%
              </span>{" "}
              in 30 days
            </p>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Recommended moves</h2>
          {intel.moves.map((move) => (
            <MoveCard key={move.id} move={move} />
          ))}
        </div>

        {intel.signal.activePatterns.length > 0 && (
          <div className="rounded-2xl border border-border bg-card/30 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Active patterns
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {intel.signal.activePatterns.map((id) => (
                <span
                  key={id}
                  className="rounded-lg border border-neon/20 bg-neon/5 px-2 py-1 text-[10px] text-neon"
                >
                  {PATTERN_LABELS[id] ?? id}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-neon/30 bg-neon/5 p-4">
          <h3 className="text-sm font-semibold text-neon">DCA multiplier</h3>
          <p className="mt-1 text-[11px] text-muted">
            Based on current opportunity score — your next contribution deploys at{" "}
            <span className="font-semibold text-text">{dcaMult}×</span> intensity
            {dcaMult > 1 && (
              <>
                {" "}
                ({formatCurrency(member.monthlyContribution * dcaMult)} effective on{" "}
                {formatCurrency(member.monthlyContribution)}/mo)
              </>
            )}
          </p>
        </div>

        <PhilosophyCard />
      </div>
    </div>
  );
}

function HeadlineCard({
  intel,
  btcPrice,
}: {
  intel: IntelSnapshot;
  btcPrice: number;
}) {
  const { signal } = intel;
  const oppColor = OPPORTUNITY_COLORS[signal.opportunity];

  return (
    <div
      className="rounded-3xl border p-5"
      style={{
        borderColor: `${oppColor}40`,
        background: `linear-gradient(135deg, ${oppColor}08 0%, transparent 60%)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ backgroundColor: oppColor }}
            />
            <span
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: oppColor }}
            >
              {getRegimeLabel(signal.regime)} · {signal.bearPhase}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-snug">
            {intel.headline}
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            {intel.subheadline}
          </p>
        </div>
        {btcPrice > 0 && (
          <div className="shrink-0 text-right">
            <div className="text-[9px] uppercase tracking-wider text-muted">
              BTC
            </div>
            <div className="text-sm font-semibold">
              {formatCurrency(btcPrice)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SignalGauge({
  signal,
}: {
  signal: IntelSnapshot["signal"];
}) {
  const score = signal.opportunityScore;
  const regimeColor = getRegimeColor(signal.regime);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-muted">Opportunity score</span>
        <span className="font-semibold" style={{ color: regimeColor }}>
          {score}/100
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-void">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, ${regimeColor}, #00e5a0)`,
          }}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted">
        <span>7d momentum {(signal.momentum7d * 100).toFixed(1)}%</span>
        <span>30d momentum {(signal.momentum30d * 100).toFixed(1)}%</span>
        <span>30d vol {(signal.vol30d * 100).toFixed(1)}%</span>
        <span>Phase: {signal.bearPhase}</span>
      </div>
    </div>
  );
}

function MoveCard({ move }: { move: MoveAction }) {
  const priorityStyles = {
    now: "border-neon/40 bg-neon/5",
    soon: "border-amber-500/30 bg-amber-500/5",
    watch: "border-border bg-card/30",
  };
  const priorityLabels = {
    now: "Act now",
    soon: "Deploy soon",
    watch: "Monitor",
  };

  const shifts = Object.entries(move.allocationShift);
  const priority = move.priority;

  return (
    <div className={`rounded-2xl border p-4 ${priorityStyles[priority]}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className={`text-[9px] font-semibold uppercase tracking-wider ${
              priority === "now"
                ? "text-neon"
                : priority === "soon"
                  ? "text-amber-400"
                  : "text-muted"
            }`}
          >
            {priorityLabels[priority]}
          </span>
          <h3 className="mt-1 text-sm font-semibold">{move.title}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {move.detail}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[9px] text-muted">Confidence</div>
          <div className="text-sm font-semibold text-neon">
            {(move.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {shifts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {shifts.map(([id, w]) => (
            <span
              key={id}
              className="rounded-md bg-void/60 px-2 py-0.5 font-mono text-[9px] text-muted"
            >
              {id} {(w * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      )}

      <p className="mt-2 text-[10px] text-muted">{move.historicalEdge}</p>
      {move.dcaMultiplier > 1 && (
        <p className="mt-1 text-[10px] font-medium text-neon">
          DCA ×{move.dcaMultiplier}
        </p>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 px-3 py-2.5 text-center">
      <div className="text-[9px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div
        className={`mt-0.5 text-sm font-semibold ${accent ? "text-neon" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function PhilosophyCard() {
  return (
    <div className="rounded-2xl border border-border bg-card/20 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
        How we think about bears
      </h3>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Bear markets are not exit signals — they are the highest-yield deployment
        windows in crypto history. LifePool uses 6 years of Binance OHLCV to
        detect capitulation, funding harvest, and accumulation patterns, then
        routes capital into delta-neutral yield, LP mining, and x402 arb sleeves
        while others sit in cash.
      </p>
    </div>
  );
}
