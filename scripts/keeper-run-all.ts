/**
 * Run all LifePool keeper jobs (oracle, rewards, treasury DCA, treasury harvest).
 */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const jobs = [
  "keeper-update-oracle.ts",
  "keeper-accrue-rewards.ts",
  "keeper-grid-copytrade.ts",
];

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
  console.log("=== LifePool keeper run-all ===");
  for (const job of jobs) {
    console.log(`\n→ ${job}`);
    await run(job);
  }
  console.log("\n=== All keepers complete ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
