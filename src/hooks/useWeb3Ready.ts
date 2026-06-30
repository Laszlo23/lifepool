import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { activeChain } from "../lib/chains";

const baseSepoliaParams = {
  chainId: `0x${activeChain.id.toString(16)}`,
  chainName: activeChain.name,
  nativeCurrency: activeChain.nativeCurrency,
  rpcUrls: [activeChain.rpcUrls.default.http[0]!],
  blockExplorerUrls: activeChain.blockExplorers
    ? [activeChain.blockExplorers.default.url]
    : undefined,
};

export function useWallet() {
  const { address, isConnected, chainId, status } = useAccount();
  const { connectAsync, connectors, isPending: connecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: switching } = useSwitchChain();

  const isWrongChain = isConnected && chainId !== activeChain.id;
  const isReady = isConnected && !isWrongChain;

  async function connectWallet() {
    const connector =
      connectors.find((c) => c.ready) ??
      connectors.find((c) => c.id === "injected") ??
      connectors[0];
    if (!connector) throw new Error("No wallet found — install MetaMask or Coinbase Wallet");

    await connectAsync({ connector, chainId: activeChain.id });
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

  /** Connect wallet and switch to Base Sepolia if needed. */
  async function ensureNetwork() {
    if (!isConnected) {
      await connectWallet();
      return;
    }
    if (isWrongChain) {
      await switchNetwork();
    }
  }

  return {
    address,
    isConnected,
    isReady,
    isWrongChain,
    chainId,
    status,
    connectWallet,
    switchNetwork,
    ensureNetwork,
    connecting: connecting || switching,
    connectError,
    disconnect,
    connectors,
    activeChain,
  };
}
