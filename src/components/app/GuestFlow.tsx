import { LandingHero } from "../landing/LandingHero";
import { OnboardingFlow } from "../onboarding/OnboardingFlow";
import { FaucetScreen } from "../faucet/FaucetScreen";
import { GuestCalculator } from "../guest/GuestCalculator";
import { AchievementToast } from "../gamification/PlayerProgress";
import { usePool } from "../../context/PoolContext";

export function GuestFlow() {
  const {
    guestScreen,
    startOnboarding,
    startCalculator,
    startFaucet,
    backToLanding,
    completeOnboarding,
  } = usePool();

  if (guestScreen === "calculator") {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-void">
        <GuestCalculator onBack={backToLanding} onGetStarted={startOnboarding} />
      </div>
    );
  }

  if (guestScreen === "faucet") {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-void">
        <FaucetScreen onBack={backToLanding} />
      </div>
    );
  }

  if (guestScreen === "onboarding") {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-void">
        <OnboardingFlow
          onComplete={(payload) => completeOnboarding(payload)}
          onBack={backToLanding}
          onOpenFaucet={startFaucet}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-void">
      <AchievementToast />
      <LandingHero
        onGetStarted={startOnboarding}
        onOpenFaucet={startFaucet}
        onOpenCalculator={startCalculator}
      />
    </div>
  );
}
