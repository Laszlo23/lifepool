import type { AchievementDef, AchievementId } from "../types/gamification";

export const ACHIEVEMENTS: Record<AchievementId, AchievementDef> = {
  wallet_connected: {
    id: "wallet_connected",
    title: "Wallet linked",
    description: "Connected a smart wallet on Base Sepolia",
    xp: 25,
    emoji: "🔗",
  },
  faucet_claimed: {
    id: "faucet_claimed",
    title: "Testnet drip",
    description: "Claimed faucet funds — no ETH needed",
    xp: 50,
    emoji: "💧",
  },
  onchain_joined: {
    id: "onchain_joined",
    title: "Pool member",
    description: "Joined LifePool onchain with LIFEUR stake",
    xp: 100,
    emoji: "🛡️",
  },
  first_mint: {
    id: "first_mint",
    title: "Minter",
    description: "Minted LIFEUR against collateral",
    xp: 75,
    emoji: "🪙",
  },
  rewards_claimed: {
    id: "rewards_claimed",
    title: "Yield collector",
    description: "Claimed grid rewards from the pool",
    xp: 60,
    emoji: "✨",
  },
  onboarding_complete: {
    id: "onboarding_complete",
    title: "Demo ready",
    description: "Finished the testnet onboarding flow",
    xp: 40,
    emoji: "🚀",
  },
  streak_3: {
    id: "streak_3",
    title: "3-day streak",
    description: "Opened LifePool 3 days in a row",
    xp: 30,
    emoji: "🔥",
  },
  streak_7: {
    id: "streak_7",
    title: "Week warrior",
    description: "7-day visit streak on testnet",
    xp: 70,
    emoji: "⚡",
  },
};

export const LEVEL_NAMES = [
  "Visitor",
  "Explorer",
  "Contributor",
  "Member",
  "Advocate",
  "Champion",
] as const;

/** XP thresholds for each level (index = level - 1). */
export const LEVEL_XP = [0, 50, 120, 220, 350, 500] as const;

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, LEVEL_NAMES.length);
}

export function xpProgressInLevel(xp: number): { current: number; next: number; pct: number } {
  const level = levelFromXp(xp);
  const floor = LEVEL_XP[level - 1] ?? 0;
  const ceiling = LEVEL_XP[level] ?? LEVEL_XP[LEVEL_XP.length - 1] + 200;
  const current = xp - floor;
  const span = ceiling - floor;
  return { current, next: span, pct: span > 0 ? Math.min(100, (current / span) * 100) : 100 };
}
