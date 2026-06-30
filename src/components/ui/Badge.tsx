import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: "neon" | "accent" | "muted";
}

export function Badge({ children, tone = "neon" }: BadgeProps) {
  const tones = {
    neon: "bg-neon-dim text-neon border-neon/20",
    accent: "bg-accent/15 text-accent border-accent/20",
    muted: "bg-card text-muted border-border",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
