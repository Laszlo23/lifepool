import { activeChain } from "../../lib/chains";
import { useWallet } from "../../hooks/useWeb3Ready";
import { Button } from "./Button";

interface ChainGateProps {
  compact?: boolean;
}

export function ChainGate({ compact }: ChainGateProps) {
  const {
    isConnected,
    isReady,
    connectWallet,
    switchNetwork,
    connecting,
    connectError,
  } = useWallet();

  if (isReady) return null;

  const message = !isConnected
    ? `Connect your wallet to use LifePool on ${activeChain.name}.`
    : `Switch to ${activeChain.name} (chain ${activeChain.id}) to continue.`;

  if (compact) {
    return (
      <div className="mx-5 mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
        <p className="text-[11px] text-amber-200">{message}</p>
        <button
          type="button"
          onClick={() => void (isConnected ? switchNetwork() : connectWallet())}
          disabled={connecting}
          className="mt-1 text-[11px] font-medium text-neon underline"
        >
          {connecting ? "Working…" : isConnected ? "Switch network" : "Connect wallet"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <p className="text-sm font-medium text-amber-100">Wallet setup required</p>
      <p className="mt-1 text-xs text-amber-200/80">{message}</p>
      {connectError && (
        <p className="mt-2 text-xs text-red-300">
          {(connectError as Error).message?.split("\n")[0]?.slice(0, 100)}
        </p>
      )}
      <Button
        fullWidth
        className="mt-4"
        size="lg"
        onClick={() => void (isConnected ? switchNetwork() : connectWallet())}
        disabled={connecting}
      >
        {connecting
          ? "Working…"
          : isConnected
            ? `Switch to ${activeChain.name}`
            : "Connect wallet"}
      </Button>
    </div>
  );
}
