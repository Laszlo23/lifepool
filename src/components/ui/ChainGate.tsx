import { SmartWalletPanel } from "../wallet/SmartWalletPanel";
import { activeChain } from "../../lib/chains";
import { useWallet } from "../../hooks/useWeb3Ready";

interface ChainGateProps {
  compact?: boolean;
}

export function ChainGate({ compact }: ChainGateProps) {
  const { isReady } = useWallet();

  if (isReady) return null;

  if (compact) {
    return (
      <div className="mx-5 mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
        <p className="text-[11px] text-amber-200">
          Connect a smart wallet on {activeChain.name} to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-1">
      <SmartWalletPanel compact />
    </div>
  );
}
