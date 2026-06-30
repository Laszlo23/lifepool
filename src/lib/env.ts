/** Read env in Vite (import.meta.env) or Node scripts (process.env). */
export function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env[key]) {
    return process.env[key];
  }
  const viteKey = key.startsWith("VITE_") ? key : `VITE_${key}`;
  const meta = import.meta.env as Record<string, string | undefined>;
  return meta[key] ?? meta[viteKey];
}
