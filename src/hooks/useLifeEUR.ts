import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { CONTRACTS, collateralVaultAbi, erc20Abi, lifeEurAbi } from "../lib/contracts";

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
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const depositAndMint = async (asset: `0x${string}`, amount: string, decimals: number, mintAmount: string) => {
    const parsed = parseUnits(amount, decimals);
    const mintParsed = parseUnits(mintAmount, 18);

    await writeContract({
      address: asset,
      abi: erc20Abi,
      functionName: "approve",
      args: [CONTRACTS.CollateralVault, parsed],
    });

    await writeContract({
      address: CONTRACTS.CollateralVault,
      abi: collateralVaultAbi,
      functionName: "depositCollateral",
      args: [asset, parsed],
    });

    await writeContract({
      address: CONTRACTS.CollateralVault,
      abi: collateralVaultAbi,
      functionName: "mintLifeEur",
      args: [mintParsed],
    });
  };

  return { depositAndMint, isPending: isPending || confirming, isSuccess, error };
}

export function formatLifeEur(value: bigint | undefined) {
  if (value === undefined) return "—";
  return `${Number(formatUnits(value, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} LIFEUR`;
}
