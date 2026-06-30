import deployments from "../../deployments/base-sepolia.json";

export type ContractName = keyof typeof deployments.contracts;

function addr(name: ContractName): `0x${string}` {
  return deployments.contracts[name] as `0x${string}`;
}

export const CONTRACTS = {
  LifeEUR: addr("LifeEUR"),
  MockOracle: addr("MockOracle"),
  tUSDC: addr("tUSDC"),
  tWBTC: addr("tWBTC"),
  tXRP: addr("tXRP"),
  CollateralVault: addr("CollateralVault"),
  LifePoolVault: addr("LifePoolVault"),
  TreasuryVault: addr("TreasuryVault"),
  RewardDistributor: addr("RewardDistributor"),
  LifePoolFaucet: addr("LifePoolFaucet"),
} as const;

export const lifeEurAbi = [
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "pure" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
] as const;

export const erc20Abi = [
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
] as const;

export const collateralVaultAbi = [
  { type: "function", name: "depositCollateral", inputs: [{ name: "asset", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "mintLifeEur", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "repayLifeEur", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdrawCollateral", inputs: [{ name: "asset", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "maxMintable", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "collateralRatioBps", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "positions", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256", name: "wbtcAmount" }, { type: "uint256", name: "xrpAmount" }, { type: "uint256", name: "debtLifeEur" }], stateMutability: "view" },
] as const;

export const lifePoolVaultAbi = [
  { type: "function", name: "join", inputs: [{ name: "tierId", type: "uint8" }, { name: "lifeEurAmount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdraw", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "membershipOf", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint8", name: "tierId" }, { type: "uint256", name: "deposited" }, { type: "uint256", name: "cycleStart" }, { type: "uint256", name: "cycleEnd" }, { type: "bool", name: "active" }], stateMutability: "view" },
  { type: "function", name: "cycleProgressBps", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "CYCLE_DURATION", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const treasuryVaultAbi = [
  { type: "function", name: "depositPremium", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "executeDca", inputs: [{ name: "amount", type: "uint256" }, { name: "gridBps", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "harvestToRewards", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "treasuryNav", inputs: [], outputs: [{ type: "uint256", name: "premiumBal" }, { type: "uint256", name: "gridBal" }, { type: "uint256", name: "stakeBal" }], stateMutability: "view" },
  { type: "function", name: "gridSleeveBalance", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "stakeSleeveBalance", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "gridAllocationBps", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalPremiumsReceived", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalHarvested", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "lastDcaAt", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "operator", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "event", name: "PremiumDeposited", inputs: [{ name: "from", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "DcaExecuted", inputs: [{ name: "gridAmount", type: "uint256", indexed: false }, { name: "stakeAmount", type: "uint256", indexed: false }, { name: "gridBps", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "Harvested", inputs: [{ name: "amount", type: "uint256", indexed: false }, { name: "operator", type: "address", indexed: true }], anonymous: false },
] as const;

export const mockOracleAbi = [
  { type: "function", name: "getPriceEur", inputs: [{ name: "asset", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "setPrice", inputs: [{ name: "asset", type: "address" }, { name: "priceEur", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

export const faucetAbi = [
  { type: "function", name: "claim", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "canClaim", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "nextClaimAt", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const rewardDistributorAbi = [
  { type: "function", name: "pendingReward", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "claim", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "rewardRateBps", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "rewardPoolBalance", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;
