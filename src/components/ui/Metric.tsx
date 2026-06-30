interface MetricProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Metric({ label, value, sub, highlight, size = "md" }: MetricProps) {
  const valueSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <span
        className={`font-semibold tracking-tight ${valueSizes[size]} ${highlight ? "text-neon" : "text-text"}`}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}
