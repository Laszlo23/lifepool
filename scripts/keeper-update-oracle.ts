/**
 * Keeper: update MockOracle prices on Base Sepolia from Binance + EUR rate.
 */

import { parseAbi } from "viem";
import { createOpsClients, fetchBtcUsd, fetchXrpUsd, waitTx } from "./lib/ops.ts";

const EUR_USD = Number(process.env.EUR_USD_RATE ?? "0.92");

async function main() {
  const { deployments, walletClient, publicClient } = createOpsClients();

  const btcUsd = await fetchBtcUsd();
  const xrpUsd = await fetchXrpUsd();
  const btcEur = Math.round(btcUsd * EUR_USD * 1e8);
  const xrpEur = Math.round(xrpUsd * EUR_USD * 1e8);

  const oracleAbi = parseAbi([
    "function setPrice(address asset, uint256 priceEur) external",
  ]);
  const oracle = deployments.contracts.MockOracle as `0x${string}`;

  const btcHash = await walletClient.writeContract({
    address: oracle,
    abi: oracleAbi,
    functionName: "setPrice",
    args: [deployments.contracts.tWBTC as `0x${string}`, BigInt(btcEur)],
  });
  await waitTx(publicClient, btcHash);

  const xrpHash = await walletClient.writeContract({
    address: oracle,
    abi: oracleAbi,
    functionName: "setPrice",
    args: [deployments.contracts.tXRP as `0x${string}`, BigInt(xrpEur)],
  });
  await waitTx(publicClient, xrpHash);

  console.log(`Oracle updated: BTC €${(btcEur / 1e8).toFixed(0)}, XRP €${(xrpEur / 1e8).toFixed(2)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
