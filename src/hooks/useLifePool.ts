import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { formatUnits } from "viem";
import {
  CONTRACTS,
  faucetAbi,
  lifeEurAbi,
  lifePoolVaultAbi,
  rewardDistributorAbi,
} from "../lib/contracts";
import { contractCall } from "../lib/paymaster";
import { useGamification } from "./useGamification";
import { useSponsoredCalls } from "./useSponsoredCalls";
import { useWallet } from "./useWeb3Ready";

export function useFaucet() {
  const { address } = useAccount();
  const { ensureNetwork, isReady } = useWallet();
  const publicClient = usePublicClient();
  const sponsored = useSponsoredCalls();
  const { unlock } = useGamification();

  const canClaim = useReadContract({
    address: CONTRACTS.LifePoolFaucet,
    abi: faucetAbi,
    functionName: "canClaim",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isReady },
  });

  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: writeSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const claim = async () => {
    await ensureNetwork();

    await sponsored.execute([contractCall(CONTRACTS.LifePoolFaucet, faucetAbi, "claim", [])], async () => {
      const txHash = await writeContractAsync({
        address: CONTRACTS.LifePoolFaucet,
        abi: faucetAbi,
        functionName: "claim",
      });
      await publicClient!.waitForTransactionReceipt({ hash: txHash });
    });

    await canClaim.refetch();
    unlock("faucet_claimed");
  };

  return {
    canClaim: canClaim.data ?? false,
    claim,
    isGasless: sponsored.isSupported,
    isPending: sponsored.isPending || isPending || confirming,
    isSuccess: sponsored.isSuccess || writeSuccess,
    error: sponsored.error ?? error,
    reset: () => {
      reset();
      sponsored.reset();
    },
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
    data && data[4] ? new Date(Number(data[3]) * 1000).toISOString().slice(0, 10) : null;
  const cycleStartDate =
    data && data[4] ? new Date(Number(data[2]) * 1000).toISOString().slice(0, 10) : null;

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
  const { isLoading: confirming, isSuccess: writeSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const publicClient = usePublicClient();
  const { ensureNetwork } = useWallet();
  const sponsored = useSponsoredCalls();
  const { unlock } = useGamification();

  const join = async (tierId: number, amountWei: bigint) => {
    await ensureNetwork();

    const calls = [
      contractCall(CONTRACTS.LifeEUR, lifeEurAbi, "approve", [
        CONTRACTS.LifePoolVault,
        amountWei,
      ]),
      contractCall(CONTRACTS.LifePoolVault, lifePoolVaultAbi, "join", [tierId, amountWei]),
    ];

    await sponsored.execute(calls, async () => {
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
    });
    unlock("onchain_joined");
  };

  return {
    join,
    isGasless: sponsored.isSupported,
    isPending: sponsored.isPending || isPending || confirming,
    isSuccess: sponsored.isSuccess || writeSuccess,
    error: sponsored.error ?? error,
  };
}

export function useClaimRewards() {
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess: writeSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const publicClient = usePublicClient();
  const sponsored = useSponsoredCalls();
  const { unlock } = useGamification();

  const claimRewards = async () => {
    await sponsored.execute(
      [contractCall(CONTRACTS.RewardDistributor, rewardDistributorAbi, "claim", [])],
      async () => {
        const txHash = await writeContractAsync({
          address: CONTRACTS.RewardDistributor,
          abi: rewardDistributorAbi,
          functionName: "claim",
        });
        await publicClient!.waitForTransactionReceipt({ hash: txHash });
      },
    );
    unlock("rewards_claimed");
  };

  return {
    claimRewards,
    isGasless: sponsored.isSupported,
    isPending: sponsored.isPending || isPending || confirming,
    isSuccess: sponsored.isSuccess || writeSuccess,
  };
}
