import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS, faucetAbi, lifeEurAbi, lifePoolVaultAbi, rewardDistributorAbi } from "../lib/contracts";
import { useWallet } from "./useWeb3Ready";

export function useFaucet() {
  const { address } = useAccount();
  const { ensureNetwork, isReady } = useWallet();
  const publicClient = usePublicClient();

  const canClaim = useReadContract({
    address: CONTRACTS.LifePoolFaucet,
    abi: faucetAbi,
    functionName: "canClaim",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isReady },
  });

  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claim = async () => {
    await ensureNetwork();
    const txHash = await writeContractAsync({
      address: CONTRACTS.LifePoolFaucet,
      abi: faucetAbi,
      functionName: "claim",
    });
    await publicClient!.waitForTransactionReceipt({ hash: txHash });
    await canClaim.refetch();
  };

  return {
    canClaim: canClaim.data ?? false,
    claim,
    isPending: isPending || confirming,
    isSuccess,
    error,
    reset,
    refetch: canClaim.refetch,
    isReady,
  };
}

export function useLifePoolOnchain() {
  const { address } = useAccount();

  const membership = useReadContract({
    address: CONTRACTS.LifePoolVault,
    abi: lifePoolVaultAbi,
    functionName: "membershipOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const progress = useReadContract({
    address: CONTRACTS.LifePoolVault,
    abi: lifePoolVaultAbi,
    functionName: "cycleProgressBps",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const pendingReward = useReadContract({
    address: CONTRACTS.RewardDistributor,
    abi: rewardDistributorAbi,
    functionName: "pendingReward",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const data = membership.data;
  const cycleEndDate =
    data && data[4]
      ? new Date(Number(data[3]) * 1000).toISOString().slice(0, 10)
      : null;
  const cycleStartDate =
    data && data[4]
      ? new Date(Number(data[2]) * 1000).toISOString().slice(0, 10)
      : null;

  return {
    isMember: data?.[4] ?? false,
    tierId: data?.[0],
    deposited: data?.[1],
    depositedFormatted: data?.[1] ? formatUnits(data[1], 18) : null,
    cycleStartDate,
    cycleEndDate,
    cycleProgress: progress.data ? Number(progress.data) / 100 : 0,
    pendingReward: pendingReward.data,
    pendingRewardFormatted: pendingReward.data
      ? formatUnits(pendingReward.data, 18)
      : null,
    refetch: () => {
      membership.refetch();
      progress.refetch();
      pendingReward.refetch();
    },
  };
}

export function useJoinPool() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();
  const { ensureNetwork } = useWallet();

  const join = async (tierId: number, amountWei: bigint) => {
    await ensureNetwork();

    const approveHash = await writeContractAsync({
      address: CONTRACTS.LifeEUR,
      abi: lifeEurAbi,
      functionName: "approve",
      args: [CONTRACTS.LifePoolVault, amountWei],
    });
    await publicClient!.waitForTransactionReceipt({ hash: approveHash });

    const joinHash = await writeContractAsync({
      address: CONTRACTS.LifePoolVault,
      abi: lifePoolVaultAbi,
      functionName: "join",
      args: [tierId, amountWei],
    });
    await publicClient!.waitForTransactionReceipt({ hash: joinHash });
    return joinHash;
  };

  return { join, isPending: isPending || confirming, isSuccess, error };
}

export function useClaimRewards() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claimRewards = () => {
    writeContract({
      address: CONTRACTS.RewardDistributor,
      abi: rewardDistributorAbi,
      functionName: "claim",
    });
  };

  return { claimRewards, isPending: isPending || confirming, isSuccess };
}
