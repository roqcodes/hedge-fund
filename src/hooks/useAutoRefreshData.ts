import { useEffect, useRef } from 'react';

const DEFAULT_INTERVAL_MS = 30_000;

function parseIntervalMs(): number {
  const raw = process.env.NEXT_PUBLIC_DATA_REFRESH_INTERVAL_MS;
  if (!raw) return DEFAULT_INTERVAL_MS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 5_000 ? parsed : DEFAULT_INTERVAL_MS;
}

/**
 * Periodically refetches app data while the tab is visible, and once when the
 * user returns to the tab or window. Polling pauses while hidden to save load.
 */
export function useAutoRefreshData(options: {
  enabled: boolean;
  refetch: () => void | Promise<void>;
  intervalMs?: number;
}) {
  const intervalMs = options.intervalMs ?? parseIntervalMs();
  const refetchRef = useRef(options.refetch);
  refetchRef.current = options.refetch;

  useEffect(() => {
    if (!options.enabled) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const runRefetch = () => {
      if (document.visibilityState !== 'visible') return;
      void refetchRef.current();
    };

    const startPolling = () => {
      if (intervalId != null) return;
      intervalId = setInterval(runRefetch, intervalMs);
    };

    const stopPolling = () => {
      if (intervalId == null) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runRefetch();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', runRefetch);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', runRefetch);
    };
  }, [options.enabled, intervalMs]);
}
