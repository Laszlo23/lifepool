import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createPublicClient, formatUnits, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";
import deployments from "../../deployments/base-sepolia.json";

const treasuryAbi = parseAbi([
  "function treasuryNav() view returns (uint256 premiumBal, uint256 gridBal, uint256 stakeBal)",
  "function gridSleeveBalance() view returns (uint256)",
  "function stakeSleeveBalance() view returns (uint256)",
  "function totalPremiumsReceived() view returns (uint256)",
  "function totalHarvested() view returns (uint256)",
  "function lastDcaAt() view returns (uint256)",
  "function operator() view returns (address)",
  "event PremiumDeposited(address indexed from, uint256 amount)",
  "event DcaExecuted(uint256 gridAmount, uint256 stakeAmount, uint256 gridBps)",
  "event Harvested(uint256 amount, address indexed operator)",
]);

/**
 * On-chain treasury snapshot + recent activity for B3OS dashboards and LifePool Ops.
 * GET /api/ops/treasury
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rpc =
    process.env.BASE_SEPOLIA_RPC_URL ??
    process.env.VITE_BASE_SEPOLIA_RPC_URL ??
    "https://sepolia.base.org";

  const treasury = deployments.contracts.TreasuryVault as `0x${string}`;
  const client = createPublicClient({ chain: baseSepolia, transport: http(rpc) });

  try {
    const [nav, gridSleeve, stakeSleeve, totalPremiums, totalHarvested, lastDcaAt, operator, latest] =
      await Promise.all([
        client.readContract({ address: treasury, abi: treasuryAbi, functionName: "treasuryNav" }),
        client.readContract({ address: treasury, abi: treasuryAbi, functionName: "gridSleeveBalance" }),
        client.readContract({ address: treasury, abi: treasuryAbi, functionName: "stakeSleeveBalance" }),
        client.readContract({ address: treasury, abi: treasuryAbi, functionName: "totalPremiumsReceived" }),
        client.readContract({ address: treasury, abi: treasuryAbi, functionName: "totalHarvested" }),
        client.readContract({ address: treasury, abi: treasuryAbi, functionName: "lastDcaAt" }),
        client.readContract({ address: treasury, abi: treasuryAbi, functionName: "operator" }),
        client.getBlockNumber(),
      ]);

    const fromBlock = latest > 20_000n ? latest - 20_000n : 0n;
    const logs: Awaited<ReturnType<typeof client.getContractEvents>> = [];
    const maxRange = 2000n;
    let start = fromBlock;
    while (start <= latest) {
      const end = start + maxRange - 1n > latest ? latest : start + maxRange - 1n;
      const chunk = await client.getContractEvents({
        address: treasury,
        abi: treasuryAbi,
        fromBlock: start,
        toBlock: end,
      });
      logs.push(...chunk);
      start = end + 1n;
    }

    const activity = logs.slice(-30).reverse().map((log) => {
      const base = {
        txHash: log.transactionHash,
        blockNumber: Number(log.blockNumber),
      };
      if (log.eventName === "PremiumDeposited") {
        return {
          ...base,
          type: "premium",
          from: log.args.from,
          amountUsdc: Number(formatUnits(log.args.amount!, 6)),
        };
      }
      if (log.eventName === "DcaExecuted") {
        return {
          ...base,
          type: "dca",
          gridUsdc: Number(formatUnits(log.args.gridAmount!, 6)),
          stakeUsdc: Number(formatUnits(log.args.stakeAmount!, 6)),
          gridBps: Number(log.args.gridBps!),
        };
      }
      return {
        ...base,
        type: "harvest",
        amountLifeEur: Number(formatUnits(log.args.amount!, 18)),
        operator: log.args.operator,
      };
    });

    res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
    return res.status(200).json({
      chainId: deployments.chainId,
      treasuryVault: treasury,
      operator,
      nav: {
        premiumUsdc: Number(formatUnits(nav[0], 6)),
        gridBtc: Number(formatUnits(nav[1], 8)),
        stakeBtc: Number(formatUnits(nav[2], 8)),
      },
      sleeves: {
        gridUsdc: Number(formatUnits(gridSleeve, 6)),
        stakeUsdc: Number(formatUnits(stakeSleeve, 6)),
      },
      totals: {
        premiumsUsdc: Number(formatUnits(totalPremiums, 6)),
        harvestedLifeEur: Number(formatUnits(totalHarvested, 18)),
      },
      lastDcaAt: lastDcaAt > 0n ? new Date(Number(lastDcaAt) * 1000).toISOString() : null,
      activity,
      basescan: {
        treasury: `https://sepolia.basescan.org/address/${treasury}`,
        operator: `https://sepolia.basescan.org/address/${operator}`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Treasury fetch failed";
    return res.status(500).json({ error: message });
  }
}
