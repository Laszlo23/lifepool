import { Dashboard } from "../dashboard/Dashboard";
import { BacktestLab } from "../backtest/BacktestLab";
import { LiveFlow } from "../liveflow/LiveFlow";
import { MarketIntel } from "../intelligence/MarketIntel";
import { TreasuryOps } from "../treasury/TreasuryOps";
import { YieldEngine } from "../yield/YieldEngine";
import { AppTopNav } from "../ui/AppTopNav";
import { ProductNav } from "../ui/ProductNav";
import { FaucetScreen } from "../faucet/FaucetScreen";
import { usePool } from "../../context/PoolContext";
import type { ProductTab } from "../../types/member";

export function AppShell() {
  const { tab, setTab, showFaucet, closeFaucet } = usePool();

  if (showFaucet) {
    return (
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-void">
        <FaucetScreen onBack={closeFaucet} />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-void">
      <AppTopNav active={tab} onNavigate={setTab} />

      <main className="flex-1 pb-24">
        <ScreenRouter tab={tab} />
      </main>

      <ProductNav active={tab} onNavigate={setTab} />
    </div>
  );
}

function ScreenRouter({ tab }: { tab: ProductTab }) {
  switch (tab) {
    case "dashboard":
      return <Dashboard />;
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
