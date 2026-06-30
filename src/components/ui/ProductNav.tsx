import {
  Calculator,
  LayoutDashboard,
  Radar,
  TrendingUp,
  Vault,
  Waves,
} from "lucide-react";
import type { ProductTab } from "../../types/member";
import { BottomNav } from "./BottomNav";

const PRODUCT_TABS = [
  { id: "dashboard" as const, label: "Home", icon: LayoutDashboard },
  { id: "liveflow" as const, label: "Flow", icon: Waves },
  { id: "yield" as const, label: "Yield", icon: TrendingUp },
  { id: "intel" as const, label: "Intel", icon: Radar },
  { id: "treasury" as const, label: "Ops", icon: Vault },
  { id: "backtest" as const, label: "Calc", icon: Calculator },
];

interface ProductNavProps {
  active: ProductTab;
  onNavigate: (tab: ProductTab) => void;
}

export function ProductNav({ active, onNavigate }: ProductNavProps) {
  return (
    <BottomNav
      items={PRODUCT_TABS.map((tab) => ({
        ...tab,
        active: tab.id === active,
        onClick: () => onNavigate(tab.id),
      }))}
    />
  );
}
