/**
 * Keeper: accrue grid-agent reward rate on RewardDistributor.
 */

import { parseAbi } from "viem";
import { computeOpsSignal, createOpsClients, fetchBtcMomentum7d, fetchBtcUsd } from "./lib/ops.ts";

async function main() {
  const { deployments, walletClient } = createOpsClients();

  const [btcUsd, momentum] = await Promise.all([fetchBtcUsd(), fetchBtcMomentum7d()]);
  const signal = computeOpsSignal(btcUsd, momentum);

  const abi = parseAbi(["function setRewardRateBps(uint256 rateBps) external"]);

  await walletClient.writeContract({
    address: deployments.contracts.RewardDistributor as `0x${string}`,
    abi,
    functionName: "setRewardRateBps",
    args: [BigInt(signal.rewardRateBps)],
  });

  console.log(
    `Reward rate: ${signal.rewardRateBps} bps (${(signal.rewardRateBps / 100).toFixed(1)}% proxy) · ${signal.regime} regime`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
