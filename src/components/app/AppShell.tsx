import { Dashboard } from "../dashboard/Dashboard";
import { BacktestLab } from "../backtest/BacktestLab";
import { LiveFlow } from "../liveflow/LiveFlow";
import { MarketIntel } from "../intelligence/MarketIntel";
import { TreasuryOps } from "../treasury/TreasuryOps";
import { YieldEngine } from "../yield/YieldEngine";
import { AppTopNav } from "../ui/AppTopNav";
import { ProductNav } from "../ui/ProductNav";
import { FaucetScreen } from "../faucet/FaucetScreen";
import { TestnetBanner } from "../ui/TestnetBanner";
import { AchievementToast } from "../gamification/PlayerProgress";
import { LandingHero } from "../landing/LandingHero";
import { OnboardingFlow } from "../onboarding/OnboardingFlow";
import { GuestHomePreview } from "../guest/GuestHomePreview";
import { GuestWalletBar } from "../guest/GuestWalletBar";
import { usePool } from "../../context/PoolContext";
import type { ProductTab } from "../../types/member";

export function AppShell() {
  const { phase, guestScreen, navigateTab, tab } = usePool();
  const guestBarVisible = phase === "guest" && guestScreen !== "onboarding";

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-void">
      <TestnetBanner />
      <AchievementToast />
      <AppTopNav active={tab} onNavigate={navigateTab} />

      <main
        className={`flex-1 overflow-y-auto ${guestBarVisible ? "pb-40" : "pb-24"}`}
      >
        <MainRouter />
      </main>

      {guestBarVisible && (
        <div className="fixed bottom-[4.25rem] left-0 right-0 z-30 mx-auto max-w-[430px]">
          <GuestWalletBar />
        </div>
      )}

      <ProductNav active={tab} onNavigate={navigateTab} />
    </div>
  );
}

function MainRouter() {
  const {
    phase,
    guestScreen,
    tab,
    showFaucet,
    closeFaucet,
    startOnboarding,
    startFaucet,
    startCalculator,
    backToLanding,
    completeOnboarding,
    enterGuestBrowse,
  } = usePool();

  if (showFaucet || (phase === "guest" && guestScreen === "faucet")) {
    return (
      <FaucetScreen
        onBack={() => {
          closeFaucet();
          if (phase === "guest") enterGuestBrowse();
        }}
      />
    );
  }

  if (phase === "guest" && guestScreen === "onboarding") {
    return (
      <OnboardingFlow
        onComplete={(payload) => completeOnboarding(payload)}
        onBack={backToLanding}
        onOpenFaucet={startFaucet}
      />
    );
  }

  if (phase === "guest" && tab === "dashboard" && guestScreen === "landing") {
    return (
      <LandingHero
        onGetStarted={startOnboarding}
        onOpenFaucet={startFaucet}
        onOpenCalculator={() => {
          enterGuestBrowse();
          startCalculator();
        }}
      />
    );
  }

  return <ScreenRouter tab={tab} isGuest={phase === "guest"} />;
}

function ScreenRouter({ tab, isGuest }: { tab: ProductTab; isGuest: boolean }) {
  switch (tab) {
    case "dashboard":
      return isGuest ? <GuestHomePreview /> : <Dashboard />;
    case "liveflow":
      return <LiveFlow />;
    case "yield":
      return <YieldEngine />;
    case "intel":
      return <MarketIntel />;
    case "treasury":
      return <TreasuryOps />;
    case "backtest":
      return <BacktestLab />;
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}
