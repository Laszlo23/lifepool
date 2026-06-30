export function TestnetBanner() {
  return (
    <div
      role="status"
      className="border-b border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 px-4 py-2 text-center text-[11px] leading-snug text-amber-100/90"
    >
      <span className="font-semibold text-amber-50">Testnet proof of concept</span>
      {" · "}
      Base Sepolia only · Not regulated insurance · Yields are simulated · No real funds
    </div>
  );
}
