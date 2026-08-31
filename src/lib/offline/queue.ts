import { queueStore, type QueueEntry } from './db';
import { supabase } from '../supabase';

// ── Types ───────────────────────────────────────────────────────────

export interface EnqueueOp {
  table: string;
  op: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
}

export interface FailedEntry extends QueueEntry {
  lastError: string;
}

// ── Constants ───────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1_000; // 1s, 2s, 4s, 8s, 16s

// ── State ───────────────────────────────────────────────────────────

/** In-memory list of permanently failed writes. Surfaced to the UI. */
let failedList: FailedEntry[] = [];
let flushInProgress = false;

/** Listeners that the UI can subscribe to for failed-list changes */
type FailedListener = (entries: FailedEntry[]) => void;
const listeners = new Set<FailedListener>();

function notifyListeners() {
  listeners.forEach((fn) => fn([...failedList]));
}

export function onFailedChange(fn: FailedListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getFailedEntries(): FailedEntry[] {
  return [...failedList];
}

// ── Helpers ─────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

function isPostgresDuplicate(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as Record<string, unknown>;
  // Postgres unique_violation = 23505
  return e.code === '23505' || String(e.message || '').includes('23505');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Enqueue ─────────────────────────────────────────────────────────

/**
 * Queue a write operation for later flush.
 *
 * A `client_id` UUID is stamped INTO the payload so the server can
 * use a unique index on it to guarantee idempotency.  If the flush is
 * interrupted and retried, the duplicate insert will hit a 23505 and
 * we simply discard the queue entry.
 */
export async function enqueue(op: EnqueueOp): Promise<string> {
  const clientId = generateId();

  const entry: QueueEntry = {
    id: clientId,
    table: op.table,
    op: op.op,
    payload: {
      ...op.payload,
      client_id: clientId,
    },
    createdAt: Date.now(),
    attempts: 0,
  };

  await queueStore.add(entry);
  return clientId;
}

// ── Flush ───────────────────────────────────────────────────────────

/**
 * Process all queued writes in FIFO order.
 *
 * - Success → remove from queue.
 * - Postgres 23505 on client_id → already applied, remove.
 * - Other error → increment attempts, apply exponential backoff.
 * - After MAX_ATTEMPTS → move to failedList (visible to user), NEVER drop.
 */
export async function flush(): Promise<void> {
  // Prevent concurrent flushes
  if (flushInProgress) return;
  flushInProgress = true;

  try {
    const entries = await queueStore.list();
    if (entries.length === 0) return;

    // Process in creation order
    const sorted = entries.sort((a, b) => a.createdAt - b.createdAt);

    for (const entry of sorted) {
      try {
        await executeWrite(entry);
        // Success — remove from queue
        await queueStore.delete(entry.id);
      } catch (err) {
        if (isPostgresDuplicate(err)) {
          // Already applied — this is the normal interrupted-flush case
          await queueStore.delete(entry.id);
          continue;
        }

        // Increment attempts
        const newAttempts = entry.attempts + 1;

        if (newAttempts >= MAX_ATTEMPTS) {
          // Move to failed list — NEVER silently drop
          failedList.push({
            ...entry,
            attempts: newAttempts,
            lastError: err instanceof Error ? err.message : String(err),
          });
          await queueStore.delete(entry.id);
          notifyListeners();
        } else {
          // Update attempts in queue and back off
          await queueStore.updateAttempts(entry.id, newAttempts);
          const backoff = BASE_BACKOFF_MS * Math.pow(2, newAttempts - 1);
          await delay(backoff);
        }
      }
    }
  } finally {
    flushInProgress = false;
  }
}

/**
 * Retry a single failed entry. Removes it from the failed list and
 * re-enqueues it with zero attempts.
 */
export async function retryFailed(clientId: string): Promise<void> {
  const idx = failedList.findIndex((e) => e.id === clientId);
  if (idx === -1) return;

  const entry = failedList[idx];
  failedList.splice(idx, 1);
  notifyListeners();

  // Re-enqueue with reset attempts (keep the same client_id for idempotency)
  const requeued: QueueEntry = {
    ...entry,
    attempts: 0,
  };
  await queueStore.add(requeued);

  // Attempt flush immediately
  await flush();
}

/**
 * Retry ALL failed entries.
 */
export async function retryAllFailed(): Promise<void> {
  const toRetry = [...failedList];
  failedList = [];
  notifyListeners();

  for (const entry of toRetry) {
    const requeued: QueueEntry = {
      ...entry,
      attempts: 0,
    };
    await queueStore.add(requeued);
  }

  await flush();
}

// ── Execute a single write against Supabase ─────────────────────────

async function executeWrite(entry: QueueEntry): Promise<void> {
  const { table, op, payload } = entry;

  switch (op) {
    case 'insert': {
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
      break;
    }
    case 'update': {
      const { id: _clientId, ...rest } = payload;
      const rowId = rest.id;
      if (!rowId) throw new Error('Update requires an id in payload');
      const { error } = await supabase
        .from(table)
        .update(rest)
        .eq('id', rowId);
      if (error) throw error;
      break;
    }
    case 'delete': {
      const rowId = payload.id;
      if (!rowId) throw new Error('Delete requires an id in payload');
      const { error } = await supabase.from(table).delete().eq('id', rowId);
      if (error) throw error;
      break;
    }
    default:
      throw new Error(`Unknown op: ${op}`);
  }
}
