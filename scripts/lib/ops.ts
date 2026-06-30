import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Deployments {
  chainId: number;
  network: string;
  contracts: Record<string, string>;
}

export function loadDeployments(): Deployments {
  return JSON.parse(
    readFileSync(join(__dirname, "../../deployments/base-sepolia.json"), "utf8"),
  ) as Deployments;
}

export function getRpcUrl(): string {
  return (
    process.env.BASE_SEPOLIA_RPC_URL ??
    process.env.VITE_BASE_SEPOLIA_RPC_URL ??
    "https://sepolia.base.org"
  );
}

export function resolveChain(deployments: Deployments): Chain {
  if (deployments.chainId === 84532) return baseSepolia;
  return {
    id: deployments.chainId,
    name: "local",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [getRpcUrl()] } },
  } as Chain;
}

export function getKeeperAccount() {
  const pk = process.env.KEEPER_PRIVATE_KEY;
  if (!pk) throw new Error("KEEPER_PRIVATE_KEY required");
  return privateKeyToAccount(pk as `0x${string}`);
}

export function createOpsClients() {
  const deployments = loadDeployments();
  const chain = resolveChain(deployments);
  const rpc = getRpcUrl();
  const account = getKeeperAccount();

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpc),
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(rpc),
  });

  return { deployments, chain, account, walletClient, publicClient };
}

export async function waitTx(
  publicClient: ReturnType<typeof createPublicClient>,
  hash: `0x${string}`,
) {
  return publicClient.waitForTransactionReceipt({ hash });
}

export {
  computeOpsSignal,
  fetchBtcMomentum7d,
  fetchBtcUsd,
  type OpsSignal,
} from "../../src/lib/ops-signal.ts";

export async function fetchXrpUsd(): Promise<number> {
  const res = await fetch(
    "https://api.binance.com/api/v3/ticker/price?symbol=XRPUSDT",
  );
  if (!res.ok) throw new Error(`Binance XRPUSDT: ${res.status}`);
  const data = (await res.json()) as { price: string };
  return Number(data.price);
}
