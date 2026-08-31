import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

// ── Schema ──────────────────────────────────────────────────────────

/** Composite key for the cache store: "farms:abc-123" */
type CacheKey = string;

export interface CacheEntry {
  /** "table:id", e.g. "farms:abc-123" */
  key: CacheKey;
  table: string;
  data: unknown;
  updatedAt: number; // epoch ms
}

export interface QueueEntry {
  id: string;
  table: string;
  op: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
}

export interface MetaEntry {
  key: string;
  value: unknown;
}

interface FarmPilotDB extends DBSchema {
  cache: {
    key: CacheKey;
    value: CacheEntry;
    indexes: { 'by-table': string };
  };
  queue: {
    key: string;
    value: QueueEntry;
    indexes: { 'by-table': string };
  };
  meta: {
    key: string;
    value: MetaEntry;
  };
}

// ── Constants ───────────────────────────────────────────────────────

const DB_NAME = 'farmpilot-offline';
const DB_VERSION = 1;

// ── Singleton ───────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<FarmPilotDB>> | null = null;
let dbUnavailable = false;

function getDB(): Promise<IDBPDatabase<FarmPilotDB>> | null {
  if (dbUnavailable) return null;

  if (!dbPromise) {
    // IndexedDB may not exist (e.g. SSR, very old browser)
    if (typeof indexedDB === 'undefined') {
      dbUnavailable = true;
      return null;
    }

    dbPromise = openDB<FarmPilotDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Cache store
        if (!db.objectStoreNames.contains('cache')) {
          const cache = db.createObjectStore('cache', { keyPath: 'key' });
          cache.createIndex('by-table', 'table');
        }
        // Queue store
        if (!db.objectStoreNames.contains('queue')) {
          const queue = db.createObjectStore('queue', { keyPath: 'id' });
          queue.createIndex('by-table', 'table');
        }
        // Meta store
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
      blocked() {
        console.warn('[offline-db] Database blocked by an older connection.');
      },
      blocking() {
        console.warn('[offline-db] This connection is blocking a newer version.');
      },
    }).catch((err) => {
      // Private browsing or security policy may block IDB
      console.warn('[offline-db] IndexedDB unavailable, degrading to online-only:', err);
      dbUnavailable = true;
      dbPromise = null;
      throw err;
    });
  }

  return dbPromise;
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Build a cache key from table name and row id */
export function cacheKey(table: string, id: string): CacheKey {
  return `${table}:${id}`;
}

/** Returns true if offline storage is available */
export function isOfflineAvailable(): boolean {
  return !dbUnavailable;
}

// ── Cache Store ─────────────────────────────────────────────────────

export const cacheStore = {
  async get(table: string, id: string): Promise<CacheEntry | undefined> {
    const p = getDB();
    if (!p) return undefined;
    try {
      const db = await p;
      return db.get('cache', cacheKey(table, id));
    } catch {
      return undefined;
    }
  },

  async set(table: string, id: string, data: unknown): Promise<void> {
    const p = getDB();
    if (!p) return;
    try {
      const db = await p;
      await db.put('cache', {
        key: cacheKey(table, id),
        table,
        data,
        updatedAt: Date.now(),
      });
    } catch {
      // Silently degrade
    }
  },

  async delete(table: string, id: string): Promise<void> {
    const p = getDB();
    if (!p) return;
    try {
      const db = await p;
      await db.delete('cache', cacheKey(table, id));
    } catch {
      // Silently degrade
    }
  },

  async listByTable(table: string): Promise<CacheEntry[]> {
    const p = getDB();
    if (!p) return [];
    try {
      const db = await p;
      return db.getAllFromIndex('cache', 'by-table', table);
    } catch {
      return [];
    }
  },

  async clear(): Promise<void> {
    const p = getDB();
    if (!p) return;
    try {
      const db = await p;
      await db.clear('cache');
    } catch {
      // Silently degrade
    }
  },
};

// ── Queue Store ─────────────────────────────────────────────────────

export const queueStore = {
  async add(entry: QueueEntry): Promise<void> {
    const p = getDB();
    if (!p) return;
    try {
      const db = await p;
      await db.put('queue', entry);
    } catch {
      // Silently degrade
    }
  },

  async get(id: string): Promise<QueueEntry | undefined> {
    const p = getDB();
    if (!p) return undefined;
    try {
      const db = await p;
      return db.get('queue', id);
    } catch {
      return undefined;
    }
  },

  async delete(id: string): Promise<void> {
    const p = getDB();
    if (!p) return;
    try {
      const db = await p;
      await db.delete('queue', id);
    } catch {
      // Silently degrade
    }
  },

  async list(): Promise<QueueEntry[]> {
    const p = getDB();
    if (!p) return [];
    try {
      const db = await p;
      return db.getAll('queue');
    } catch {
      return [];
    }
  },

  async listByTable(table: string): Promise<QueueEntry[]> {
    const p = getDB();
    if (!p) return [];
    try {
      const db = await p;
      return db.getAllFromIndex('queue', 'by-table', table);
    } catch {
      return [];
    }
  },

  async updateAttempts(id: string, attempts: number): Promise<void> {
    const p = getDB();
    if (!p) return;
    try {
      const db = await p;
      const entry = await db.get('queue', id);
      if (entry) {
        entry.attempts = attempts;
        await db.put('queue', entry);
      }
    } catch {
      // Silently degrade
    }
  },

  async clear(): Promise<void> {
    const p = getDB();
    if (!p) return;
    try {
      const db = await p;
      await db.clear('queue');
    } catch {
      // Silently degrade
    }
  },
};

// ── Meta Store ──────────────────────────────────────────────────────

export const metaStore = {
  async get<T = unknown>(key: string): Promise<T | undefined> {
    const p = getDB();
    if (!p) return undefined;
    try {
      const db = await p;
      const entry = await db.get('meta', key);
      return entry?.value as T | undefined;
    } catch {
      return undefined;
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    const p = getDB();
    if (!p) return;
    try {
      const db = await p;
      await db.put('meta', { key, value });
    } catch {
      // Silently degrade
    }
  },

  async delete(key: string): Promise<void> {
    const p = getDB();
    if (!p) return;
    try {
      const db = await p;
      await db.delete('meta', key);
    } catch {
      // Silently degrade
    }
  },

  /** Convenience: get/set lastSyncedAt */
  async getLastSyncedAt(): Promise<number | undefined> {
    return this.get<number>('lastSyncedAt');
  },

  async setLastSyncedAt(timestamp: number = Date.now()): Promise<void> {
    return this.set('lastSyncedAt', timestamp);
  },
};
