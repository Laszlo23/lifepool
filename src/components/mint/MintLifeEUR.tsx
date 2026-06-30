import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { useWallet, useCollateralBalances, useMaxMintable, useMintLifeEur, formatLifeEur } from "../../hooks/useLifeEUR";
import { useGamification } from "../../hooks/useGamification";
import { CONTRACTS, collateralVaultAbi } from "../../lib/contracts";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

type MintAsset = "wbtc" | "xrp";

export function MintLifeEUR({ onContinue }: { onContinue?: () => void }) {
  const { address, isConnected, connectWallet } = useWallet();
  const { wbtc, xrp } = useCollateralBalances();
  const { data: maxMintable } = useMaxMintable();
  const { depositAndMint, isPending, isSuccess, isGasless, error } = useMintLifeEur();
  const { unlock } = useGamification();
  const [asset, setAsset] = useState<MintAsset>("wbtc");
  const [amount, setAmount] = useState("0.01");
  const [done, setDone] = useState(false);

  const decimals = asset === "wbtc" ? 8 : 6;
  const balance = asset === "wbtc" ? wbtc.data : xrp.data;
  const symbol = asset === "wbtc" ? "tWBTC" : "tXRP";

  const ratio = useReadContract({
    address: CONTRACTS.CollateralVault,
    abi: collateralVaultAbi,
    functionName: "collateralRatioBps",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  async function runMintFlow() {
    if (!maxMintable) return;
    const half = maxMintable / 2n;
    const mintAmount = half > 0n ? half : maxMintable;
    await depositAndMint(asset === "wbtc" ? CONTRACTS.tWBTC : CONTRACTS.tXRP, amount, decimals, formatUnits(mintAmount, 18));
  }

  useEffect(() => {
    if (isSuccess && !done) {
      setDone(true);
      unlock("first_mint");
    }
  }, [isSuccess, done, unlock]);

  return (
    <div className="flex flex-col px-5 pb-8">
      <Badge tone="accent">Mint LIFEUR · testnet</Badge>
      <h2 className="mt-3 text-[24px] font-semibold tracking-tight">Euro stablecoin</h2>
      <p className="mt-2 text-sm text-muted">
        Deposit testnet BTC/XRP collateral and mint LIFEUR in one batched tx
        {isGasless ? " (gas sponsored)" : ""}.
      </p>

      {!isConnected ? (
        <Button fullWidth className="mt-8" size="lg" onClick={connectWallet}>
          Connect wallet
        </Button>
      ) : (
        <>
          <div className="mt-6 flex gap-2">
            {(["wbtc", "xrp"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAsset(a)}
                className={`flex-1 rounded-xl border py-2 text-sm font-medium ${
                  asset === a ? "border-neon bg-neon/10 text-neon" : "border-border text-muted"
                }`}
              >
                {a === "wbtc" ? "tWBTC" : "tXRP"}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-xs text-muted">
            Collateral amount ({symbol})
            <input
              type="number"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-text"
            />
          </label>

          <div className="mt-4 rounded-xl border border-border bg-card/50 p-3 text-xs text-muted">
            <p>Balance: {balance !== undefined ? formatUnits(balance, decimals) : "—"} {symbol}</p>
            <p>Max mintable: {formatLifeEur(maxMintable)}</p>
            <p>Collateral ratio: {ratio.data ? `${(Number(ratio.data) / 100).toFixed(0)}%` : "—"}</p>
          </div>

          <Button
            fullWidth
            className="mt-6"
            onClick={() => void runMintFlow()}
            disabled={isPending || !maxMintable}
          >
            {isPending ? "Minting…" : "Approve · deposit · mint (1 tx)"}
          </Button>

          {error && (
            <p className="mt-3 text-xs text-red-400">
              {(error as Error).message?.split("\n")[0]?.slice(0, 140)}
            </p>
          )}

          {done && onContinue && (
            <Button fullWidth className="mt-4" size="lg" onClick={onContinue}>
              Continue onboarding
            </Button>
          )}
        </>
      )}
    </div>
  );
}
