import { useCallback, useEffect, useState } from "react";
import { formatUnits, parseAbi, type PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { CONTRACTS } from "../lib/contracts";
import { activeChain } from "../lib/chains";

export interface TreasuryActivityItem {
  id: string;
  type: "premium" | "dca" | "harvest";
  timestamp: Date;
  txHash: `0x${string}`;
  summary: string;
  from?: string;
}

const EXPLORER = activeChain.blockExplorers?.default.url ?? "https://sepolia.basescan.org";

/** Base Sepolia public RPC limits eth_getLogs to 2000 blocks per request */
const MAX_LOG_BLOCK_RANGE = 2000n;
/** ~11h lookback at 2s blocks — enough for testnet treasury activity */
const LOG_LOOKBACK_BLOCKS = 20_000n;

const treasuryEventAbi = parseAbi([
  "event PremiumDeposited(address indexed from, uint256 amount)",
  "event DcaExecuted(uint256 gridAmount, uint256 stakeAmount, uint256 gridBps)",
  "event Harvested(uint256 amount, address indexed operator)",
]);

async function fetchTreasuryLogs(
  publicClient: PublicClient,
  fromBlock: bigint,
  toBlock: bigint,
) {
  const logs: Awaited<
    ReturnType<
      typeof publicClient.getContractEvents<typeof treasuryEventAbi>
    >
  > = [];
  let start = fromBlock;

  while (start <= toBlock) {
    const end =
      start + MAX_LOG_BLOCK_RANGE - 1n > toBlock
        ? toBlock
        : start + MAX_LOG_BLOCK_RANGE - 1n;

    const chunk = await publicClient.getContractEvents({
      address: CONTRACTS.TreasuryVault,
      abi: treasuryEventAbi,
      fromBlock: start,
      toBlock: end,
    });
    logs.push(...chunk);
    start = end + 1n;
  }

  return logs;
}

export function treasuryTxUrl(hash: string) {
  return `${EXPLORER}/tx/${hash}`;
}

export function treasuryContractUrl() {
  return `${EXPLORER}/address/${CONTRACTS.TreasuryVault}`;
}

export function operatorWalletUrl(address: string) {
  return `${EXPLORER}/address/${address}`;
}

export function useTreasuryActivity() {
  const publicClient = usePublicClient();
  const [items, setItems] = useState<TreasuryActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicClient) return;
    setLoading(true);
    setError(null);
    try {
      const latest = await publicClient.getBlockNumber();
      const fromBlock =
        latest > LOG_LOOKBACK_BLOCKS ? latest - LOG_LOOKBACK_BLOCKS : 0n;

      const logs = await fetchTreasuryLogs(publicClient, fromBlock, latest);

      const blockTimestamps = new Map<bigint, number>();
      const uniqueBlocks = [...new Set(logs.map((log) => log.blockNumber).filter(Boolean))] as bigint[];
      await Promise.all(
        uniqueBlocks.map(async (blockNumber) => {
          const block = await publicClient.getBlock({ blockNumber });
          blockTimestamps.set(blockNumber, Number(block.timestamp) * 1000);
        }),
      );

      const parsed: TreasuryActivityItem[] = [];
      for (const log of logs) {
        if (!log.transactionHash) continue;
        const txHash = log.transactionHash;
        const blockNumber = log.blockNumber ?? 0n;
        const timestamp = new Date(blockTimestamps.get(blockNumber) ?? Date.now());

        if (log.eventName === "PremiumDeposited") {
          const amount = Number(formatUnits(log.args.amount ?? 0n, 6));
          parsed.push({
            id: `${txHash}-premium`,
            type: "premium",
            timestamp,
            txHash,
            from: log.args.from,
            summary: `+$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} tUSDC premium`,
          });
          continue;
        }
        if (log.eventName === "DcaExecuted") {
          const grid = Number(formatUnits(log.args.gridAmount ?? 0n, 6));
          const stake = Number(formatUnits(log.args.stakeAmount ?? 0n, 6));
          const bps = Number(log.args.gridBps ?? 0n);
          parsed.push({
            id: `${txHash}-dca`,
            type: "dca",
            timestamp,
            txHash,
            summary: `DCA $${(grid + stake).toFixed(0)} → ${bps / 100}% grid / ${100 - bps / 100}% stake`,
          });
          continue;
        }
        const amount = Number(formatUnits(log.args.amount ?? 0n, 18));
        parsed.push({
          id: `${txHash}-harvest`,
          type: "harvest",
          timestamp,
          txHash,
          summary: `Harvest ${amount.toFixed(0)} LIFEUR → reward pool`,
        });
      }

      parsed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setItems(parsed.slice(0, 20));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load treasury activity");
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { items, loading, error, refresh };
}
