import { usePool } from "../../context/PoolContext";
import { formatCurrency } from "../../data/pool";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { PlayerProgress } from "../gamification/PlayerProgress";

/** Home tab for guests who browsed past the landing screen. */
export function GuestHomePreview() {
  const { live, computing, startOnboarding, startFaucet, setTab } = usePool();
  const pool = live?.poolResult;
  const intel = live?.intel;

  return (
    <div className="min-h-full bg-void px-5 pb-4 pt-5">
      <Badge tone="accent">Testnet · browse mode</Badge>
      <h1 className="mt-3 text-xl font-semibold tracking-tight">LifePool overview</h1>
      <p className="mt-2 text-sm text-muted">
        Explore yield, intel, and calculator tabs below. Connect a smart wallet when you are ready to
        try onchain.
      </p>

      {computing && (
        <p className="mt-4 text-xs text-neon">Loading backtest engine…</p>
      )}

      <div className="mt-4">
        <PlayerProgress />
      </div>

      {live && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Pool APY (sim)" value={`${live.poolApy.toFixed(1)}%`} accent />
          <Stat label="Pool NAV" value={formatCurrency(pool?.endNav ?? 0, true)} />
          <Stat
            label="Regime"
            value={intel?.signal.regime ?? "—"}
          />
          <Stat
            label="Opportunity"
            value={intel?.signal.opportunity ?? "—"}
          />
        </div>
      )}

      {intel && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Latest signal</p>
          <p className="mt-1 text-sm font-medium text-neon">{intel.headline}</p>
          <p className="mt-1 text-xs text-muted">{intel.subheadline}</p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <Button fullWidth size="lg" onClick={startOnboarding}>
          Start testnet demo
        </Button>
        <Button fullWidth variant="secondary" onClick={startFaucet}>
          Claim testnet faucet
        </Button>
        <Button fullWidth variant="secondary" onClick={() => setTab("backtest")}>
          Open yield calculator
        </Button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold ${accent ? "text-neon" : ""}`}>{value}</div>
    </div>
  );
}
