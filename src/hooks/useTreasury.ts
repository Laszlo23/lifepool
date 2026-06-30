import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS, erc20Abi, treasuryVaultAbi } from "../lib/contracts";
import { getLiveOpsSignal, type OpsSignal } from "../lib/ops-signal";
import { useWallet } from "./useWeb3Ready";
import { useCallback, useEffect, useState } from "react";

export function useTreasuryOnchain() {
  const queryOpts = { refetchInterval: 15_000 };

  const nav = useReadContract({
    address: CONTRACTS.TreasuryVault,
    abi: treasuryVaultAbi,
    functionName: "treasuryNav",
    query: queryOpts,
  });

  const gridSleeve = useReadContract({
    address: CONTRACTS.TreasuryVault,
    abi: treasuryVaultAbi,
    functionName: "gridSleeveBalance",
    query: queryOpts,
  });

  const stakeSleeve = useReadContract({
    address: CONTRACTS.TreasuryVault,
    abi: treasuryVaultAbi,
    functionName: "stakeSleeveBalance",
    query: queryOpts,
  });

  const gridBps = useReadContract({
    address: CONTRACTS.TreasuryVault,
    abi: treasuryVaultAbi,
    functionName: "gridAllocationBps",
    query: queryOpts,
  });

  const totalPremiums = useReadContract({
    address: CONTRACTS.TreasuryVault,
    abi: treasuryVaultAbi,
    functionName: "totalPremiumsReceived",
    query: queryOpts,
  });

  const totalHarvested = useReadContract({
    address: CONTRACTS.TreasuryVault,
    abi: treasuryVaultAbi,
    functionName: "totalHarvested",
    query: queryOpts,
  });

  const lastDcaAt = useReadContract({
    address: CONTRACTS.TreasuryVault,
    abi: treasuryVaultAbi,
    functionName: "lastDcaAt",
    query: queryOpts,
  });

  const operator = useReadContract({
    address: CONTRACTS.TreasuryVault,
    abi: treasuryVaultAbi,
    functionName: "operator",
    query: queryOpts,
  });

  const premiumBal = nav.data?.[0];
  const gridBal = nav.data?.[1];
  const stakeBal = nav.data?.[2];

  return {
    premiumUsdc: premiumBal ? Number(formatUnits(premiumBal, 6)) : 0,
    gridAsset: gridBal ? Number(formatUnits(gridBal, 8)) : 0,
    stakeAsset: stakeBal ? Number(formatUnits(stakeBal, 8)) : 0,
    gridSleeveUsdc: gridSleeve.data ? Number(formatUnits(gridSleeve.data, 6)) : 0,
    stakeSleeveUsdc: stakeSleeve.data ? Number(formatUnits(stakeSleeve.data, 6)) : 0,
    gridAllocationBps: gridBps.data ? Number(gridBps.data) : 6800,
    totalPremiumsUsdc: totalPremiums.data ? Number(formatUnits(totalPremiums.data, 6)) : 0,
    totalHarvestedLifeEur: totalHarvested.data ? Number(formatUnits(totalHarvested.data, 18)) : 0,
    lastDcaAt: lastDcaAt.data ? new Date(Number(lastDcaAt.data) * 1000) : null,
    operator: operator.data,
    refetch: () => {
      nav.refetch();
      gridSleeve.refetch();
      stakeSleeve.refetch();
      gridBps.refetch();
      totalPremiums.refetch();
      totalHarvested.refetch();
      lastDcaAt.refetch();
      operator.refetch();
    },
  };
}

export function useDepositPremium() {
  const { address } = useAccount();
  const { ensureNetwork } = useWallet();
  const publicClient = usePublicClient();
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const usdcBal = useReadContract({
    address: CONTRACTS.tUSDC,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const deposit = async (amountUsdc: number) => {
    await ensureNetwork();
    const amountWei = BigInt(Math.round(amountUsdc * 1e6));

    const approveHash = await writeContractAsync({
      address: CONTRACTS.tUSDC,
      abi: erc20Abi,
      functionName: "approve",
      args: [CONTRACTS.TreasuryVault, amountWei],
    });
    await publicClient!.waitForTransactionReceipt({ hash: approveHash });

    const depositHash = await writeContractAsync({
      address: CONTRACTS.TreasuryVault,
      abi: treasuryVaultAbi,
      functionName: "depositPremium",
      args: [amountWei],
    });
    await publicClient!.waitForTransactionReceipt({ hash: depositHash });
    await usdcBal.refetch();
  };

  return {
    deposit,
    usdcBalance: usdcBal.data ? Number(formatUnits(usdcBal.data, 6)) : 0,
    isPending: isPending || confirming,
    isSuccess,
    error,
  };
}

export function useOpsSignal() {
  const [signal, setSignal] = useState<OpsSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getLiveOpsSignal();
      setSignal(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ops signal");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { signal, loading, error, refresh };
}
