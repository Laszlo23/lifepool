import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-neon text-void hover:brightness-110 active:scale-[0.98]",
    secondary:
      "bg-card border border-border text-text hover:border-neon/40",
    ghost: "text-muted hover:text-text",
  };

  const sizes = {
    sm: "text-sm px-4 py-2 rounded-xl",
    md: "text-[15px] px-6 py-3.5 rounded-2xl",
    lg: "text-base px-8 py-4 rounded-2xl",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
