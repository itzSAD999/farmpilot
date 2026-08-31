import { useState, useEffect, useCallback } from 'react';
import { useOnline } from './useOnline';
import {
  getFailedEntries,
  onFailedChange,
  retryFailed,
  retryAllFailed,
  flush,
  type FailedEntry,
} from '../lib/offline/queue';
import { queueStore } from '../lib/offline/db';

/**
 * Hook that provides:
 *  - isOnline          — current connectivity status
 *  - pendingCount      — number of queued writes waiting to sync
 *  - failedEntries     — writes that failed 5 times (surfaced to user)
 *  - isSyncing         — true while flush() is running
 *  - retryOne(id)      — retry a single failed entry
 *  - retryAll()        — retry all failed entries
 *  - refreshPending()  — manually re-check the pending count
 */
export function useOfflineStatus() {
  const isOnline = useOnline();
  const [pendingCount, setPendingCount] = useState(0);
  const [failedEntries, setFailedEntries] = useState<FailedEntry[]>(getFailedEntries());
  const [isSyncing, setIsSyncing] = useState(false);

  // Refresh the pending count from IndexedDB
  const refreshPending = useCallback(async () => {
    const items = await queueStore.list();
    setPendingCount(items.length);
  }, []);

  // On mount and whenever online status changes, refresh pending
  useEffect(() => {
    refreshPending();
  }, [isOnline, refreshPending]);

  // Poll pending count every 2 seconds (cheap IDB read)
  useEffect(() => {
    const interval = setInterval(refreshPending, 2_000);
    return () => clearInterval(interval);
  }, [refreshPending]);

  // Subscribe to failed-list changes
  useEffect(() => {
    return onFailedChange((entries) => {
      setFailedEntries(entries);
    });
  }, []);

  // Wrap flush to track syncing state
  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      await flush();
    } finally {
      setIsSyncing(false);
      await refreshPending();
    }
  }, [refreshPending]);

  const retryOne = useCallback(async (id: string) => {
    setIsSyncing(true);
    try {
      await retryFailed(id);
    } finally {
      setIsSyncing(false);
      await refreshPending();
    }
  }, [refreshPending]);

  const retryAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      await retryAllFailed();
    } finally {
      setIsSyncing(false);
      await refreshPending();
    }
  }, [refreshPending]);

  return {
    isOnline,
    pendingCount,
    failedEntries,
    isSyncing,
    syncNow,
    retryOne,
    retryAll,
    refreshPending,
  };
}
