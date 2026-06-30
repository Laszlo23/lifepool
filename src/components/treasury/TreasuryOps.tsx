import { formatCurrency } from "../../data/pool";
import { usePool } from "../../context/PoolContext";
import { useDepositPremium, useOpsSignal, useTreasuryOnchain } from "../../hooks/useTreasury";
import {
  operatorWalletUrl,
  treasuryContractUrl,
  treasuryTxUrl,
  useTreasuryActivity,
} from "../../hooks/useTreasuryActivity";
import { ChainGate } from "../ui/ChainGate";
import { GridCopyTradePanel } from "../strategy/GridCopyTradePanel";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useEffect, useState } from "react";

export function TreasuryOps() {
  const { member } = usePool();
  const treasury = useTreasuryOnchain();
  const activity = useTreasuryActivity();
  const { signal, loading: signalLoading, refresh: refreshSignal } = useOpsSignal();
  const { deposit, usdcBalance, isPending, isSuccess, error: depositError } = useDepositPremium();
  const [depositAmount, setDepositAmount] = useState(member?.monthlyContribution ?? 89);

  useEffect(() => {
    if (isSuccess) {
      treasury.refetch();
      void activity.refresh();
    }
  }, [isSuccess, treasury.refetch, activity.refresh]);

  const gridPct = treasury.gridAllocationBps / 100;
  const stakePct = 100 - gridPct;

  return (
    <div className="min-h-full bg-void pb-4">
      <header className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">B3OS · Treasury wallet</p>
            <h1 className="text-xl font-semibold tracking-tight">Ops Center</h1>
          </div>
          <Badge tone="neon">Live</Badge>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Member wallet txs (faucet, join) stay in your wallet. Treasury income appears here after tUSDC deposits + B3OS operator DCA/harvest.
        </p>
      </header>

      <div className="space-y-4 px-5">
        <ChainGate compact />

        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-muted">
          <p className="font-medium text-amber-100">Why B3OS dashboard looks empty</p>
          <p className="mt-1 leading-relaxed">
            B3OS only logs txs from the <span className="text-text">operator wallet</span>, not your member wallet.
            Import workflows from <span className="font-mono text-[10px]">ops/b3os/workflows/</span> and trigger
            <span className="text-text"> treasury-manual-demo</span> for instant activity, or run{" "}
            <span className="font-mono text-[10px]">npm run keeper:all</span>.
          </p>
          {treasury.operator && (
            <a
              href={operatorWalletUrl(treasury.operator)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-neon underline"
            >
              View operator wallet on BaseScan →
            </a>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Treasury NAV</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <NavCell label="USDC float" value={formatCurrency(treasury.premiumUsdc)} />
            <NavCell label="Grid BTC" value={`${treasury.gridAsset.toFixed(4)}`} />
            <NavCell label="Stake BTC" value={`${treasury.stakeAsset.toFixed(4)}`} />
          </div>
          <div className="mt-3 flex gap-2">
            <Badge tone="accent">{gridPct.toFixed(0)}% grid sleeve</Badge>
            <Badge tone="muted">{stakePct.toFixed(0)}% stake sleeve</Badge>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Sleeve accounting</h2>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Grid sleeve (USDC)" value={formatCurrency(treasury.gridSleeveUsdc)} />
            <Row label="Stake sleeve (USDC)" value={formatCurrency(treasury.stakeSleeveUsdc)} />
            <Row label="Premiums received" value={formatCurrency(treasury.totalPremiumsUsdc)} />
            <Row label="Harvested to rewards" value={`${treasury.totalHarvestedLifeEur.toFixed(0)} LIFEUR`} />
            <Row
              label="Last DCA"
              value={treasury.lastDcaAt ? treasury.lastDcaAt.toLocaleString() : "Not yet"}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">On-chain activity</h2>
            <button type="button" onClick={() => void activity.refresh()} className="text-[11px] text-neon">
              Refresh
            </button>
          </div>
          <p className="mt-1 text-[10px] text-muted">
            Premium deposits · operator DCA · harvest to rewards
          </p>
          {activity.loading && <p className="mt-3 text-xs text-muted">Loading events…</p>}
          {activity.error && <p className="mt-3 text-xs text-red-400">{activity.error}</p>}
          {!activity.loading && activity.items.length === 0 && (
            <p className="mt-3 text-xs text-muted">
              No treasury events yet. Deposit tUSDC below, then run B3OS manual demo workflow.
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {activity.items.map((item) => (
              <li key={item.id} className="rounded-xl bg-void/60 px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={
                      item.type === "premium"
                        ? "text-neon"
                        : item.type === "harvest"
                          ? "text-amber-300"
                          : "text-text"
                    }
                  >
                    {item.summary}
                  </span>
                  <a
                    href={treasuryTxUrl(item.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-[10px] text-muted underline"
                  >
                    tx
                  </a>
                </div>
                {item.from && (
                  <p className="mt-0.5 font-mono text-[9px] text-muted">
                    from {item.from.slice(0, 6)}…{item.from.slice(-4)}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <a
            href={treasuryContractUrl()}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-[10px] text-neon underline"
          >
            TreasuryVault on BaseScan →
          </a>
        </section>

        <section className="rounded-2xl border border-neon/20 bg-neon/5 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Ops signal</h2>
            <button type="button" onClick={() => void refreshSignal()} className="text-[11px] text-neon">
              Refresh
            </button>
          </div>
          {signalLoading && <p className="mt-2 text-xs text-muted">Loading market signal…</p>}
          {signal && (
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Regime" value={signal.regime} highlight />
              <Row label="Grid allocation" value={`${signal.gridAllocationBps / 100}%`} />
              <Row label="DCA multiplier" value={`${signal.dcaMultiplier}×`} />
              <Row label="Suggested DCA" value={`$${signal.suggestedDcaUsdc}`} />
              <Row label="Reward rate proxy" value={`${(signal.rewardRateBps / 100).toFixed(1)}%`} />
              <Row label="BTC" value={`$${signal.btcUsd.toLocaleString()}`} />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Deposit monthly premium</h2>
          <p className="mt-1 text-xs text-muted">
            tUSDC → TreasuryVault · B3OS operator runs DCA + harvest on schedule
          </p>
          <p className="mt-2 text-xs text-muted">Your tUSDC: {formatCurrency(usdcBalance)}</p>
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              className="flex-1 rounded-xl border border-border bg-void px-3 py-2 text-sm"
            />
            <Button onClick={() => void deposit(depositAmount)} disabled={isPending}>
              {isPending ? "Depositing…" : "Deposit"}
            </Button>
          </div>
          {isSuccess && (
            <p className="mt-2 text-xs text-neon">Premium deposited to treasury ✓</p>
          )}
          {depositError && (
            <p className="mt-2 text-xs text-red-400">
              {(depositError as Error).message?.split("\n")[0]?.slice(0, 120)}
            </p>
          )}
        </section>

        <GridCopyTradePanel compact />

        <section className="rounded-2xl border border-border bg-card/60 p-4">
          <h2 className="text-sm font-semibold">Automation stack</h2>
          <ul className="mt-2 space-y-2 text-xs text-muted">
            <li>· <span className="text-text">Member wallet</span> — wagmi join + LIFEUR cycle lock</li>
            <li>· <span className="text-text">Treasury wallet</span> — B3OS org wallet (operator)</li>
            <li>· <span className="text-text">Keepers</span> — oracle · rewards · DCA · harvest</li>
            <li>· <span className="text-text">Signal API</span> — GET /api/ops/signal for B3OS</li>
          </ul>
          {treasury.operator && (
            <p className="mt-3 break-all font-mono text-[10px] text-muted">
              Operator: {treasury.operator}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function NavCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-void/60 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-base font-semibold text-neon">{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={highlight ? "font-medium text-neon" : "font-medium"}>{value}</span>
    </div>
  );
}
