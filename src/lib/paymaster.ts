import { encodeFunctionData, type Abi, type Call, type Hex } from "viem";

/** True when the frontend was built with paymaster support enabled. */
export function isPaymasterEnabled(): boolean {
  return import.meta.env.VITE_PAYMASTER_ENABLED === "true";
}

/**
 * Paymaster proxy URL exposed to smart wallets.
 * Prefer same-origin `/api/paymaster`; override with VITE_PAYMASTER_PROXY_URL for static hosts.
 */
export function getPaymasterProxyUrl(): string | null {
  if (!isPaymasterEnabled()) return null;

  const explicit = import.meta.env.VITE_PAYMASTER_PROXY_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/paymaster`;
  }

  return null;
}

export function contractCall(
  to: Hex,
  abi: Abi,
  functionName: string,
  args: readonly unknown[],
): Call {
  return {
    to,
    data: encodeFunctionData({ abi, functionName, args }),
  };
}
