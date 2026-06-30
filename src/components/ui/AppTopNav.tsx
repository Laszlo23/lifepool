import {
  Calculator,
  LayoutDashboard,
  Radar,
  TrendingUp,
  Vault,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { WalletChip } from "../wallet/WalletChip";
import type { ProductTab } from "../../types/member";

const TABS: {
  id: ProductTab;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}[] = [
  { id: "dashboard", label: "Home", shortLabel: "Home", icon: LayoutDashboard },
  { id: "liveflow", label: "Live Flow", shortLabel: "Flow", icon: Waves },
  { id: "yield", label: "Yield", shortLabel: "Yield", icon: TrendingUp },
  { id: "intel", label: "Move Now", shortLabel: "Intel", icon: Radar },
  { id: "treasury", label: "Treasury Ops", shortLabel: "Ops", icon: Vault },
  { id: "backtest", label: "Calculator", shortLabel: "Calc", icon: Calculator },
];

interface AppTopNavProps {
  active: ProductTab;
  onNavigate: (tab: ProductTab) => void;
}

export function AppTopNav({ active, onNavigate }: AppTopNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-void/90 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={() => onNavigate("dashboard")} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon/10 ring-1 ring-neon/20">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
              <circle cx="9" cy="9" r="7" stroke="#00e5a0" strokeWidth="1.5" />
              <circle cx="9" cy="9" r="3" fill="#00e5a0" />
            </svg>
          </div>
          <div className="text-left">
            <span className="block text-sm font-semibold leading-tight">LifePool</span>
            <span className="block text-[10px] text-muted">Protection network</span>
          </div>
        </button>
        <WalletChip />
        <span className="rounded-full border border-neon/30 bg-neon/10 px-2.5 py-1 text-[10px] font-medium text-neon">
          Live
        </span>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all ${
                isActive
                  ? "bg-neon text-void shadow-[0_0_20px_rgba(0,229,160,0.25)]"
                  : "text-muted hover:bg-card hover:text-text"
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
              <span className="text-[10px] font-medium leading-none">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

export { TABS as APP_TABS };
