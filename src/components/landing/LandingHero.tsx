import { DIFFERENTIATORS, formatCurrency } from "../../data/pool";
import { usePoolOptional } from "../../context/PoolContext";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { TestnetBanner } from "../ui/TestnetBanner";

interface LandingHeroProps {
  onGetStarted: () => void;
  onOpenFaucet?: () => void;
  onOpenCalculator?: () => void;
}

export function LandingHero({ onGetStarted, onOpenFaucet, onOpenCalculator }: LandingHeroProps) {
  const pool = usePoolOptional();
  const poolApy = pool?.live?.poolApy?.toFixed(1) ?? "11.4";

  return (
    <div className="relative min-h-dvh overflow-hidden bg-void pb-12">
      <TestnetBanner />

      <div className="relative px-6 pt-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-neon/[0.04] blur-[100px]" />
          <div className="absolute right-0 top-1/3 h-[300px] w-[300px] rounded-full bg-accent/[0.06] blur-[80px]" />
        </div>

        <header className="relative z-10 mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neon/10">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="#00e5a0" strokeWidth="1.5" />
                <circle cx="9" cy="9" r="3" fill="#00e5a0" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight">LifePool</span>
          </div>
          <Badge tone="muted">PoC demo</Badge>
        </header>

        <div className="relative z-10 animate-slide-up">
          <Badge tone="accent">Base Sepolia · Smart wallet · Gasless txs</Badge>

          <h1 className="mt-5 text-[34px] font-semibold leading-[1.08] tracking-tight text-text">
            Try mutual pool +
            <br />
            <span className="text-neon">grid yield</span> on testnet
          </h1>

          <p className="mt-4 max-w-[320px] text-[15px] leading-relaxed text-muted">
            A working proof of concept: LIFEUR stablecoin, onchain pool join, treasury grid agent,
            and gas-sponsored smart wallet txs. Not real insurance — demo only.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button fullWidth size="lg" onClick={onGetStarted}>
              Start testnet demo
            </Button>
            {onOpenCalculator && (
              <Button fullWidth size="lg" variant="secondary" onClick={onOpenCalculator}>
                Yield calculator (simulated)
              </Button>
            )}
            {onOpenFaucet && (
              <Button fullWidth size="lg" variant="secondary" onClick={onOpenFaucet}>
                Claim free testnet funds
              </Button>
            )}
          </div>
        </div>

        <div className="relative z-10 mt-8 grid grid-cols-3 gap-2 animate-slide-up">
          <TrustStat label="Backtest APY" value={`${poolApy}%`} accent />
          <TrustStat label="Network" value="Sepolia" />
          <TrustStat label="Join stake" value="25–100" accent />
        </div>

        <div className="relative z-10 mt-8 rounded-3xl border border-neon/20 bg-card/80 p-5 animate-slide-up">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">
            What you can try today
          </p>
          <ul className="mt-3 space-y-2">
            {[
              "Connect Coinbase or Base Smart Wallet — gas sponsored",
              "Claim faucet · join pool onchain with LIFEUR",
              "Watch simulated yield projections from backtests",
            ].map((line) => (
              <li key={line} className="flex gap-2 text-sm text-muted">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neon" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 mt-8 space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">
            Design goals (future product)
          </p>
          {DIFFERENTIATORS.slice(0, 3).map((d) => (
            <div
              key={d.title}
              className="rounded-2xl border border-border bg-card/50 px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-text">{d.title}</span>
                <span className="text-[11px] text-neon">{d.subtitle}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{d.detail}</p>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-10">
          <Button fullWidth size="lg" onClick={onGetStarted}>
            Open testnet demo
          </Button>
          <p className="mt-3 text-center text-[10px] text-muted">
            Simulated tiers from {formatCurrency(49)}/mo · No real premiums collected
          </p>
        </div>
      </div>
    </div>
  );
}

function TrustStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 px-3 py-3 text-center">
      <div className={`text-lg font-semibold ${accent ? "text-neon" : "text-text"}`}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}
