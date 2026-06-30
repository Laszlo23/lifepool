import { useMemo } from "react";
import { useAccount, useCapabilities } from "wagmi";
import { getPaymasterProxyUrl, isPaymasterEnabled } from "../lib/paymaster";

export function usePaymaster() {
  const { address, chainId } = useAccount();
  const enabled = isPaymasterEnabled();
  const proxyUrl = getPaymasterProxyUrl();

  const { data: capabilitiesMap } = useCapabilities({
    account: address,
    query: { enabled: enabled && !!address && !!proxyUrl },
  });

  const walletSupportsPaymaster = useMemo(() => {
    if (!chainId || !capabilitiesMap) return false;
    return capabilitiesMap[chainId]?.paymasterService?.supported === true;
  }, [capabilitiesMap, chainId]);

  const isSupported = enabled && !!proxyUrl && walletSupportsPaymaster;

  const capabilities = useMemo(() => {
    if (!isSupported || !proxyUrl) return undefined;
    return {
      paymasterService: { url: proxyUrl },
    };
  }, [isSupported, proxyUrl]);

  return {
    isEnabled: enabled,
    isSupported,
    proxyUrl,
    capabilities,
  };
}
