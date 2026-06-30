export type ProductTab = "dashboard" | "liveflow" | "yield" | "intel" | "treasury" | "backtest";

export type GuestScreen = "landing" | "onboarding" | "faucet";

export type PaymentMethod = "crypto" | "apple_pay" | "google_pay";

export interface MemberProfile {
  id: string;
  tierId: string;
  tierName: string;
  coverageAmount: number;
  monthlyContribution: number;
  walletAddress: string;
  paymentMethod: PaymentMethod;
  cycleStartDate: string;
  cycleEndDate: string;
  joinDate: string;
  activatedAt: string;
}

export interface EngineSettings {
  optimized: boolean;
  dailyCompound: boolean;
  smartDca: boolean;
  opportunityMode: boolean;
}

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  optimized: true,
  dailyCompound: true,
  smartDca: true,
  opportunityMode: true,
};
