import { useState, useEffect, useCallback, useRef } from 'react';
import * as Network from 'expo-network';

interface NetworkStatus {
  isConnected: boolean;
  type: string | null;
}

/**
 * Hook to monitor network connectivity.
 * Polls every 10 seconds and provides current status.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    type: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkNetwork = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setStatus({
        isConnected: state.isConnected ?? false,
        type: state.type ?? null,
      });
    } catch {
      setStatus({ isConnected: false, type: null });
    }
  }, []);

  useEffect(() => {
    checkNetwork();
    intervalRef.current = setInterval(checkNetwork, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkNetwork]);

  return status;
}

/**
 * One-shot check for connectivity.
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected ?? false;
  } catch {
    return false;
  }
}
