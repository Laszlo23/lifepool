/** Browser env — Vite inlines VITE_* at build time. */
export function readEnv(key: string): string | undefined {
  const viteKey = key.startsWith("VITE_") ? key : `VITE_${key}`;
  const meta = import.meta.env as Record<string, string | undefined>;
  return meta[key] ?? meta[viteKey];
}
