import { useWallet } from "../../hooks/useWeb3Ready";
import { Badge } from "../ui/Badge";

export function WalletChip() {
  const { isReady, shortAddress, activeConnectorId, disconnect } = useWallet();

  if (!isReady) return null;

  const smart =
    activeConnectorId === "baseAccount" ||
    activeConnectorId === "coinbaseWalletSDK";

  return (
    <button
      type="button"
      onClick={() => disconnect()}
      className="flex items-center gap-1.5 rounded-full border border-neon/25 bg-neon/10 px-2.5 py-1 transition hover:bg-neon/15"
      title="Tap to disconnect"
    >
      {smart && <Badge tone="neon">Smart</Badge>}
      <span className="font-mono text-[10px] font-medium text-neon">
        {shortAddress()}
      </span>
    </button>
  );
}
