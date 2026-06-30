import { useCallback, useEffect, useState } from "react";
import { getLiveGridStrategy, type GridStrategySnapshot } from "../strategy/grid-bot";

export function useGridStrategy() {
  const [strategy, setStrategy] = useState<GridStrategySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getLiveGridStrategy();
      setStrategy(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load grid strategy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { strategy, loading, error, refresh };
}
