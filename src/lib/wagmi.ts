import { createConfig, http } from "wagmi";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { activeChain, rpcUrl } from "./chains";

export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors: [
    injected(),
    injected({ target: "metaMask" }),
    coinbaseWallet({ appName: "LifePool" }),
  ],
  transports: {
    [activeChain.id]: http(rpcUrl),
  },
  ssr: false,
});
