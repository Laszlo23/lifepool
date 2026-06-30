import { usePool } from "../../context/PoolContext";
import { Button } from "../ui/Button";

/** Sticky CTA above footer nav — browse the app without a wallet. */
export function GuestWalletBar() {
  const { phase, guestScreen, startOnboarding, startFaucet } = usePool();

  if (phase !== "guest" || guestScreen === "onboarding") return null;

  return (
    <div className="border-t border-neon/20 bg-void/95 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[430px] items-center gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={startOnboarding}
        >
          Connect smart wallet
        </Button>
        <Button size="sm" variant="secondary" className="shrink-0" onClick={startFaucet}>
          Faucet
        </Button>
      </div>
      <p className="mx-auto mt-1.5 max-w-[430px] text-center text-[10px] text-muted">
        Browse all tabs · testnet demo · no wallet required to explore
      </p>
    </div>
  );
}
