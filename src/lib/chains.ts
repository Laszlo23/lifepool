import type { Chain } from "viem";
import { http } from "wagmi";
import { baseSepolia } from "viem/chains";
import deployments from "../../deployments/base-sepolia.json";

const anvilLocal: Chain = {
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
};

const envChainId = Number(import.meta.env.VITE_CHAIN_ID || deployments.chainId);

export const supportedChains: [Chain, ...Chain[]] =
  envChainId === 84532 ? [baseSepolia] : [anvilLocal, baseSepolia];

export const activeChain =
  supportedChains.find((c) => c.id === envChainId) ?? supportedChains[0];

export const rpcUrl =
  import.meta.env.VITE_BASE_SEPOLIA_RPC_URL ||
  activeChain.rpcUrls.default.http[0]!;

export const wagmiTransports = {
  [activeChain.id]: http(rpcUrl),
};
