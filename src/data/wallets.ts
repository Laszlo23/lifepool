import deployments from "../../deployments/base-sepolia.json";
import { readEnv } from "../lib/env";

export type WalletRoleId =
  | "member"
  | "treasury_vault"
  | "grid_operator"
  | "grid_master"
  | "rewards_pool"
  | "pool_vault";

export interface WalletRole {
  id: WalletRoleId;
  label: string;
  address: `0x${string}` | null;
  description: string;
  /** What this wallet signs */
  responsibilities: readonly string[];
}

const EXPLORER = "https://sepolia.basescan.org";

export function walletExplorerUrl(address: string) {
  return `${EXPLORER}/address/${address}`;
}

/** On-chain wallet map — grid master = operator executing against treasury capital. */
export function getWalletRoles(operatorAddress?: string): WalletRole[] {
  const operator =
    (operatorAddress as `0x${string}` | undefined) ??
    (readEnv("B3OS_OPERATOR_ADDRESS") as `0x${string}` | undefined) ??
    (readEnv("VITE_B3OS_OPERATOR_ADDRESS") as `0x${string}` | undefined) ??
    ("0xaaf620ee9e2a805323BF7363992E33e4412be3FB" as `0x${string}`);

  return [
    {
      id: "member",
      label: "Member wallet",
      address: null,
      description: "Your MetaMask — join pool, deposit premium, claim rewards",
      responsibilities: ["join()", "depositPremium()", "claim()"],
    },
    {
      id: "treasury_vault",
      label: "Treasury vault",
      address: deployments.contracts.TreasuryVault as `0x${string}`,
      description: "Holds USDC float + grid/stake BTC sleeves",
      responsibilities: ["depositPremium", "treasuryNav", "sleeve accounting"],
    },
    {
      id: "grid_operator",
      label: "Grid operator (B3OS)",
      address: operator,
      description: "Signs DCA, grid rebalance, harvest — automated via B3OS",
      responsibilities: ["executeDca", "setGridAllocationBps", "harvestToRewards"],
    },
    {
      id: "grid_master",
      label: "Grid master signal",
      address: operator,
      description: "Master copy-trade wallet — all members mirror this execution",
      responsibilities: ["grid levels", "swing fills", "copy-trade leader"],
    },
    {
      id: "pool_vault",
      label: "LifePool vault",
      address: deployments.contracts.LifePoolVault as `0x${string}`,
      description: "Cycle-locked LIFEUR membership stakes",
      responsibilities: ["join", "withdraw after cycle"],
    },
    {
      id: "rewards_pool",
      label: "Reward distributor",
      address: deployments.contracts.RewardDistributor as `0x${string}`,
      description: "Grid profits harvested here — members claim pro-rata",
      responsibilities: ["stake", "claim", "notifyRewardDeposit"],
    },
  ];
}
