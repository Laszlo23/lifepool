import { ArrowLeft } from "lucide-react";
import { BacktestLab } from "../backtest/BacktestLab";

interface GuestCalculatorProps {
  onBack: () => void;
  onGetStarted: () => void;
}

export function GuestCalculator({ onBack, onGetStarted }: GuestCalculatorProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-void">
      <div className="flex items-center gap-3 px-5 pt-14 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-semibold">Yield calculator</h1>
          <p className="text-[11px] text-muted">Grid + stake backtest · live engine</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <BacktestLab />
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-void/95 p-4 backdrop-blur-xl">
        <div className="mx-auto max-w-[430px]">
          <button
            type="button"
            onClick={onGetStarted}
            className="w-full rounded-2xl bg-neon py-3.5 text-sm font-semibold text-void"
          >
            Start with smart wallet →
          </button>
        </div>
      </div>
    </div>
  );
}
