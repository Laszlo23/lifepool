export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceSeries {
  symbol: string;
  candles: Candle[];
}

export interface DailyReturn {
  date: string;
  return: number;
}

export interface StrategyBacktestResult {
  id: string;
  name: string;
  tier: string;
  allocation: number;
  finalValue: number;
  totalReturn: number;
  cagr: number;
  maxDrawdown: number;
  sharpe: number;
  dailyValues: { date: string; value: number }[];
  dailyReturns: DailyReturn[];
}

export interface PortfolioSnapshot {
  date: string;
  nav: number;
  coreNav: number;
  yieldNav: number;
  alphaNav: number;
  agentNav: number;
  solvencyRatio: number;
  blendedApy: number;
  drawdown: number;
}

export interface BacktestConfig {
  startDate: string;
  endDate: string;
  initialCapital: number;
  monthlyInflow: number;
  optimized?: boolean;
  dailyCompound?: boolean;
  smartDca?: boolean;
  /** Bear-market opportunity hunting via historical signals */
  opportunityMode?: boolean;
  /** Pattern-calibrated allocation shifts from walk-forward learning */
  adaptiveMode?: boolean;
}

export interface RegimeSnapshot {
  date: string;
  regime: "bear" | "neutral" | "bull";
  btcMomentum30d: number;
  btcVol30d: number;
  confidence: number;
}

export type MarketRegime = RegimeSnapshot["regime"];

export interface OptimizationSummary {
  enabled: boolean;
  dailyCompound: boolean;
  smartDca: boolean;
  opportunityMode: boolean;
  compoundBonus: number;
  regimeDays: { bear: number; neutral: number; bull: number };
  avgAllocation: Record<string, number>;
}

export interface ContributionRecord {
  date: string;
  amount: number;
}

export interface MonthlyLedgerEntry {
  month: string;
  contributed: number;
  cumulativeContributed: number;
  balance: number;
  yieldEarned: number;
  poolReturn: number;
}

export interface DataProvenance {
  source: string;
  symbols: string[];
  dataFrom: string;
  dataTo: string;
  tradingDays: number;
  fetchedAt: string;
}

export interface MemberSummary {
  totalContributed: number;
  initialDeposit: number;
  finalBalance: number;
  yieldEarned: number;
  netGain: number;
  roi: number;
  contributionMonths: number;
  avgMonthlyContribution: number;
  beatCash: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  startNav: number;
  endNav: number;
  totalReturn: number;
  cagr: number;
  returnIndex: number;
  maxDrawdown: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  volatility: number;
  bestMonth: number;
  worstMonth: number;
  positiveMonths: number;
  totalMonths: number;
  strategies: StrategyBacktestResult[];
  snapshots: PortfolioSnapshot[];
  monthlyReturns: { month: string; return: number }[];
  contributions: ContributionRecord[];
  monthlyLedger: MonthlyLedgerEntry[];
  member: MemberSummary;
  provenance: DataProvenance;
  regimeHistory: RegimeSnapshot[];
  signalHistory: import("./signals").MarketSignal[];
  optimization: OptimizationSummary;
  baseline?: {
    endNav: number;
    cagr: number;
    yieldEarned: number;
    roi: number;
  };
}

export type StrategyId = "btc-grid" | "btc-stake";

export interface StrategyAllocation {
  id: StrategyId;
  weight: number;
}

export const DEFAULT_ALLOCATIONS: StrategyAllocation[] = [
  { id: "btc-grid", weight: 0.7 },
  { id: "btc-stake", weight: 0.3 },
];

export const STRATEGY_META: Record<
  StrategyId,
  { name: string; tier: "grid" | "stake" }
> = {
  "btc-grid": { name: "BTC/USDC Grid Agent", tier: "grid" },
  "btc-stake": { name: "BTC Native Staking", tier: "stake" },
};
