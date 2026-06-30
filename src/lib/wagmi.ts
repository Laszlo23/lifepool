import { createConfig, http } from "wagmi";
import { baseAccount } from "wagmi/connectors";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { activeChain, rpcUrl } from "./chains";

/** Connector IDs used by SmartWalletPanel */
export const WALLET_CONNECTORS = {
  baseSmart: "baseAccount",
  coinbaseSmart: "coinbaseWalletSDK",
  metaMask: "metaMask",
} as const;

export type WalletConnectorId =
  (typeof WALLET_CONNECTORS)[keyof typeof WALLET_CONNECTORS];

export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors: [
    baseAccount({
      appName: "LifePool",
      preference: { options: "smartWalletOnly" },
    }),
    coinbaseWallet({
      appName: "LifePool",
      preference: { options: "smartWalletOnly" },
    }),
    injected({ target: "metaMask" }),
    injected(),
  ],
  transports: {
    [activeChain.id]: http(rpcUrl),
  },
  ssr: false,
});

export const WALLET_OPTIONS: {
  id: WalletConnectorId;
  title: string;
  subtitle: string;
  badge: string;
  primary?: boolean;
}[] = [
  {
    id: WALLET_CONNECTORS.baseSmart,
    title: "Base Smart Wallet",
    subtitle: "Passkey or email · gasless-ready on Base",
    badge: "Recommended",
    primary: true,
  },
  {
    id: WALLET_CONNECTORS.coinbaseSmart,
    title: "Coinbase Smart Wallet",
    subtitle: "Sign in with Coinbase · no extension",
    badge: "Smart",
  },
  {
    id: WALLET_CONNECTORS.metaMask,
    title: "MetaMask",
    subtitle: "Browser extension · advanced users",
    badge: "Extension",
  },
];
