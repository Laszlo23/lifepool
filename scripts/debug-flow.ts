/**
 * LifePool end-to-end debug flow.
 * Run: npm run debug
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";
import { getLiveGridStrategy } from "../src/strategy/grid-bot.ts";
import { getLiveOpsSignal } from "../src/lib/ops-signal.ts";
import { getWalletRoles } from "../src/data/wallets.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadDotEnv() {
  const path = join(root, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

type Status = "pass" | "fail" | "warn";

interface Check {
  name: string;
  status: Status;
  detail: string;
}

const checks: Check[] = [];

function pass(name: string, detail: string) {
  checks.push({ name, status: "pass", detail });
  console.log(`  ✓ ${name}: ${detail}`);
}

function fail(name: string, detail: string) {
  checks.push({ name, status: "fail", detail });
  console.log(`  ✗ ${name}: ${detail}`);
}

function warn(name: string, detail: string) {
  checks.push({ name, status: "warn", detail });
  console.log(`  ⚠ ${name}: ${detail}`);
}

function section(title: string) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 50 - title.length))}`);
}

async function main() {
  console.log("LifePool debug flow\n");

  section("Config");
  const deployments = JSON.parse(
    readFileSync(join(root, "deployments/base-sepolia.json"), "utf8"),
  ) as { chainId: number; contracts: Record<string, string> };

  const chainId = Number(process.env.VITE_CHAIN_ID || deployments.chainId);
  if (chainId === 84532) pass("Chain", `Base Sepolia (${chainId})`);
  else warn("Chain", `Unexpected VITE_CHAIN_ID=${chainId}`);

  const rpc =
    process.env.BASE_SEPOLIA_RPC_URL ??
    process.env.VITE_BASE_SEPOLIA_RPC_URL ??
    "https://sepolia.base.org";

  const keeperPk = process.env.KEEPER_PRIVATE_KEY ?? process.env.B3OS_TREASURY_PRIVATE_KEY;
  if (keeperPk) pass("Keeper key", "present in env");
  else warn("Keeper key", "KEEPER_PRIVATE_KEY not set — keepers will fail");

  section("Market data");
  try {
    const signal = await getLiveOpsSignal();
    pass("Binance BTC", `$${signal.btcUsd.toLocaleString()}`);
    pass("Ops signal", `${signal.regime} · grid ${signal.gridAllocationBps / 100}% · DCA $${signal.suggestedDcaUsdc}`);
  } catch (e) {
    fail("Market data", e instanceof Error ? e.message : String(e));
  }

  section("Grid strategy");
  try {
    const grid = await getLiveGridStrategy(process.env.B3OS_OPERATOR_ADDRESS);
    pass("Grid levels", `${grid.gridLevels.length} levels · ${grid.spacingPct.toFixed(2)}% spacing`);
    pass("Win rate proxy", `${(grid.winRateProxy * 100).toFixed(0)}%`);
    pass("Copy-trade master", `${grid.copyTrade.masterWallet.slice(0, 10)}…`);
    pass("Operator actions", grid.actions.map((a) => a.id).join(", "));
  } catch (e) {
    fail("Grid strategy", e instanceof Error ? e.message : String(e));
  }

  section("Wallet roles");
  const wallets = getWalletRoles(process.env.B3OS_OPERATOR_ADDRESS);
  for (const w of wallets) {
    if (w.address) pass(w.label, w.address);
    else pass(w.label, "dynamic (member MetaMask)");
  }

  section("On-chain (Base Sepolia)");
  const client = createPublicClient({ chain: baseSepolia, transport: http(rpc) });

  const treasury = deployments.contracts.TreasuryVault as `0x${string}`;
  const faucet = deployments.contracts.LifePoolFaucet as `0x${string}`;
  const lifeEur = deployments.contracts.LifeEUR as `0x${string}`;
  const tUsdc = deployments.contracts.tUSDC as `0x${string}`;
  const tWbtc = deployments.contracts.tWBTC as `0x${string}`;
  const operator = (process.env.B3OS_OPERATOR_ADDRESS ??
    "0xaaf620ee9e2a805323BF7363992E33e4412be3FB") as `0x${string}`;

  const treasuryAbi = parseAbi([
    "function operator() view returns (address)",
    "function treasuryNav() view returns (uint256,uint256,uint256)",
    "function totalPremiumsReceived() view returns (uint256)",
    "function totalHarvested() view returns (uint256)",
    "function gridSleeveBalance() view returns (uint256)",
    "function lastDcaAt() view returns (uint256)",
  ]);
  const erc20Abi = parseAbi(["function balanceOf(address) view returns (uint256)", "function owner() view returns (address)"]);
  const lifeEurAbi = parseAbi(["function minters(address) view returns (bool)"]);
  const faucetAbi = parseAbi(["function canClaim(address) view returns (bool)"]);

  try {
    const block = await client.getBlockNumber();
    pass("RPC", `connected · block ${block}`);

    const [nav, premiums, harvested, gridSleeve, lastDca, onchainOperator] = await Promise.all([
      client.readContract({ address: treasury, abi: treasuryAbi, functionName: "treasuryNav" }),
      client.readContract({ address: treasury, abi: treasuryAbi, functionName: "totalPremiumsReceived" }),
      client.readContract({ address: treasury, abi: treasuryAbi, functionName: "totalHarvested" }),
      client.readContract({ address: treasury, abi: treasuryAbi, functionName: "gridSleeveBalance" }),
      client.readContract({ address: treasury, abi: treasuryAbi, functionName: "lastDcaAt" }),
      client.readContract({ address: treasury, abi: treasuryAbi, functionName: "operator" }),
    ]);

    const premiumUsdc = Number(nav[0]) / 1e6;
    const gridBtc = Number(nav[1]) / 1e8;
    pass("Treasury NAV", `$${premiumUsdc.toLocaleString()} USDC · ${gridBtc.toFixed(2)} tWBTC`);
    pass("Premiums received", `$${(Number(premiums) / 1e6).toLocaleString()}`);
    pass("Harvested", `${(Number(harvested) / 1e18).toFixed(0)} LIFEUR`);
    pass("Grid sleeve", `$${(Number(gridSleeve) / 1e6).toLocaleString()}`);
    pass(
      "Last DCA",
      lastDca > 0n ? new Date(Number(lastDca) * 1000).toISOString() : "never",
    );

    if (onchainOperator.toLowerCase() === operator.toLowerCase()) {
      pass("Treasury operator", `${operator.slice(0, 10)}… matches B3OS`);
    } else {
      warn("Treasury operator", `on-chain ${onchainOperator} ≠ env ${operator}`);
    }

    const [faucetMinter, tUsdcOwner, operatorEth] = await Promise.all([
      client.readContract({ address: lifeEur, abi: lifeEurAbi, functionName: "minters", args: [faucet] }),
      client.readContract({ address: tUsdc, abi: erc20Abi, functionName: "owner" }),
      client.getBalance({ address: operator }),
    ]);

    if (faucetMinter) pass("Faucet LIFEUR minter", "yes");
    else fail("Faucet LIFEUR minter", "faucet cannot mint LIFEUR");

    if (tUsdcOwner.toLowerCase() === faucet.toLowerCase()) pass("tUSDC owner", "faucet");
    else fail("tUSDC owner", `expected faucet, got ${tUsdcOwner}`);

    const testAddr = "0x0000000000000000000000000000000000000001" as `0x${string}`;
    const canClaim = await client.readContract({
      address: faucet,
      abi: faucetAbi,
      functionName: "canClaim",
      args: [testAddr],
    });
    if (canClaim) pass("Faucet canClaim", "works for new addresses");

    const eth = Number(operatorEth) / 1e18;
    if (eth > 0.0001) pass("Operator ETH", `${eth.toFixed(4)} ETH`);
    else fail("Operator ETH", `${eth} ETH — fund B3OS wallet for keepers`);

    const treasuryLifeEur = await client.readContract({
      address: lifeEur,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [treasury],
    });
    pass("Treasury LIFEUR", `${(Number(treasuryLifeEur) / 1e18).toFixed(0)} LIFEUR`);

    const tWbtcOwner = await client.readContract({
      address: tWbtc,
      abi: erc20Abi,
      functionName: "owner",
    });
    if (tWbtcOwner.toLowerCase() === faucet.toLowerCase()) pass("tWBTC owner", "faucet");
    else warn("tWBTC owner", tWbtcOwner);
  } catch (e) {
    fail("On-chain reads", e instanceof Error ? e.message : String(e));
  }

  section("Deployments file");
  const required = [
    "LifeEUR",
    "TreasuryVault",
    "LifePoolVault",
    "LifePoolFaucet",
    "RewardDistributor",
    "CollateralVault",
    "tUSDC",
    "tWBTC",
    "tXRP",
    "MockOracle",
  ];
  for (const key of required) {
    if (deployments.contracts[key]) pass(key, deployments.contracts[key]!);
    else fail(key, "missing from base-sepolia.json");
  }

  section("Summary");
  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const warned = checks.filter((c) => c.status === "warn").length;

  console.log(`\n  ${passed} passed · ${warned} warnings · ${failed} failed\n`);

  if (failed > 0) {
    console.log("Failed checks:");
    for (const c of checks.filter((x) => x.status === "fail")) {
      console.log(`  • ${c.name}: ${c.detail}`);
    }
    process.exit(1);
  }

  console.log("All critical checks passed. Manual UI flow:");
  console.log("  1. npm run dev → Faucet → claim → onboarding → join");
  console.log("  2. Ops tab → deposit tUSDC → verify activity feed");
  console.log("  3. Yield tab → grid copy-trade panel");
  console.log("  4. npm run keeper:all → B3OS operator txs");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
