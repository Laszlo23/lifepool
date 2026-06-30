import { useState, useEffect, type ReactNode } from "react";
import { parseUnits, formatUnits } from "viem";
import { COVERAGE_TIERS, formatEuro, formatRewardShare, getTierJoinStake } from "../../data/pool";
import type { PaymentMethod } from "../../types/member";
import { CYCLE_LOCK_LABEL } from "../../engine/cycle";
import { useWallet } from "../../hooks/useWeb3Ready";
import { useJoinPool, useLifePoolOnchain } from "../../hooks/useLifePool";
import { useLifeEurBalance } from "../../hooks/useLifeEUR";
import { SmartWalletPanel } from "../wallet/SmartWalletPanel";
import { YieldPreviewStep } from "./YieldPreviewStep";
import { MintLifeEUR } from "../mint/MintLifeEUR";
import { ChainGate } from "../ui/ChainGate";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface OnboardingFlowProps {
  onComplete: (payload: {
    tierId: string;
    walletAddress: string;
    paymentMethod: PaymentMethod;
    onchainJoined?: boolean;
    cycleStartDate?: string;
    cycleEndDate?: string;
  }) => void;
  onBack: () => void;
  onOpenFaucet?: () => void;
}

type Step = "welcome" | "tier" | "projections" | "funding" | "mint" | "wallet" | "review";

const STEPS: Step[] = ["welcome", "tier", "projections", "funding", "wallet", "mint", "review"];

const TIER_IDS: Record<string, number> = {
  essential: 0,
  standard: 1,
  premium: 2,
};

export function OnboardingFlow({ onComplete, onBack, onOpenFaucet }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [selectedTier, setSelectedTier] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("crypto");
  const [onchainJoined, setOnchainJoined] = useState(false);
  const [cycleStartDate, setCycleStartDate] = useState<string | undefined>();
  const [cycleEndDate, setCycleEndDate] = useState<string | undefined>();
  const { address, isReady } = useWallet();
  const { join, isPending: joining, isSuccess: joinSuccess, error: joinError } = useJoinPool();
  const { cycleStartDate: onchainStart, cycleEndDate: onchainEnd, isMember } = useLifePoolOnchain();
  const { data: lifeEurBalance } = useLifeEurBalance();

  const stepIndex = STEPS.indexOf(step);
  const tier = COVERAGE_TIERS.find((t) => t.id === selectedTier)!;
  const hasEnoughLifeEur =
    (lifeEurBalance ?? 0n) >= parseUnits(String(getTierJoinStake(tier)), 18);

  useEffect(() => {
    if (joinSuccess || isMember) {
      setOnchainJoined(true);
      if (onchainStart) setCycleStartDate(onchainStart);
      if (onchainEnd) setCycleEndDate(onchainEnd);
    }
  }, [joinSuccess, isMember, onchainStart, onchainEnd]);

  function next() {
    const idx = STEPS.indexOf(step);
    if (step === "funding" && paymentMethod !== "crypto") {
      setStep("review");
      return;
    }
    if (step === "wallet" && hasEnoughLifeEur) {
      const stake = getTierJoinStake(tier);
      if ((lifeEurBalance ?? 0n) >= parseUnits(String(stake), 18)) {
        setStep("review");
        return;
      }
    }
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1]!);
    } else {
      onComplete({
        tierId: selectedTier,
        walletAddress: address || "",
        paymentMethod,
        onchainJoined,
        cycleStartDate,
        cycleEndDate,
      });
    }
  }

  async function joinOnchain() {
    if (!address) return;
    const tierNum = TIER_IDS[selectedTier] ?? 1;
    const stake = getTierJoinStake(tier);
    const amount = parseUnits(String(stake), 18);
    await join(tierNum, amount);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-void">
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button
          type="button"
          onClick={step === "welcome" ? onBack : () => setStep(STEPS[stepIndex - 1]!)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                i <= stepIndex ? "w-5 bg-neon" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>
        <span className="w-9 text-right text-xs text-muted">{stepIndex + 1}/{STEPS.length}</span>
      </div>

      <div className="flex-1 px-5 pb-8">
        {step === "welcome" && <WelcomeStep onNext={next} />}
        {step === "tier" && (
          <TierStep selected={selectedTier} onSelect={setSelectedTier} onNext={next} />
        )}
        {step === "projections" && (
          <YieldPreviewStep tierId={selectedTier} onNext={next} />
        )}
        {step === "funding" && (
          <FundingStep
            tier={tier}
            selected={paymentMethod}
            onSelect={setPaymentMethod}
            onNext={next}
          />
        )}
        {step === "mint" && (
          <>
            {hasEnoughLifeEur ? (
              <SkipMintStep balance={lifeEurBalance!} tier={tier} onNext={next} />
            ) : (
              <MintLifeEUR onContinue={next} />
            )}
          </>
        )}
        {step === "wallet" && (
          <WalletStep
            isReady={isReady}
            onOpenFaucet={onOpenFaucet}
            onNext={next}
          />
        )}
        {step === "review" && (
          <ReviewStep
            tier={tier}
            paymentMethod={paymentMethod}
            walletAddress={address ?? ""}
            onchainJoined={onchainJoined}
            joining={joining}
            joinError={joinError}
            onJoinOnchain={() => void joinOnchain()}
            onConfirm={next}
          />
        )}
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col animate-slide-up">
      <div className="flex-1">
        <Badge tone="accent">Smart wallet · {CYCLE_LOCK_LABEL} cycle</Badge>
        <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-tight">
          BTC/USDC grid + BTC stake
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          One winning grid trading agent on BTC/USDC, plus native BTC staking.
          Every cycle locks for {CYCLE_LOCK_LABEL} — swing profits compound in-cycle.
        </p>

        <div className="mt-8 space-y-3">
          {[
            { icon: "⊞", title: "Grid Trader agent", desc: "81% win rate on BTC/USDC swings" },
            { icon: "₿", title: "BTC staking", desc: "Validator yield + BTC exposure" },
            { icon: "⏱", title: CYCLE_LOCK_LABEL, desc: "Minimum commitment per cycle" },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card/40 p-4"
            >
              <span className="text-xl">{item.icon}</span>
              <div>
                <div className="text-sm font-semibold">{item.title}</div>
                <div className="text-xs text-muted">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button fullWidth size="lg" onClick={onNext} className="mt-6">
        Get started
      </Button>
    </div>
  );
}

function FundingStep({
  tier,
  selected,
  onSelect,
  onNext,
}: {
  tier: (typeof COVERAGE_TIERS)[number];
  selected: PaymentMethod;
  onSelect: (m: PaymentMethod) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex h-full flex-col animate-slide-up">
      <div className="flex-1">
        <h2 className="text-[28px] font-semibold leading-tight tracking-tight">
          How you&apos;ll fund
        </h2>
        <p className="mt-2 text-sm text-muted">
          {formatEuro(tier.monthly)}/mo premium into treasury · {getTierJoinStake(tier)} LIFEUR cycle lock on join.
        </p>

        <div className="mt-6 space-y-3">
          <PaymentOption
            id="apple_pay"
            selected={selected}
            onSelect={onSelect}
            title="Apple Pay"
            subtitle="Ships with App Store release"
            badge="Soon"
            icon={<ApplePayIcon />}
          />
          <PaymentOption
            id="google_pay"
            selected={selected}
            onSelect={onSelect}
            title="Google Pay"
            subtitle="Ships with Play Store release"
            badge="Soon"
            icon={<GooglePayIcon />}
          />
          <PaymentOption
            id="crypto"
            selected={selected}
            onSelect={onSelect}
            title="Smart wallet"
            subtitle="Base Smart Wallet · passkey or email · live now"
            badge="Active"
            highlight
            icon={<CryptoIcon />}
          />
        </div>

        {selected !== "crypto" && (
          <p className="mt-4 rounded-2xl border border-border bg-card/40 px-4 py-3 text-[11px] leading-relaxed text-muted">
            Apple Pay & Google Pay onboarding ships with our App Store / Play Store release.
            You can activate today with LIFEUR and we&apos;ll migrate your plan when fiat goes live.
          </p>
        )}
      </div>

      <Button fullWidth size="lg" onClick={onNext} className="mt-6">
        {selected === "crypto" ? "Continue" : "Continue — pay with crypto for now"}
      </Button>
    </div>
  );
}

function PaymentOption({
  id,
  selected,
  onSelect,
  title,
  subtitle,
  badge,
  highlight,
  icon,
}: {
  id: PaymentMethod;
  selected: PaymentMethod;
  onSelect: (m: PaymentMethod) => void;
  title: string;
  subtitle: string;
  badge: string;
  highlight?: boolean;
  icon: ReactNode;
}) {
  const active = selected === id;
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
        active
          ? "border-neon bg-neon/5 shadow-[0_0_24px_rgba(0,229,160,0.12)]"
          : "border-border bg-card/40"
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          highlight ? "bg-neon/15" : "bg-border/80"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
              highlight ? "bg-neon text-void" : "bg-border text-muted"
            }`}
          >
            {badge}
          </span>
        </div>
        <div className="text-xs text-muted">{subtitle}</div>
      </div>
    </button>
  );
}

function ApplePayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-text">
      <path d="M17.05 12.54c-.02-2.1 1.72-3.11 1.8-3.16-1-.14-1.95.58-2.46.58-.52 0-1.32-.55-2.17-.53-1.12.02-2.15.65-2.73 1.65-1.17 2.02-.3 5.01.83 6.65.55.8 1.2 1.7 2.06 1.67.83-.03 1.14-.54 2.14-.54 1 0 1.28.54 2.15.52.89-.01 1.45-.82 1.99-1.62.63-.92.89-1.81.9-1.86-.02-.01-1.74-.67-1.76-2.66zM14.94 4.6c.46-.56.77-1.34.69-2.12-.67.03-1.48.45-1.96 1.01-.43.5-.8 1.3-.7 2.07.74.06 1.5-.38 1.97-.96z" />
    </svg>
  );
}

function GooglePayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 10.2v3.6h5.04c-.2 1.2-1.44 3.52-5.04 3.52-3.04 0-5.52-2.52-5.52-5.64s2.48-5.64 5.52-5.64c1.72 0 2.88.74 3.54 1.38l2.42-2.34C16.88 3.36 14.6 2.4 12 2.4 6.92 2.4 2.76 6.56 2.76 11.68S6.92 20.96 12 20.96c6.12 0 7.6-4.28 7.6-6.48 0-.44-.04-.76-.12-1.08H12z" fill="#4285F4" />
    </svg>
  );
}

function CryptoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-neon">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TierStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: string;
  onSelect: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex h-full flex-col animate-slide-up">
      <div className="flex-1">
        <h2 className="text-[28px] font-semibold leading-tight tracking-tight">
          Choose your plan
        </h2>
        <p className="mt-2 text-sm text-muted">
          Monthly premium funds the BTC grid + stake treasury. Cycle stake locks your tier for {CYCLE_LOCK_LABEL}.
        </p>

        <div className="mt-6 space-y-3">
          {COVERAGE_TIERS.map((tier) => {
            const joinStake = getTierJoinStake(tier);
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => onSelect(tier.id)}
                className={`relative w-full rounded-2xl border p-4 text-left transition-all ${
                  selected === tier.id
                    ? "border-neon bg-neon/5"
                    : "border-border bg-card/40 hover:border-border"
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-neon px-2 py-0.5 text-[10px] font-semibold uppercase text-void">
                    Popular
                  </span>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-semibold">{tier.name}</div>
                    <div className="text-[11px] text-neon/80">{tier.audience}</div>
                    <div className="mt-0.5 text-xs text-muted">{tier.description}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-semibold text-neon">
                      {formatEuro(tier.coverage)}
                    </div>
                    <div className="text-xs text-muted">cover cap</div>
                  </div>
                </div>
                <ul className="mt-3 space-y-1 border-t border-border/60 pt-3">
                  {tier.highlights.map((line) => (
                    <li key={line} className="text-[11px] text-muted">
                      <span className="text-neon">·</span> {line}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-void/80 px-2 py-0.5 text-[10px] text-text">
                    {formatEuro(tier.monthly)}/mo premium
                  </span>
                  <span className="rounded-full bg-void/80 px-2 py-0.5 text-[10px] text-text">
                    {joinStake} LIFEUR lock
                  </span>
                  <span className="rounded-full bg-void/80 px-2 py-0.5 text-[10px] text-text">
                    {formatRewardShare(tier.rewardShareBps)} yield
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Button fullWidth size="lg" onClick={onNext} className="mt-6">
        Continue
      </Button>
    </div>
  );
}

function WalletStep({
  isReady,
  onOpenFaucet,
  onNext,
}: {
  isReady: boolean;
  onOpenFaucet?: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex h-full flex-col animate-slide-up">
      <div className="flex-1">
        <h2 className="text-[28px] font-semibold leading-tight tracking-tight">
          Smart wallet
        </h2>
        <p className="mt-2 text-sm text-muted">
          Create or connect on Base Sepolia. No extension required with Base Smart Wallet.
        </p>

        <div className="mt-6">
          <SmartWalletPanel />
        </div>

        {onOpenFaucet && (
          <Button fullWidth variant="secondary" className="mt-4" onClick={onOpenFaucet}>
            Need testnet LIFEUR? Open faucet
          </Button>
        )}
      </div>

      <Button fullWidth size="lg" onClick={onNext} disabled={!isReady} className="mt-6">
        Continue
      </Button>
    </div>
  );
}

function SkipMintStep({
  balance,
  tier,
  onNext,
}: {
  balance: bigint;
  tier: (typeof COVERAGE_TIERS)[number];
  onNext: () => void;
}) {
  const formatted = formatUnits(balance, 18);
  return (
    <div className="flex h-full flex-col animate-slide-up">
      <div className="flex-1">
        <Badge tone="accent">Faucet funds detected</Badge>
        <h2 className="mt-3 text-[24px] font-semibold tracking-tight">You&apos;re funded</h2>
        <p className="mt-2 text-sm text-muted">
          Your wallet already has {Number(formatted).toFixed(0)} LIFEUR — enough to join {tier.name} ({getTierJoinStake(tier)} LIFEUR stake).
        </p>
      </div>
      <Button fullWidth size="lg" onClick={onNext} className="mt-6">
        Continue to review
      </Button>
    </div>
  );
}

function ReviewStep({
  tier,
  paymentMethod,
  walletAddress,
  onchainJoined,
  joining,
  joinError,
  onJoinOnchain,
  onConfirm,
}: {
  tier: (typeof COVERAGE_TIERS)[number];
  paymentMethod: PaymentMethod;
  walletAddress: string;
  onchainJoined: boolean;
  joining: boolean;
  joinError: Error | null;
  onJoinOnchain: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex h-full flex-col animate-slide-up">
      <div className="flex-1">
        <h2 className="text-[28px] font-semibold leading-tight tracking-tight">
          Review & activate
        </h2>
        <p className="mt-2 text-sm text-muted">
          Join the pool onchain to enforce your {CYCLE_LOCK_LABEL} cycle lock.
        </p>

        <div className="mt-4">
          <ChainGate compact />
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-4">
          <ReviewRow label="Tier" value={tier.name} />
          <ReviewRow label="Cover cap" value={formatEuro(tier.coverage)} />
          <ReviewRow label="Monthly premium" value={`${formatEuro(tier.monthly)} → treasury`} />
          <ReviewRow label="Cycle stake" value={`${getTierJoinStake(tier)} LIFEUR`} />
          <ReviewRow label="Yield weight" value={formatRewardShare(tier.rewardShareBps)} />
          <ReviewRow label="Payment" value={paymentMethod === "crypto" ? "LIFEUR" : paymentMethod} />
          <ReviewRow label="Wallet" value={walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "—"} />
          <ReviewRow label="Cycle lock" value={CYCLE_LOCK_LABEL} good />
          <ReviewRow label="Strategy" value="Grid + BTC stake" />
          <ReviewRow label="Onchain" value={onchainJoined ? "Joined ✓" : "Pending"} good={onchainJoined} />
        </div>

        {paymentMethod === "crypto" && !onchainJoined && walletAddress && (
          <Button fullWidth className="mt-4" onClick={onJoinOnchain} disabled={joining}>
            {joining
              ? "Joining pool onchain…"
              : `Join LifePool onchain (${getTierJoinStake(tier)} LIFEUR)`}
          </Button>
        )}
        {joinError && (
          <p className="mt-3 text-xs text-red-400">
            {(joinError as Error).message?.split("\n")[0]?.slice(0, 140)}
          </p>
        )}
      </div>

      <Button fullWidth size="lg" onClick={onConfirm} className="mt-6">
        {onchainJoined ? "Enter dashboard" : "Enter dashboard · join onchain anytime"}
      </Button>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={good ? "font-medium text-neon" : "font-medium"}>{value}</span>
    </div>
  );
}
