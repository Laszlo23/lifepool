import { Fingerprint, Loader2, Wallet } from "lucide-react";
import { activeChain } from "../../lib/chains";
import { useWallet } from "../../hooks/useWeb3Ready";
import { WALLET_OPTIONS, type WalletConnectorId } from "../../lib/wagmi";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface SmartWalletPanelProps {
  compact?: boolean;
  onConnected?: () => void;
}

export function SmartWalletPanel({ compact, onConnected }: SmartWalletPanelProps) {
  const {
    address,
    isConnected,
    isReady,
    isWrongChain,
    connectWith,
    switchNetwork,
    connecting,
    connectError,
    activeConnectorId,
    shortAddress,
  } = useWallet();

  async function pick(id: WalletConnectorId) {
    await connectWith(id);
    if (!isWrongChain) onConnected?.();
  }

  if (isConnected && isReady) {
    const label =
      WALLET_OPTIONS.find((o) => o.id === activeConnectorId)?.title ?? "Smart wallet";
    return (
      <div
        className={`rounded-2xl border border-neon/35 bg-gradient-to-br from-neon/10 to-accent/5 ${
          compact ? "p-4" : "p-5"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neon/20 ring-1 ring-neon/30">
              <Fingerprint className="text-neon" size={22} />
            </div>
            <div>
              <div className="text-xs text-muted">{label}</div>
              <div className="font-mono text-sm font-medium text-neon">
                {shortAddress(address)}
              </div>
              <div className="mt-0.5 text-[10px] text-neon/80">
                {activeChain.name} · connected
              </div>
            </div>
          </div>
          <Badge tone="neon">Live</Badge>
        </div>
      </div>
    );
  }

  if (isConnected && isWrongChain) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm font-medium text-amber-100">Switch to {activeChain.name}</p>
        <p className="mt-1 text-xs text-amber-200/80">
          Your smart wallet is on another network. One tap to continue.
        </p>
        <Button fullWidth className="mt-4" onClick={() => void switchNetwork()} disabled={connecting}>
          {connecting ? "Switching…" : `Switch to ${activeChain.name}`}
        </Button>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && (
        <div className="mb-1 flex items-center gap-2 text-muted">
          <Wallet size={16} />
          <span className="text-xs font-medium uppercase tracking-wider">
            Smart wallet · Base Sepolia
          </span>
        </div>
      )}

      {WALLET_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={connecting}
          onClick={() => void pick(opt.id)}
          className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${
            opt.primary
              ? "border-neon/50 bg-neon/5 shadow-[0_0_32px_rgba(0,229,160,0.12)]"
              : "border-border bg-card/50 hover:border-border hover:bg-card"
          }`}
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              opt.primary ? "bg-neon/20" : "bg-border/60"
            }`}
          >
            {connecting ? (
              <Loader2 className="animate-spin text-neon" size={22} />
            ) : (
              <Fingerprint className={opt.primary ? "text-neon" : "text-muted"} size={22} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{opt.title}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
                  opt.primary ? "bg-neon text-void" : "bg-border text-muted"
                }`}
              >
                {opt.badge}
              </span>
            </div>
            <div className="text-xs text-muted">{opt.subtitle}</div>
          </div>
        </button>
      ))}

      {connectError && (
        <p className="text-xs text-red-400">
          {(connectError as Error).message?.split("\n")[0]?.slice(0, 120)}
        </p>
      )}
    </div>
  );
}
