import { Copy, Wallet, Zap } from "lucide-react";
import { getRegimeLabel } from "../../backtest/allocator";
import { walletExplorerUrl } from "../../data/wallets";
import { GRID_BOT_CONFIG } from "../../strategy/grid-bot";
import { useGridStrategy } from "../../hooks/useGridStrategy";
import { useAccount } from "wagmi";
import { Badge } from "../ui/Badge";

export function GridCopyTradePanel({ compact }: { compact?: boolean }) {
  const { strategy, loading, error, refresh } = useGridStrategy();
  const { address } = useAccount();

  if (loading && !strategy) {
    return <p className="text-xs text-muted">Loading grid strategy…</p>;
  }
  if (error) {
    return <p className="text-xs text-red-400">{error}</p>;
  }
  if (!strategy) return null;

  const filledLevels = strategy.gridLevels.filter((l) => l.filled).length;
  const memberWallet = strategy.wallets.find((w) => w.id === "member");

  return (
    <section className={`rounded-2xl border border-border bg-card ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-neon" />
          <h2 className="text-sm font-semibold">Grid bot · copy-trade</h2>
        </div>
        <button type="button" onClick={() => void refresh()} className="text-[10px] text-neon">
          Refresh
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="neon">{(strategy.winRateProxy * 100).toFixed(0)}% win rate</Badge>
        <Badge tone="accent">{getRegimeLabel(strategy.regime)}</Badge>
        <Badge tone="muted">{strategy.gridAllocationPct}% grid</Badge>
      </div>

      <p className="mt-2 text-[11px] text-muted">
        {GRID_BOT_CONFIG.levels} levels · {strategy.spacingPct.toFixed(2)}% spacing · swing ≥
        {strategy.swingThresholdPct}% · BTC ${strategy.midPrice.toLocaleString()}
      </p>

      {/* Grid level strip */}
      <div className="mt-3 flex h-8 items-end gap-px overflow-hidden rounded-lg bg-void/80 p-1">
        {strategy.gridLevels.map((level) => (
          <div
            key={level.index}
            title={`${level.side} $${level.priceUsd.toLocaleString()}`}
            className={`flex-1 rounded-sm ${
              level.filled
                ? level.side === "buy"
                  ? "bg-neon/70"
                  : "bg-amber-400/70"
                : "bg-border/40"
            }`}
            style={{ height: `${30 + (level.index % 5) * 8}%` }}
          />
        ))}
      </div>
      <p className="mt-1 text-[9px] text-muted">
        {filledLevels} active fills · mid ${strategy.midPrice.toLocaleString()}
      </p>

      {/* Copy-trade */}
      <div className="mt-4 rounded-xl border border-neon/20 bg-neon/5 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-neon">
          <Copy className="h-3.5 w-3.5" />
          Copy-trade · {strategy.copyTrade.mode.replace(/_/g, " ")}
        </div>
        <p className="mt-1 text-[10px] text-muted">{strategy.copyTrade.lastMirror}</p>
        <a
          href={walletExplorerUrl(strategy.copyTrade.masterWallet)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block font-mono text-[9px] text-neon underline"
        >
          Master {strategy.copyTrade.masterWallet.slice(0, 6)}…
          {strategy.copyTrade.masterWallet.slice(-4)}
        </a>
        <div className="mt-2 space-y-1">
          {strategy.copyTrade.tiers.map((t) => (
            <div key={t.tierId} className="flex justify-between text-[10px]">
              <span className="text-muted">{t.tierName}</span>
              <span className="text-text">{t.mirrorWeight.toFixed(2)}× mirror · €{t.monthlyPremium}/mo</span>
            </div>
          ))}
        </div>
      </div>

      {/* Wallet stack */}
      {!compact && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium">
            <Wallet className="h-3.5 w-3.5 text-muted" />
            Wallet stack
          </div>
          <ul className="space-y-2">
            {strategy.wallets.map((w) => (
              <li key={w.id} className="rounded-lg bg-void/60 px-2 py-1.5 text-[10px]">
                <div className="font-medium text-text">{w.label}</div>
                <div className="text-muted">{w.description}</div>
                {w.address && (
                  <a
                    href={walletExplorerUrl(w.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-neon underline"
                  >
                    {w.id === "member" && address
                      ? `${address.slice(0, 6)}…${address.slice(-4)} (you)`
                      : `${w.address.slice(0, 6)}…${w.address.slice(-4)}`}
                  </a>
                )}
                {w.id === "member" && !address && (
                  <span className="text-muted">{memberWallet?.description}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action queue */}
      <div className="mt-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Operator queue</p>
        <ul className="mt-2 space-y-1.5">
          {strategy.actions.map((a) => (
            <li
              key={a.id}
              className={`rounded-lg px-2 py-1.5 text-[10px] ${
                a.priority === "high" ? "border border-neon/20 bg-neon/5" : "bg-void/50"
              }`}
            >
              <span className="font-medium text-text">{a.label}</span>
              <span className="text-muted"> — {a.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
