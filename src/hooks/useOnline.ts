import { useState, useEffect, useCallback, useRef } from 'react';
import { flush } from '../lib/offline/queue';

/**
 * Hook that tracks online/offline state and auto-flushes the offline
 * queue when connectivity is restored.
 *
 * Uses navigator.onLine plus online/offline events.
 * Debounces reconnection to handle connectivity flapping (e.g. the
 * phone toggling between towers).
 */
export function useOnline() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const DEBOUNCE_MS = 2_000; // 2 seconds debounce to avoid flapping

  const handleOnline = useCallback(() => {
    // Clear any pending offline debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Debounce the reconnect to avoid flapping
    debounceTimerRef.current = setTimeout(() => {
      setIsOnline(true);
      // Flush queued writes on reconnect
      flush().catch((err) => {
        console.warn('[useOnline] flush failed on reconnect:', err);
      });
    }, DEBOUNCE_MS);
  }, []);

  const handleOffline = useCallback(() => {
    // Clear any pending online debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setIsOnline(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [handleOnline, handleOffline]);

  return isOnline;
}
