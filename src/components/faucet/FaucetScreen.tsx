import { Droplets, Wallet } from "lucide-react";
import { formatUnits } from "viem";
import { useWallet } from "../../hooks/useWeb3Ready";
import { useFaucet } from "../../hooks/useLifePool";
import { useLifeEurBalance, useCollateralBalances } from "../../hooks/useLifeEUR";
import { useReadContract } from "wagmi";
import { activeChain } from "../../lib/chains";
import { CONTRACTS, erc20Abi } from "../../lib/contracts";
import { ChainGate } from "../ui/ChainGate";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface FaucetScreenProps {
  onBack?: () => void;
}

export function FaucetScreen({ onBack }: FaucetScreenProps) {
  const { address, isConnected, connectWallet, connecting, isReady } = useWallet();
  const { canClaim, claim, isPending, isSuccess, error, isGasless } = useFaucet();
  const { data: lifeEurBalance, refetch: refetchLifeEur } = useLifeEurBalance();
  const { wbtc, xrp } = useCollateralBalances();

  const usdcBal = useReadContract({
    address: CONTRACTS.tUSDC,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isReady },
  });

  async function handleClaim() {
    await claim();
    await refetchLifeEur();
    await wbtc.refetch();
    await xrp.refetch();
    await usdcBal.refetch();
  }

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-10 pt-6">
      {onBack && (
        <button type="button" onClick={onBack} className="mb-4 text-sm text-muted">
          ← Back
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">Base Sepolia testnet</Badge>
        {isGasless && <Badge tone="neon">Gas sponsored</Badge>}
      </div>
      <h1 className="mt-3 text-[28px] font-semibold tracking-tight">LifePool Faucet</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Free testnet funds to join the pool. Claim once every 24 hours per wallet.
        {isGasless ? " No Sepolia ETH needed with Coinbase Smart Wallet." : ""}
      </p>

      <div className="mt-4">
        <ChainGate />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon/15">
            <Droplets className="h-6 w-6 text-neon" />
          </div>
          <div>
            <p className="text-sm font-semibold">Testnet drip</p>
            <p className="text-xs text-muted">
              500 tUSDC · 0.01 tWBTC · 100 tXRP · 50 LIFEUR
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-1 text-xs text-muted">
          <p>Network: {activeChain.name} (chain {activeChain.id})</p>
          {isConnected && address && (
            <p className="font-mono text-[10px] text-text/70">{address}</p>
          )}
        </div>

        {isReady && isConnected && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <BalancePill label="LIFEUR" value={formatBal(lifeEurBalance, 18)} />
            <BalancePill label="tUSDC" value={formatBal(usdcBal.data, 6)} />
            <BalancePill label="tWBTC" value={formatBal(wbtc.data, 8)} />
            <BalancePill label="tXRP" value={formatBal(xrp.data, 6)} />
          </div>
        )}

        {!isConnected ? (
          <Button
            fullWidth
            className="mt-6"
            size="lg"
            onClick={() => void connectWallet()}
            disabled={connecting}
          >
            <Wallet className="mr-2 h-4 w-4" />
            {connecting ? "Connecting…" : "Connect wallet"}
          </Button>
        ) : !isReady ? (
          <p className="mt-6 text-center text-xs text-amber-300">
            Switch to Base Sepolia above to claim.
          </p>
        ) : (
          <Button
            fullWidth
            className="mt-6"
            size="lg"
            onClick={() => void handleClaim()}
            disabled={!canClaim || isPending}
          >
            {isPending ? "Claiming…" : canClaim ? "Claim testnet funds" : "Cooldown active (24h)"}
          </Button>
        )}

        {isSuccess && (
          <p className="mt-4 text-center text-sm text-neon">
            Claimed! Continue onboarding → join pool onchain.
          </p>
        )}
        {error && (
          <p className="mt-4 text-center text-xs text-red-400">
            {(error as Error).message?.split("\n")[0]?.slice(0, 140)}
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-neon/20 bg-neon/5 p-4 text-xs text-muted">
        <p className="font-medium text-neon">Next steps</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          {!isGasless && <li>Get Base Sepolia ETH for gas (Coinbase faucet or bridge)</li>}
          <li>Connect Coinbase or Base Smart Wallet</li>
          <li>Claim faucet funds</li>
          <li>Join LifePool onchain (25–100 LIFEUR by tier)</li>
          <li>Deposit tUSDC premium in Ops tab</li>
        </ol>
      </div>
    </div>
  );
}

function formatBal(value: bigint | undefined, decimals: number) {
  if (value === undefined) return "—";
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: decimals === 18 ? 2 : 4,
  });
}

function BalancePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-void/60 px-2 py-1.5">
      <span className="text-muted">{label}</span>{" "}
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}
