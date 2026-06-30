import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import type { Connector } from "wagmi";
import { activeChain } from "../lib/chains";
import {
  WALLET_CONNECTORS,
  type WalletConnectorId,
} from "../lib/wagmi";

const baseSepoliaParams = {
  chainId: `0x${activeChain.id.toString(16)}`,
  chainName: activeChain.name,
  nativeCurrency: activeChain.nativeCurrency,
  rpcUrls: [activeChain.rpcUrls.default.http[0]!],
  blockExplorerUrls: activeChain.blockExplorers
    ? [activeChain.blockExplorers.default.url]
    : undefined,
};

function pickConnector(
  connectors: readonly Connector[],
  id: WalletConnectorId,
): Connector | undefined {
  return connectors.find((c) => c.id === id);
}

export function useWallet() {
  const { address, isConnected, chainId, status, connector } = useAccount();
  const { connectAsync, connectors, isPending: connecting, error: connectError } =
    useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: switching } = useSwitchChain();

  const isWrongChain = isConnected && chainId !== activeChain.id;
  const isReady = isConnected && !isWrongChain;

  const activeConnectorId = connector?.id as WalletConnectorId | undefined;

  async function connectWith(
    connectorId: WalletConnectorId = WALLET_CONNECTORS.baseSmart,
  ) {
    const target =
      pickConnector(connectors, connectorId) ??
      connectors.find((c) => c.ready) ??
      connectors[0];
    if (!target) {
      throw new Error("No wallet available — try Base Smart Wallet or MetaMask");
    }

    const isSmart =
      connectorId === WALLET_CONNECTORS.baseSmart ||
      connectorId === WALLET_CONNECTORS.coinbaseSmart;

    await connectAsync({
      connector: target,
      chainId: activeChain.id,
      ...(isSmart ? { instantOnboarding: true as const } : {}),
    });
  }

  async function connectWallet() {
    await connectWith(WALLET_CONNECTORS.baseSmart);
  }

  async function addNetwork() {
    const eth = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } })
      .ethereum;
    if (!eth) throw new Error("No wallet found");
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [baseSepoliaParams],
    });
  }

  async function switchNetwork() {
    try {
      await switchChainAsync({ chainId: activeChain.id });
    } catch (err) {
      const message = (err as Error).message?.toLowerCase() ?? "";
      if (message.includes("4902") || message.includes("unrecognized chain")) {
        await addNetwork();
        await switchChainAsync({ chainId: activeChain.id });
        return;
      }
      throw err;
    }
  }

  async function ensureNetwork() {
    if (!isConnected) {
      await connectWallet();
      return;
    }
    if (isWrongChain) {
      await switchNetwork();
    }
  }

  function shortAddress(addr?: string) {
    if (!addr) return "";
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

  return {
    address,
    isConnected,
    isReady,
    isWrongChain,
    chainId,
    status,
    connector,
    activeConnectorId,
    connectWallet,
    connectWith,
    switchNetwork,
    ensureNetwork,
    connecting: connecting || switching,
    connectError,
    disconnect,
    connectors,
    activeChain,
    shortAddress,
  };
}
