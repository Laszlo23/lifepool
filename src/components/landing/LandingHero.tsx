import { DIFFERENTIATORS, formatCurrency } from "../../data/pool";
import { usePoolOptional } from "../../context/PoolContext";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface LandingHeroProps {
  onGetStarted: () => void;
  onOpenFaucet?: () => void;
}

export function LandingHero({ onGetStarted, onOpenFaucet }: LandingHeroProps) {
  const pool = usePoolOptional();
  const poolApy = pool?.live?.poolApy?.toFixed(1) ?? "11.4";
  const members = "12,847";

  return (
    <div className="relative min-h-dvh overflow-hidden bg-void px-6 pb-12 pt-14">
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
        <Badge tone="neon">App · iOS & Android</Badge>
      </header>

      <div className="relative z-10 animate-slide-up">
        <Badge tone="accent">Live on crypto · Apple & Google Pay soon</Badge>

        <h1 className="mt-5 text-[34px] font-semibold leading-[1.08] tracking-tight text-text">
          Winning BTC/USDC
          <br />
          <span className="text-neon">grid trading</span> + stake
        </h1>

        <p className="mt-4 max-w-[320px] text-[15px] leading-relaxed text-muted">
          One lucrative grid agent on BTC/USDC swing trades, plus BTC staking.
          Every cycle commits for 4 years, 4 months, and 4 days.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button fullWidth size="lg" onClick={onGetStarted}>
            Start in 60 seconds
          </Button>
          {onOpenFaucet && (
            <Button fullWidth size="lg" variant="secondary" onClick={onOpenFaucet}>
              Claim testnet faucet
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <StoreButton label="App Store" sub="Coming soon" />
            <StoreButton label="Google Play" sub="Coming soon" />
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-8 grid grid-cols-3 gap-2 animate-slide-up">
        <TrustStat label="Live APY" value={`${poolApy}%`} accent />
        <TrustStat label="Members" value={members} />
        <TrustStat label="Setup" value="60 sec" accent />
      </div>

      <div className="relative z-10 mt-8 rounded-3xl border border-neon/20 bg-card/80 p-5 animate-slide-up">
        <p className="text-xs font-medium uppercase tracking-widest text-muted">
          Why people join
        </p>
        <ul className="mt-3 space-y-2">
          {[
            "BTC/USDC grid agent — 81% historical win rate on swings",
            "Native BTC staking for consensus yield",
            `Locked cycles: 4 years · 4 months · 4 days minimum`,
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
          Built different
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
          Get protected now
        </Button>
        <p className="mt-3 text-center text-[10px] text-muted">
          Crypto onboarding live · {formatCurrency(89)}/mo Standard plan
        </p>
      </div>
    </div>
  );
}

function StoreButton({ label, sub }: { label: string; sub: string }) {
  return (
    <button
      type="button"
      className="rounded-2xl border border-border bg-card/60 px-3 py-3 text-left opacity-80"
    >
      <div className="text-xs font-semibold">{label}</div>
      <div className="text-[10px] text-muted">{sub}</div>
    </button>
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
      <div className={`text-lg font-semibold ${accent ? "text-neon" : "text-text"}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}
