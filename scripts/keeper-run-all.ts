/**
 * Run all LifePool keeper jobs:
 * oracle prices → reward rate → grid DCA + profit harvest.
 */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotEnv } from "./lib/load-env.ts";

loadDotEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const jobs = [
  { script: "keeper-update-oracle.ts", label: "Oracle prices" },
  { script: "keeper-accrue-rewards.ts", label: "Reward rate" },
  { script: "keeper-grid-copytrade.ts", label: "Grid DCA + harvest" },
] as const;

function run(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", join(root, "scripts", script)], {
      stdio: "inherit",
      env: process.env,
      cwd: root,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with ${code}`));
    });
  });
}

async function main() {
  if (!process.env.KEEPER_PRIVATE_KEY) {
    console.error("KEEPER_PRIVATE_KEY is required (set in .env or GitHub Actions secrets)");
    process.exit(1);
  }

  console.log("=== LifePool keeper run-all ===");
  console.log(`RPC: ${process.env.BASE_SEPOLIA_RPC_URL ?? process.env.VITE_BASE_SEPOLIA_RPC_URL ?? "default"}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  const results: { label: string; ok: boolean; error?: string }[] = [];

  for (const job of jobs) {
    console.log(`\n→ ${job.label} (${job.script})`);
    try {
      await run(job.script);
      results.push({ label: job.label, ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`✗ ${job.label} failed: ${message}`);
      results.push({ label: job.label, ok: false, error: message });
    }
  }

  console.log("\n=== Keeper summary ===");
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.label}${r.error ? ` — ${r.error}` : ""}`);
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length === results.length) process.exit(1);
  if (failed.length > 0) process.exit(2);
  console.log("\nAll keepers complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
