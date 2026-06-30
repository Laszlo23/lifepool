import { useEffect, useState } from "react";
import { parseUnits, formatUnits } from "viem";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { useWallet, useCollateralBalances, useMaxMintable, formatLifeEur } from "../../hooks/useLifeEUR";
import { CONTRACTS, collateralVaultAbi, erc20Abi } from "../../lib/contracts";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

type MintAsset = "wbtc" | "xrp";

export function MintLifeEUR({ onContinue }: { onContinue?: () => void }) {
  const { address, isConnected, connectWallet } = useWallet();
  const { wbtc, xrp } = useCollateralBalances();
  const { data: maxMintable } = useMaxMintable();
  const [asset, setAsset] = useState<MintAsset>("wbtc");
  const [amount, setAmount] = useState("0.01");
  const [step, setStep] = useState<"idle" | "approve" | "deposit" | "mint" | "done">("idle");

  const token = asset === "wbtc" ? CONTRACTS.tWBTC : CONTRACTS.tXRP;
  const decimals = asset === "wbtc" ? 8 : 6;
  const balance = asset === "wbtc" ? wbtc.data : xrp.data;
  const symbol = asset === "wbtc" ? "tWBTC" : "tXRP";

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const ratio = useReadContract({
    address: CONTRACTS.CollateralVault,
    abi: collateralVaultAbi,
    functionName: "collateralRatioBps",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const runApprove = () => {
    setStep("approve");
    writeContract({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [CONTRACTS.CollateralVault, parseUnits(amount || "0", decimals)],
    });
  };

  const runDeposit = () => {
    setStep("deposit");
    writeContract({
      address: CONTRACTS.CollateralVault,
      abi: collateralVaultAbi,
      functionName: "depositCollateral",
      args: [token, parseUnits(amount || "0", decimals)],
    });
  };

  const runMint = () => {
    if (!maxMintable) return;
    const half = maxMintable / 2n;
    setStep("mint");
    writeContract({
      address: CONTRACTS.CollateralVault,
      abi: collateralVaultAbi,
      functionName: "mintLifeEur",
      args: [half > 0n ? half : maxMintable],
    });
  };

  useEffect(() => {
    if (isSuccess && step === "mint") setStep("done");
  }, [isSuccess, step]);

  return (
    <div className="flex flex-col px-5 pb-8">
      <Badge tone="accent">Mint LIFEUR</Badge>
      <h2 className="mt-3 text-[24px] font-semibold tracking-tight">Euro stablecoin</h2>
      <p className="mt-2 text-sm text-muted">
        Deposit BTC or XRP collateral · mint LIFEUR at 150% ratio · win-win rewards for minters who join the pool.
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

          <div className="mt-6 space-y-2">
            <Button fullWidth onClick={runApprove} disabled={isPending}>
              1. Approve {symbol}
            </Button>
            <Button fullWidth variant="secondary" onClick={runDeposit} disabled={isPending}>
              2. Deposit collateral
            </Button>
            <Button fullWidth variant="secondary" onClick={runMint} disabled={isPending || !maxMintable}>
              3. Mint LIFEUR
            </Button>
          </div>

          {step === "done" && onContinue && (
            <Button fullWidth className="mt-4" size="lg" onClick={onContinue}>
              Continue onboarding
            </Button>
          )}
        </>
      )}
    </div>
  );
}
