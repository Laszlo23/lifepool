/** Read env in Vite (import.meta.env) or Node scripts (process.env). */
type NodeProcess = { env?: Record<string, string | undefined> };

function nodeEnv(): Record<string, string | undefined> | undefined {
  const proc = (globalThis as { process?: NodeProcess }).process;
  return proc?.env;
}

export function readEnv(key: string): string | undefined {
  const fromNode = nodeEnv()?.[key];
  if (fromNode) return fromNode;

  const viteKey = key.startsWith("VITE_") ? key : `VITE_${key}`;
  const meta = import.meta.env as Record<string, string | undefined>;
  return meta[key] ?? meta[viteKey];
}
