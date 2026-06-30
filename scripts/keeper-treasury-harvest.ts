/**
 * Keeper: harvest treasury LIFEUR profits into RewardDistributor.
 */

import { parseAbi, parseUnits } from "viem";
import {
  computeOpsSignal,
  createOpsClients,
  fetchBtcMomentum7d,
  fetchBtcUsd,
  waitTx,
} from "./lib/ops.ts";

const treasuryAbi = parseAbi([
  "function harvestToRewards(uint256 amount) external",
  "function lifeEur() view returns (address)",
]);

const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
]);

async function main() {
  const { deployments, walletClient, publicClient } = createOpsClients();
  const treasury = deployments.contracts.TreasuryVault as `0x${string}` | undefined;
  if (!treasury) throw new Error("TreasuryVault not in deployments — run contracts:deploy");

  const [btcUsd, momentum] = await Promise.all([fetchBtcUsd(), fetchBtcMomentum7d()]);
  const signal = computeOpsSignal(btcUsd, momentum);

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
  if (balance < harvestWei) {
    console.log(
      `Treasury harvest skipped: ${Number(balance) / 1e18} LIFEUR < ${signal.suggestedHarvestLifeEur} suggested`,
    );
    return;
  }

  const hash = await walletClient.writeContract({
    address: treasury,
    abi: treasuryAbi,
    functionName: "harvestToRewards",
    args: [harvestWei],
  });
  await waitTx(publicClient, hash);

  console.log(`Treasury harvest: ${signal.suggestedHarvestLifeEur} LIFEUR → RewardDistributor`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
