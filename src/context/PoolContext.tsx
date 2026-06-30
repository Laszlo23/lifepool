import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadMarketData } from "../backtest/market-data";
import type { PriceSeries } from "../backtest/types";
import { COVERAGE_TIERS } from "../data/pool";
import {
  computeLivePoolState,
  computeMemberJoinDate,
  type LivePoolState,
} from "../engine/live-pool";
import { addCycleLock } from "../engine/cycle";
import {
  DEFAULT_ENGINE_SETTINGS,
  type EngineSettings,
  type GuestScreen,
  type MemberProfile,
  type PaymentMethod,
  type ProductTab,
} from "../types/member";

const STORAGE_KEY = "lifepool_member_v1";
const SETTINGS_KEY = "lifepool_engine_settings_v1";

interface OnboardingPayload {
  tierId: string;
  walletAddress: string;
  paymentMethod: PaymentMethod;
  onchainJoined?: boolean;
  cycleStartDate?: string;
  cycleEndDate?: string;
}

interface PoolContextValue {
  phase: "loading" | "guest" | "active";
  guestScreen: GuestScreen;
  tab: ProductTab;
  member: MemberProfile | null;
  live: LivePoolState | null;
  marketData: Map<string, PriceSeries> | null;
  settings: EngineSettings;
  error: string | null;
  computing: boolean;
  setTab: (tab: ProductTab) => void;
  startOnboarding: () => void;
  startCalculator: () => void;
  startFaucet: () => void;
  backToLanding: () => void;
  completeOnboarding: (payload: OnboardingPayload) => void;
  updateSettings: (patch: Partial<EngineSettings>) => void;
  refreshEngine: () => void;
  signOut: () => void;
  activateDemoMember: () => void;
  showFaucet: boolean;
  openFaucet: () => void;
  closeFaucet: () => void;
}

const PoolContext = createContext<PoolContextValue | null>(null);

function loadMember(): MemberProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MemberProfile;
    return {
      ...parsed,
      paymentMethod: parsed.paymentMethod ?? "crypto",
      cycleStartDate: parsed.cycleStartDate ?? parsed.joinDate,
      cycleEndDate: parsed.cycleEndDate ?? addCycleLock(parsed.joinDate),
    };
  } catch {
    return null;
  }
}

function loadSettings(): EngineSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_ENGINE_SETTINGS;
    return { ...DEFAULT_ENGINE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ENGINE_SETTINGS;
  }
}

export function PoolProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"loading" | "guest" | "active">("loading");
  const [guestScreen, setGuestScreen] = useState<GuestScreen>("landing");
  const [tab, setTab] = useState<ProductTab>("dashboard");
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [live, setLive] = useState<LivePoolState | null>(null);
  const [marketData, setMarketData] = useState<Map<string, PriceSeries> | null>(
    null,
  );
  const [settings, setSettings] = useState<EngineSettings>(loadSettings);
  const [error, setError] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [showFaucet, setShowFaucet] = useState(false);

  useEffect(() => {
    loadMarketData()
      .then((data) => {
        setMarketData(data);
        const saved = loadMember();
        if (saved) {
          setMember(saved);
          setPhase("active");
        } else {
          setPhase("guest");
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load market data");
        setPhase("guest");
      });
  }, []);

  const runEngine = useCallback(
    (profile: MemberProfile, engineSettings: EngineSettings) => {
      if (!marketData) return;
      setComputing(true);
      setError(null);
      try {
        const state = computeLivePoolState(marketData, profile, engineSettings);
        setLive(state);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Engine computation failed");
        setLive(null);
      } finally {
        setComputing(false);
      }
    },
    [marketData],
  );

  useEffect(() => {
    if (member && marketData && phase === "active") {
      runEngine(member, settings);
    }
  }, [member, marketData, phase, settings, runEngine]);

  const completeOnboarding = useCallback(
    (payload: OnboardingPayload) => {
      if (!marketData) return;
      const tier = COVERAGE_TIERS.find((t) => t.id === payload.tierId);
      if (!tier) return;

    const joinDate = computeMemberJoinDate(marketData);
      const cycleStart = payload.cycleStartDate ?? joinDate;
      const cycleEnd = payload.cycleEndDate ?? addCycleLock(joinDate);
      const profile: MemberProfile = {
        id: crypto.randomUUID(),
        tierId: tier.id,
        tierName: tier.name,
        coverageAmount: tier.coverage,
        monthlyContribution: tier.monthly,
        walletAddress: payload.walletAddress,
        paymentMethod: payload.paymentMethod,
        joinDate,
        cycleStartDate: cycleStart,
        cycleEndDate: cycleEnd,
        activatedAt: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      setMember(profile);
      setPhase("active");
      setTab("dashboard");
      setGuestScreen("landing");
    },
    [marketData],
  );

  const updateSettings = useCallback((patch: Partial<EngineSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const refreshEngine = useCallback(() => {
    if (member) runEngine(member, settings);
  }, [member, settings, runEngine]);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setMember(null);
    setLive(null);
    setPhase("guest");
    setGuestScreen("landing");
    setTab("dashboard");
  }, []);

  const activateDemoMember = useCallback(() => {
    if (!marketData) return;
    const tier = COVERAGE_TIERS.find((t) => t.id === "standard")!;
    const joinDate = computeMemberJoinDate(marketData);
    const profile: MemberProfile = {
      id: "demo-member",
      tierId: tier.id,
      tierName: tier.name,
      coverageAmount: tier.coverage,
      monthlyContribution: tier.monthly,
      walletAddress: "0x7a3f8c2d4e5b6a1098f7e6d5c4b3a2910c82d",
      paymentMethod: "crypto",
      joinDate,
      cycleStartDate: joinDate,
      cycleEndDate: addCycleLock(joinDate),
      activatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setMember(profile);
    setPhase("active");
    setTab("dashboard");
  }, [marketData]);

  const value = useMemo<PoolContextValue>(
    () => ({
      phase,
      guestScreen,
      tab,
      member,
      live,
      marketData,
      settings,
      error,
      computing,
      setTab,
      startOnboarding: () => setGuestScreen("onboarding"),
      startCalculator: () => setGuestScreen("calculator"),
      startFaucet: () => setGuestScreen("faucet"),
      backToLanding: () => setGuestScreen("landing"),
      completeOnboarding,
      updateSettings,
      refreshEngine,
      signOut,
      activateDemoMember,
      showFaucet,
      openFaucet: () => setShowFaucet(true),
      closeFaucet: () => setShowFaucet(false),
    }),
    [
      phase,
      guestScreen,
      tab,
      member,
      live,
      marketData,
      settings,
      error,
      computing,
      completeOnboarding,
      updateSettings,
      refreshEngine,
      signOut,
      activateDemoMember,
      showFaucet,
    ],
  );

  return <PoolContext.Provider value={value}>{children}</PoolContext.Provider>;
}

export function usePool(): PoolContextValue {
  const ctx = useContext(PoolContext);
  if (!ctx) {
    throw new Error("usePool must be used within PoolProvider");
  }
  return ctx;
}

export function usePoolOptional(): PoolContextValue | null {
  return useContext(PoolContext);
}
