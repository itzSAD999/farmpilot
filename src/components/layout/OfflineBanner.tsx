import { useOfflineStatus } from '../../hooks/useOfflineStatus';

/**
 * Persistent offline banner shown at the top of the app when there
 * is no network. Reassures the farmer their data is safe.
 */
export function OfflineBanner() {
  const { isOnline, pendingCount, failedEntries, isSyncing, retryOne, retryAll } = useOfflineStatus();

  // Nothing to show when online and no pending/failed items
  if (isOnline && pendingCount === 0 && failedEntries.length === 0 && !isSyncing) {
    return null;
  }

  return (
    <>
      {/* Offline banner */}
      {!isOnline && (
        <div className="print-hide bg-amber-500 text-white px-4 py-3 flex items-center justify-center text-center animate-fade-in z-50">
          <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728m12.728 0L5.636 18.364" />
          </svg>
          <span className="text-sm font-bold">
            Offline — your entries are saved on this phone and will sync when you have signal.
            {pendingCount > 0 && (
              <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {pendingCount} pending
              </span>
            )}
          </span>
        </div>
      )}

      {/* Syncing indicator (online, flushing queued items) */}
      {isOnline && isSyncing && (
        <div className="bg-blue-500 text-white px-4 py-2 flex items-center justify-center text-center animate-fade-in z-50">
          <svg className="animate-spin w-4 h-4 mr-2 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-bold">
            Syncing {pendingCount} {pendingCount === 1 ? 'item' : 'items'}...
          </span>
        </div>
      )}

      {/* Pending count when online but items haven't flushed yet */}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <div className="bg-amber-100 text-amber-800 px-4 py-2 flex items-center justify-center text-center animate-fade-in z-50">
          <span className="text-sm font-bold">
            {pendingCount} {pendingCount === 1 ? 'entry' : 'entries'} waiting to sync
          </span>
        </div>
      )}

      {/* Failed entries banner */}
      {failedEntries.length > 0 && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-3 animate-fade-in z-50">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-red-800 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {failedEntries.length} {failedEntries.length === 1 ? 'entry' : 'entries'} could not be saved
              </span>
              <button
                onClick={retryAll}
                className="text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors min-h-[44px] flex items-center"
              >
                Retry All
              </button>
            </div>
            <div className="space-y-1">
              {failedEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-xs text-red-700 bg-white rounded-lg px-3 py-2 border border-red-100">
                  <span className="font-medium truncate mr-2">
                    {entry.table} — {entry.op}: {entry.lastError}
                  </span>
                  <button
                    onClick={() => retryOne(entry.id)}
                    className="text-red-600 font-bold hover:underline shrink-0 min-h-[44px] flex items-center"
                  >
                    Retry
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
