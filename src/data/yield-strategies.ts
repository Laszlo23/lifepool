export type RiskTier = "grid" | "stake";

export interface YieldStrategy {
  id: string;
  name: string;
  tier: RiskTier;
  allocation: number;
  targetApy: number;
  currentApy: number;
  tvl: number;
  assets: string[];
  mechanism: string;
  agent?: string;
  status: "active" | "harvesting" | "rebalancing" | "executing" | "standby";
}

export interface YieldAgent {
  id: string;
  name: string;
  role: string;
  status: "running" | "idle" | "executing";
  actions24h: number;
  lastAction: string;
  winRate: number;
}

export const YIELD_ENGINE = {
  blendedApy: 19.4,
  gridApy: 24.2,
  stakeApy: 8.4,
  totalDeployed: 48_200_000,
  gridLevels: 24,
  swingTrades30d: 186,
  agentUptime: 99.9,
} as const;

export const RISK_TIERS: Record<
  RiskTier,
  { label: string; allocation: number; description: string; color: string }
> = {
  grid: {
    label: "Grid Agent",
    allocation: 70,
    description: "BTC/USDC swing grid — vol harvest + swing fills (optimized)",
    color: "#00e5a0",
  },
  stake: {
    label: "BTC Staking",
    allocation: 30,
    description: "Native BTC stake — consensus yield + BTC exposure",
    color: "#6366f1",
  },
};

export const STRATEGIES: YieldStrategy[] = [
  {
    id: "btc-grid",
    name: "BTC/USDC Grid Agent",
    tier: "grid",
    allocation: 70,
    targetApy: 24,
    currentApy: 24.2,
    tvl: 32_776_000,
    assets: ["BTC", "USDC"],
    mechanism:
      "Winning grid + swing agent on BTC/USDC. 24 levels, 1.5% swing threshold, optimized vol capture (0.62/0.36). Compounds daily.",
    agent: "Grid Trader",
    status: "executing",
  },
  {
    id: "btc-stake",
    name: "BTC Native Staking",
    tier: "stake",
    allocation: 30,
    targetApy: 8,
    currentApy: 8.4,
    tvl: 15_424_000,
    assets: ["BTC"],
    mechanism:
      "Native BTC staking for consensus rewards. Locked for full 4y·4m·4d cycle — compounds with BTC price.",
    status: "active",
  },
];

export const AGENTS: YieldAgent[] = [
  {
    id: "grid-trader",
    name: "Grid Trader",
    role: "BTC/USDC grid + swing — master copy-trade wallet (B3OS operator)",
    status: "executing",
    actions24h: 1_847,
    lastAction: "Copy-trade mirror · swing fill + DCA · followers synced",
    winRate: 0.81,
  },
  {
    id: "cycle-keeper",
    name: "Cycle Keeper",
    role: "Enforces 4y·4m·4d lock — no early exits, DCA on schedule",
    status: "running",
    actions24h: 24,
    lastAction: "Cycle day 412 of 1,584 · next DCA in 6 days",
    winRate: 1,
  },
  {
    id: "stake-validator",
    name: "Stake Validator",
    role: "Routes stake slice to native BTC validators, auto-compound",
    status: "running",
    actions24h: 12,
    lastAction: "Staking rewards compounded — +0.009% today",
    winRate: 0.99,
  },
];

export const YIELD_WATERFALL = [
  { step: 1, label: "Premiums in", value: "USDC", detail: "Monthly member contributions" },
  { step: 2, label: "Grid deployment", value: "70%", detail: "BTC/USDC swing grid agent (optimized)" },
  { step: 3, label: "BTC staking", value: "30%", detail: "Native validator stake" },
  { step: 4, label: "Cycle lock", value: "4y·4m·4d", detail: "Minimum commitment per cycle" },
  { step: 5, label: "Harvest", value: "Daily", detail: "Grid profits compound in-cycle" },
  { step: 6, label: "Member share", value: "Pro-rata", detail: "Yield by pool contribution" },
] as const;

export function getStrategiesByTier(tier: RiskTier): YieldStrategy[] {
  return STRATEGIES.filter((s) => s.tier === tier);
}

export function getTierTvl(tier: RiskTier): number {
  return getStrategiesByTier(tier).reduce((sum, s) => sum + s.tvl, 0);
}

export function getWeightedApy(): number {
  const total = STRATEGIES.reduce((sum, s) => sum + s.tvl, 0);
  const weighted = STRATEGIES.reduce((sum, s) => sum + s.currentApy * s.tvl, 0);
  return weighted / total;
}
