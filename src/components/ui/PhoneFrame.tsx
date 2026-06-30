import type { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
  label?: string;
}

export function PhoneFrame({ children, label }: PhoneFrameProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      {label && (
        <span className="text-xs font-medium uppercase tracking-widest text-muted">
          {label}
        </span>
      )}
      <div className="relative w-[390px] max-w-full">
        <div className="rounded-[44px] border border-border bg-surface p-3 shadow-[0_0_60px_rgba(0,229,160,0.06)]">
          <div className="absolute left-1/2 top-5 z-10 h-[28px] w-[100px] -translate-x-1/2 rounded-full bg-void" />
          <div className="overflow-hidden rounded-[36px] bg-void">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
