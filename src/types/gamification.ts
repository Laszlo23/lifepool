export type AchievementId =
  | "wallet_connected"
  | "faucet_claimed"
  | "onchain_joined"
  | "first_mint"
  | "rewards_claimed"
  | "onboarding_complete"
  | "streak_3"
  | "streak_7";

export interface AchievementDef {
  id: AchievementId;
  title: string;
  description: string;
  xp: number;
  emoji: string;
}

export interface GamificationState {
  xp: number;
  unlocked: AchievementId[];
  streakDays: number;
  lastVisitDate: string | null;
  totalVisits: number;
}
