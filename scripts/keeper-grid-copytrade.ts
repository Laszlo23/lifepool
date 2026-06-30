/**
 * Keeper: grid rebalance + copy-trade mirror cycle.
 * Runs DCA at signal allocation, updates grid bps, optional harvest.
 */

import { parseAbi, parseUnits } from "viem";
import {
  computeOpsSignal,
  createOpsClients,
  fetchBtcMomentum7d,
  fetchBtcUsd,
  waitTx,
} from "./lib/ops.ts";
import { getLiveGridStrategySync } from "../src/strategy/grid-bot.ts";

const treasuryAbi = parseAbi([
  "function executeDca(uint256 amount, uint256 gridBps) external",
  "function setGridAllocationBps(uint256 gridBps) external",
  "function harvestToRewards(uint256 amount) external",
  "function lifeEur() view returns (address)",
  "function treasuryNav() view returns (uint256 premiumBal, uint256 gridBal, uint256 stakeBal)",
]);

const erc20Abi = parseAbi(["function balanceOf(address account) view returns (uint256)"]);

async function main() {
  const { deployments, walletClient, publicClient, account } = createOpsClients();
  const treasury = deployments.contracts.TreasuryVault as `0x${string}` | undefined;
  if (!treasury) throw new Error("TreasuryVault not in deployments");

  const [btcUsd, momentum] = await Promise.all([fetchBtcUsd(), fetchBtcMomentum7d()]);
  const signal = computeOpsSignal(btcUsd, momentum);
  const gridStrategy = getLiveGridStrategySync(btcUsd, momentum, account.address);

  console.log(`Grid strategy · ${gridStrategy.regime} · win rate ${(gridStrategy.winRateProxy * 100).toFixed(0)}%`);
  console.log(`Copy-trade master: ${gridStrategy.copyTrade.masterWallet}`);
  console.log(`Actions: ${gridStrategy.actions.map((a) => a.label).join(" → ")}`);

  const nav = await publicClient.readContract({
    address: treasury,
    abi: treasuryAbi,
    functionName: "treasuryNav",
  });
  const premiumBal = nav[0];
  const dcaAmount = parseUnits(String(signal.suggestedDcaUsdc), 6);

  if (premiumBal >= dcaAmount) {
    const setHash = await walletClient.writeContract({
      address: treasury,
      abi: treasuryAbi,
      functionName: "setGridAllocationBps",
      args: [BigInt(signal.gridAllocationBps)],
    });
    await waitTx(publicClient, setHash);

    const dcaHash = await walletClient.writeContract({
      address: treasury,
      abi: treasuryAbi,
      functionName: "executeDca",
      args: [dcaAmount, BigInt(signal.gridAllocationBps)],
    });
    await waitTx(publicClient, dcaHash);
    console.log(`Grid DCA executed: $${signal.suggestedDcaUsdc} @ ${signal.gridAllocationBps / 100}% grid`);
  } else {
    console.log(`Grid DCA skipped: premium ${Number(premiumBal) / 1e6} USDC`);
  }

  const lifeEur = await publicClient.readContract({
    address: treasury,
    abi: treasuryAbi,
    functionName: "lifeEur",
  });
  const balance = await publicClient.readContract({
    address: lifeEur,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [treasury],
  });
  const harvestWei = parseUnits(String(signal.suggestedHarvestLifeEur), 18);

  if (balance >= harvestWei) {
    const harvestHash = await walletClient.writeContract({
      address: treasury,
      abi: treasuryAbi,
      functionName: "harvestToRewards",
      args: [harvestWei],
    });
    await waitTx(publicClient, harvestHash);
    console.log(`Copy-trade harvest: ${signal.suggestedHarvestLifeEur} LIFEUR → followers`);
  }

  console.log(`Grid levels: ${gridStrategy.gridLevels.length} · spacing ${gridStrategy.spacingPct.toFixed(2)}%`);
  console.log("Copy-trade mirror complete — members accrue via RewardDistributor");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
