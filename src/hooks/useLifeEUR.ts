import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { CONTRACTS, collateralVaultAbi, erc20Abi, lifeEurAbi } from "../lib/contracts";
import { contractCall } from "../lib/paymaster";
import { useSponsoredCalls } from "./useSponsoredCalls";

export { useWallet } from "./useWeb3Ready";

export function useLifeEurBalance() {
  const { address } = useAccount();
  return useReadContract({
    address: CONTRACTS.LifeEUR,
    abi: lifeEurAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useCollateralBalances() {
  const { address } = useAccount();
  const wbtc = useReadContract({
    address: CONTRACTS.tWBTC,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const xrp = useReadContract({
    address: CONTRACTS.tXRP,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  return { wbtc, xrp };
}

export function useMaxMintable() {
  const { address } = useAccount();
  return useReadContract({
    address: CONTRACTS.CollateralVault,
    abi: collateralVaultAbi,
    functionName: "maxMintable",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useMintLifeEur() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess: writeSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const publicClient = usePublicClient();
  const sponsored = useSponsoredCalls();

  const depositAndMint = async (
    asset: `0x${string}`,
    amount: string,
    decimals: number,
    mintAmount: string,
  ) => {
    const parsed = parseUnits(amount, decimals);
    const mintParsed = parseUnits(mintAmount, 18);

    const calls = [
      contractCall(asset, erc20Abi, "approve", [CONTRACTS.CollateralVault, parsed]),
      contractCall(CONTRACTS.CollateralVault, collateralVaultAbi, "depositCollateral", [
        asset,
        parsed,
      ]),
      contractCall(CONTRACTS.CollateralVault, collateralVaultAbi, "mintLifeEur", [mintParsed]),
    ];

    await sponsored.execute(calls, async () => {
      const approveHash = await writeContractAsync({
        address: asset,
        abi: erc20Abi,
        functionName: "approve",
        args: [CONTRACTS.CollateralVault, parsed],
      });
      await publicClient!.waitForTransactionReceipt({ hash: approveHash });

      const depositHash = await writeContractAsync({
        address: CONTRACTS.CollateralVault,
        abi: collateralVaultAbi,
        functionName: "depositCollateral",
        args: [asset, parsed],
      });
      await publicClient!.waitForTransactionReceipt({ hash: depositHash });

      const mintHash = await writeContractAsync({
        address: CONTRACTS.CollateralVault,
        abi: collateralVaultAbi,
        functionName: "mintLifeEur",
        args: [mintParsed],
      });
      await publicClient!.waitForTransactionReceipt({ hash: mintHash });
    });
  };

  return {
    depositAndMint,
    isGasless: sponsored.isSupported,
    isPending: sponsored.isPending || isPending || confirming,
    isSuccess: sponsored.isSuccess || writeSuccess,
    error: sponsored.error ?? error,
  };
}

export function formatLifeEur(value: bigint | undefined) {
  if (value === undefined) return "—";
  return `${Number(formatUnits(value, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} LIFEUR`;
}
