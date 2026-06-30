import { useCallback, useState } from "react";
import { getCallsStatus } from "viem/actions";
import type { Call } from "viem";
import { useConnection, useConnectorClient, useSendCalls } from "wagmi";
import { usePaymaster } from "./usePaymaster";

const WAIT_MS = 120_000;
const POLL_MS = 1500;

export function useSponsoredCalls() {
  const { connector } = useConnection();
  const { data: walletClient } = useConnectorClient({ connector });
  const { isSupported, capabilities } = usePaymaster();
  const { sendCallsAsync } = useSendCalls();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const waitForCalls = useCallback(
    async (id: string) => {
      if (!walletClient) throw new Error("Wallet not connected");
      const deadline = Date.now() + WAIT_MS;
      while (Date.now() < deadline) {
        const status = await getCallsStatus(walletClient, { id });
        if (status.status === "success") return status;
        if (status.status === "failure") {
          throw new Error("Sponsored transaction failed");
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }
      throw new Error("Sponsored transaction timed out");
    },
    [walletClient],
  );

  const sendSponsored = useCallback(
    async (calls: readonly Call[]) => {
      if (!isSupported || !capabilities) {
        throw new Error("Paymaster not available for this wallet");
      }

      setIsPending(true);
      setError(null);
      setIsSuccess(false);

      try {
        const { id } = await sendCallsAsync({ calls, capabilities });
        await waitForCalls(id);
        setIsSuccess(true);
        return id;
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        setError(wrapped);
        throw wrapped;
      } finally {
        setIsPending(false);
      }
    },
    [capabilities, isSupported, sendCallsAsync, waitForCalls],
  );

  const execute = useCallback(
    async (calls: readonly Call[], fallback: () => Promise<void>) => {
      if (isSupported && capabilities) {
        return sendSponsored(calls);
      }

      setIsPending(true);
      setError(null);
      setIsSuccess(false);

      try {
        await fallback();
        setIsSuccess(true);
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        setError(wrapped);
        throw wrapped;
      } finally {
        setIsPending(false);
      }
    },
    [capabilities, isSupported, sendSponsored],
  );

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
    setIsPending(false);
  }, []);

  return {
    isSupported,
    execute,
    sendSponsored,
    isPending,
    isSuccess,
    error,
    reset,
  };
}
