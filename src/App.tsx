import { BacktestLab } from "./components/backtest/BacktestLab";
import { AppShell } from "./components/app/AppShell";
import { GuestFlow } from "./components/app/GuestFlow";
import { Dashboard } from "./components/dashboard/Dashboard";
import { LiveFlow } from "./components/liveflow/LiveFlow";
import { MarketIntel } from "./components/intelligence/MarketIntel";
import { LandingHero } from "./components/landing/LandingHero";
import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";
import { AppNav, type AppView } from "./components/ui/AppNav";
import { PhoneFrame } from "./components/ui/PhoneFrame";
import { YieldEngine } from "./components/yield/YieldEngine";
import { usePool } from "./context/PoolContext";
import { useState } from "react";

const IS_DEV_SHOWCASE =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("dev");

function App() {
  const { phase } = usePool();

  if (IS_DEV_SHOWCASE) {
    return <DevShowcaseApp />;
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-void">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neon/10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-neon border-t-transparent" />
          </div>
          <p className="text-sm text-muted">Loading market data & engine…</p>
        </div>
      </div>
    );
  }

  if (phase === "guest") {
    return <GuestFlow />;
  }

  return <AppShell />;
}

function DevShowcaseApp() {
  const [view, setView] = useState<AppView>("showcase");
  const { activateDemoMember, completeOnboarding } = usePool();

  return (
    <div className="min-h-dvh bg-void">
      <AppNav view={view} onViewChange={setView} />

      {view === "showcase" && (
        <Showcase
          onStartOnboarding={() => setView("onboarding")}
          onViewDashboard={() => {
            activateDemoMember();
            setView("dashboard");
          }}
        />
      )}

      {view === "landing" && (
        <div className="flex justify-center py-10">
          <PhoneFrame label="Landing · Hero">
            <LandingHero onGetStarted={() => setView("onboarding")} />
          </PhoneFrame>
        </div>
      )}

      {view === "onboarding" && (
        <div className="flex justify-center py-10">
          <PhoneFrame label="Onboarding · 4 steps">
            <OnboardingFlow
              onComplete={(payload) => {
                completeOnboarding(payload);
                setView("dashboard");
              }}
              onBack={() => setView("landing")}
            />
          </PhoneFrame>
        </div>
      )}

      {view === "dashboard" && (
        <div className="flex justify-center py-10">
          <PhoneFrame label="Dashboard · Live engine">
            <Dashboard />
          </PhoneFrame>
        </div>
      )}

      {view === "yield" && (
        <div className="flex justify-center py-10">
          <PhoneFrame label="Yield Engine · Live allocation">
            <YieldEngine />
          </PhoneFrame>
        </div>
      )}

      {view === "backtest" && (
        <div className="flex justify-center py-10">
          <PhoneFrame label="Yield Calculator">
            <BacktestLab />
          </PhoneFrame>
        </div>
      )}

      {view === "intel" && (
        <div className="flex justify-center py-10">
          <PhoneFrame label="Move Now · Market intelligence">
            <MarketIntel />
          </PhoneFrame>
        </div>
      )}

      {view === "liveflow" && (
        <div className="flex justify-center py-10">
          <PhoneFrame label="Live Flow · Income & ROI">
            <LiveFlow />
          </PhoneFrame>
        </div>
      )}
    </div>
  );
}

function Showcase({
  onStartOnboarding,
  onViewDashboard,
}: {
  onStartOnboarding: () => void;
  onViewDashboard: () => void;
}) {
  const { completeOnboarding } = usePool();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-16 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neon">
          Dev showcase · add ?dev=1 to URL
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          LifePool
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Production app runs at the root URL. This view is for design review with
          live engine data.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onStartOnboarding}
            className="rounded-2xl bg-neon px-6 py-3 text-sm font-medium text-void"
          >
            Try onboarding flow
          </button>
          <button
            type="button"
            onClick={onViewDashboard}
            className="rounded-2xl border border-border bg-card px-6 py-3 text-sm font-medium"
          >
            Launch with demo member
          </button>
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-2 xl:grid-cols-3">
        <PhoneFrame label="Landing">
          <LandingHero onGetStarted={onStartOnboarding} />
        </PhoneFrame>
        <PhoneFrame label="Onboarding">
          <OnboardingFlow
            onComplete={(payload) => {
              completeOnboarding(payload);
              onViewDashboard();
            }}
            onBack={() => {}}
          />
        </PhoneFrame>
        <PhoneFrame label="Dashboard">
          <Dashboard />
        </PhoneFrame>
        <PhoneFrame label="Yield Engine">
          <YieldEngine />
        </PhoneFrame>
        <PhoneFrame label="Live Flow">
          <LiveFlow />
        </PhoneFrame>
        <PhoneFrame label="Move Now">
          <MarketIntel />
        </PhoneFrame>
        <PhoneFrame label="Calculator">
          <BacktestLab />
        </PhoneFrame>
      </div>
    </div>
  );
}

export default App;
