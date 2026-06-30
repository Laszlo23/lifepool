/**
 * Keeper: treasury monthly DCA — split USDC float into grid/stake sleeves.
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
  "function executeDca(uint256 amount, uint256 gridBps) external",
  "function setGridAllocationBps(uint256 gridBps) external",
  "function premiumAsset() view returns (address)",
  "function treasuryNav() view returns (uint256 premiumBal, uint256 gridBal, uint256 stakeBal)",
]);

async function main() {
  const { deployments, walletClient, publicClient } = createOpsClients();
  const treasury = deployments.contracts.TreasuryVault as `0x${string}` | undefined;
  if (!treasury) throw new Error("TreasuryVault not in deployments — run contracts:deploy");

  const [btcUsd, momentum, nav] = await Promise.all([
    fetchBtcUsd(),
    fetchBtcMomentum7d(),
    publicClient.readContract({
      address: treasury,
      abi: treasuryAbi,
      functionName: "treasuryNav",
    }),
  ]);

  const signal = computeOpsSignal(btcUsd, momentum);
  const premiumBal = nav[0];
  const dcaAmount = parseUnits(String(signal.suggestedDcaUsdc), 6);

  if (premiumBal < dcaAmount) {
    console.log(
      `Treasury DCA skipped: premium balance ${Number(premiumBal) / 1e6} USDC < ${signal.suggestedDcaUsdc} suggested`,
    );
    return;
  }

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

  console.log(
    `Treasury DCA: $${signal.suggestedDcaUsdc} · grid ${signal.gridAllocationBps / 100}% · ${signal.regime} · ${signal.dcaMultiplier}x`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
