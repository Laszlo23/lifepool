export const POOL_DATA = {
  coverageAmount: 200_000,
  monthlyContribution: 89,
  poolTotalCapital: 48_200_000,
  yieldRate: 11.4,
  solvencyRatio: 142,
  activePolicies: 12_847,
  expectedLifetimeValue: 312_400,
  userShare: 0.00052,
  yieldEarned: 312.87,
  monthsActive: 8,
} as const;

/** EUR-denominated LIFEUR — monthly premium, cycle stake, and parametric coverage cap. */
export interface CoverageTier {
  id: "essential" | "standard" | "premium";
  name: string;
  audience: string;
  description: string;
  /** Max parametric payout from the mutual pool (EUR). */
  coverage: number;
  /** Monthly LIFEUR premium → TreasuryVault grid/stake sleeves. */
  monthly: number;
  /** LIFEUR locked in LifePoolVault for the full cycle on join. */
  cycleStake: number;
  /** Lower stakes on Base Sepolia so faucet users can join. */
  cycleStakeTestnet: number;
  /** Reward weight vs Standard (10000 = 1.00×). */
  rewardShareBps: number;
  highlights: readonly string[];
  popular?: boolean;
}

export const COVERAGE_TIERS: readonly CoverageTier[] = [
  {
    id: "essential",
    name: "Essential",
    audience: "Singles · first policy",
    description: "Core parametric cover + grid yield share",
    coverage: 75_000,
    monthly: 49,
    cycleStake: 500,
    cycleStakeTestnet: 25,
    rewardShareBps: 7_500,
    highlights: [
      "€75k verified-trigger cap",
      "€49/mo → treasury DCA",
      "500 LIFEUR cycle lock",
      "0.75× grid reward weight",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    audience: "Families · primary plan",
    description: "Balanced cover + full pool yield weight",
    coverage: 200_000,
    monthly: 89,
    cycleStake: 1_000,
    cycleStakeTestnet: 50,
    rewardShareBps: 10_000,
    popular: true,
    highlights: [
      "€200k verified-trigger cap",
      "€89/mo → BTC grid + stake",
      "1,000 LIFEUR cycle lock",
      "1.00× grid reward weight",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    audience: "Primary earners · max cover",
    description: "Highest cap + boosted yield + priority settlement",
    coverage: 450_000,
    monthly: 159,
    cycleStake: 2_500,
    cycleStakeTestnet: 100,
    rewardShareBps: 13_500,
    highlights: [
      "€450k verified-trigger cap",
      "€159/mo → treasury sleeves",
      "2,500 LIFEUR cycle lock",
      "1.35× grid reward weight",
    ],
  },
] as const;

export function getTierById(id: string): CoverageTier | undefined {
  return COVERAGE_TIERS.find((t) => t.id === id);
}

/** LIFEUR required to call `join()` — testnet uses lower stakes. */
export function getTierJoinStake(tier: CoverageTier): number {
  const isTestnet = Number(import.meta.env.VITE_CHAIN_ID || 84532) === 84532;
  return isTestnet ? tier.cycleStakeTestnet : tier.cycleStake;
}

export function formatRewardShare(bps: number): string {
  return `${(bps / 10_000).toFixed(2)}×`;
}

export function formatEuro(n: number, compact = false): string {
  if (compact && n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (compact && n >= 1_000) return `€${(n / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export const POOL_HISTORY = [
  { month: "Jan", capital: 41.2, yield: 4.2 },
  { month: "Feb", capital: 42.8, yield: 4.3 },
  { month: "Mar", capital: 43.5, yield: 4.4 },
  { month: "Apr", capital: 44.9, yield: 4.5 },
  { month: "May", capital: 45.8, yield: 4.6 },
  { month: "Jun", capital: 47.1, yield: 4.7 },
  { month: "Jul", capital: 48.2, yield: 4.8 },
] as const;

export const DIFFERENTIATORS = [
  {
    title: "No black box",
    subtitle: "Full onchain transparency",
    detail: "Every dollar in, out, and earning yield is visible onchain.",
  },
  {
    title: "No idle premium",
    subtitle: "Capital earns yield",
    detail: "Unused pool capital generates T-bill and low-risk DeFi returns.",
  },
  {
    title: "No slow claims",
    subtitle: "Parametric settlement",
    detail: "Verified triggers execute payouts automatically — no paperwork.",
  },
  {
    title: "No fixed winners",
    subtitle: "Shared risk + yield",
    detail: "All participants benefit from pooled capital efficiency.",
  },
] as const;

/** USD display for legacy UI — LIFEUR ≈ EUR peg. */
export function formatCurrency(n: number, compact = false): string {
  return formatEuro(n, compact);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
