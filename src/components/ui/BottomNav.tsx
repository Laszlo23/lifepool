import type { LucideIcon } from "lucide-react";

export interface BottomNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
}

interface BottomNavProps {
  items: BottomNavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-surface/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[390px] items-stretch justify-around px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.active ?? false;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`group flex min-w-[3.25rem] flex-1 flex-col items-center gap-1 rounded-2xl px-1.5 py-1.5 transition-colors ${
                active ? "text-neon" : "text-muted hover:text-text"
              }`}
            >
              <span
                className={`relative flex h-9 w-9 items-center justify-center rounded-2xl transition-all ${
                  active
                    ? "bg-neon/15 shadow-[0_0_20px_rgba(0,229,160,0.2)]"
                    : "group-hover:bg-card"
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.25 : 1.75}
                  className={active ? "drop-shadow-[0_0_6px_rgba(0,229,160,0.5)]" : ""}
                />
              </span>
              <span
                className={`text-[10px] font-medium leading-none ${
                  active ? "text-neon" : ""
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
