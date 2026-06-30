/**
 * Keeper: accrue grid-agent reward rate on RewardDistributor.
 */

import { parseAbi } from "viem";
import { computeOpsSignal, createOpsClients, fetchBtcMomentum7d, fetchBtcUsd, waitTx } from "./lib/ops.ts";

async function main() {
  const { deployments, walletClient, publicClient } = createOpsClients();

  const [btcUsd, momentum] = await Promise.all([fetchBtcUsd(), fetchBtcMomentum7d()]);
  const signal = computeOpsSignal(btcUsd, momentum);

  const abi = parseAbi(["function setRewardRateBps(uint256 rateBps) external"]);

  const hash = await walletClient.writeContract({
    address: deployments.contracts.RewardDistributor as `0x${string}`,
    abi,
    functionName: "setRewardRateBps",
    args: [BigInt(signal.rewardRateBps)],
  });
  await waitTx(publicClient, hash);

  console.log(
    `Reward rate: ${signal.rewardRateBps} bps (${(signal.rewardRateBps / 100).toFixed(1)}% proxy) · ${signal.regime} regime`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
