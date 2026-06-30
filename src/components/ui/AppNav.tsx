import { useEffect, useRef, useState } from "react";
import {
  Calculator,
  LayoutDashboard,
  LayoutGrid,
  Radar,
  Route,
  Smartphone,
  TrendingUp,
  Waves,
  type LucideIcon,
} from "lucide-react";

export type AppView =
  | "showcase"
  | "landing"
  | "onboarding"
  | "dashboard"
  | "liveflow"
  | "yield"
  | "backtest"
  | "intel";

interface NavItem {
  id: AppView;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

const PRIMARY_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { id: "liveflow", label: "Live Flow", shortLabel: "Flow", icon: Waves },
  { id: "yield", label: "Yield Engine", shortLabel: "Yield", icon: TrendingUp },
  { id: "intel", label: "Move Now", shortLabel: "Intel", icon: Radar },
  { id: "backtest", label: "Calculator", shortLabel: "Calc", icon: Calculator },
];

const MORE_NAV: NavItem[] = [
  { id: "showcase", label: "Overview", shortLabel: "All", icon: LayoutGrid },
  { id: "landing", label: "Landing", shortLabel: "Land", icon: Smartphone },
  { id: "onboarding", label: "Onboarding", shortLabel: "Join", icon: Route },
];

interface AppNavProps {
  view: AppView;
  onViewChange: (view: AppView) => void;
}

export function AppNav({ view, onViewChange }: AppNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreActive = MORE_NAV.some((item) => item.id === view);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [moreOpen]);

  const pick = (id: AppView) => {
    onViewChange(id);
    setMoreOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-void/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => onViewChange("showcase")}
          className="group flex shrink-0 items-center gap-2.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon/10 ring-1 ring-neon/20 transition group-hover:bg-neon/15">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
              <circle cx="9" cy="9" r="7" stroke="#00e5a0" strokeWidth="1.5" />
              <circle cx="9" cy="9" r="3" fill="#00e5a0" />
            </svg>
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-sm font-semibold leading-tight">LifePool</span>
            <span className="block text-[10px] text-muted">Protection network</span>
          </div>
        </button>

        <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-border/60 bg-surface/60 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PRIMARY_NAV.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={view === item.id}
              onClick={() => onViewChange(item.id)}
            />
          ))}

          <div className="mx-0.5 h-6 w-px shrink-0 bg-border/80" />

          <div ref={moreRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 transition-colors sm:flex-row sm:gap-2 sm:px-3 ${
                moreActive || moreOpen
                  ? "bg-neon/10 text-neon"
                  : "text-muted hover:bg-card hover:text-text"
              }`}
            >
              <LayoutGrid size={18} strokeWidth={moreActive ? 2.25 : 1.75} />
              <span className="hidden text-[11px] font-medium sm:inline">More</span>
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[11rem] overflow-hidden rounded-2xl border border-border bg-surface/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                {MORE_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = view === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => pick(item.id)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                        active
                          ? "bg-neon/10 text-neon"
                          : "text-muted hover:bg-card hover:text-text"
                      }`}
                    >
                      <Icon size={16} strokeWidth={active ? 2.25 : 1.75} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      title={item.label}
      className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 transition-all sm:flex-row sm:gap-2 sm:px-3 ${
        active
          ? "bg-neon text-void shadow-[0_0_24px_rgba(0,229,160,0.25)]"
          : "text-muted hover:bg-card hover:text-text"
      }`}
    >
      <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
      <span className="text-[10px] font-medium leading-none sm:text-[11px]">
        <span className="sm:hidden">{item.shortLabel}</span>
        <span className="hidden sm:inline">{item.label}</span>
      </span>
    </button>
  );
}
