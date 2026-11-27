/**
 * Invoice Jot local-first storage engine (no account, no server).
 *
 * Layer 1: IndexedDB (fast in-WebView cache, persistent-storage requested).
 * Layer 2 (iOS, authoritative): an atomic, versioned JSON snapshot in the app's Data directory
 *   (invoicejot-db.json + rolling invoicejot-db.prev.json). iOS can purge WebKit
 *   storage under disk pressure; the mirror lives in Application Support and
 *   is never purged, so on launch we hydrate from it whenever IndexedDB is
 *   empty or older.
 */
import { normalizeDatabase, isEmptyDatabase } from './db';
import type { Database } from './types';

export interface KeyValueBackend {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
}

export interface MirrorBackend {
  read(name: string): Promise<string | null>;
  write(name: string, data: string): Promise<void>;
  /** Copy a file if it exists; resolve false when the source is missing. */
  copy(from: string, to: string): Promise<boolean>;
  rename(from: string, to: string): Promise<void>;
}

export const DB_KEY = 'db';
export const MIRROR_MAIN = 'invoicejot-db.json';
export const MIRROR_PREV = 'invoicejot-db.prev.json';
export const MIRROR_TMP = 'invoicejot-db.tmp.json';

export type LoadSource = 'indexeddb' | 'mirror' | 'mirror-prev' | 'new';

export interface SnapshotFile {
  app: 'Invoice Jot';
  snapshotVersion: 1;
  savedAt: string;
  db: Database;
}

export class LocalStore {
  private queue: Promise<unknown> = Promise.resolve();
  private kv: KeyValueBackend;
  private mirror: MirrorBackend | null;

  constructor(kv: KeyValueBackend, mirror: MirrorBackend | null) {
    this.kv = kv;
    this.mirror = mirror;
  }

  async load(): Promise<{ db: Database; source: LoadSource }> {
    let primary: Database | null = null;
    try {
      const raw = await this.kv.get(DB_KEY);
      if (raw) primary = normalizeDatabase(raw);
    } catch {
      primary = null;
    }

    const mirrorMain = await this.readMirror(MIRROR_MAIN);
    const mirrorPrev = mirrorMain ? null : await this.readMirror(MIRROR_PREV);
    const mirror = mirrorMain ?? mirrorPrev;
    const mirrorSource: LoadSource = mirrorMain ? 'mirror' : 'mirror-prev';

    if (primary && !isEmptyDatabase(primary)) {
      // On iOS the native snapshot is authoritative: prefer it unless the
      // WebView copy is strictly newer (protects against a stale/evicted IDB).
      if (mirror && mirror.updatedAt >= primary.updatedAt && !isEmptyDatabase(mirror)) {
        await this.safeKvSet(mirror);
        return { db: mirror, source: mirrorSource };
      }
      return { db: primary, source: 'indexeddb' };
    }
    if (mirror) {
      await this.safeKvSet(mirror);
      return { db: mirror, source: mirrorSource };
    }
    return { db: primary ?? normalizeDatabase(null), source: primary ? 'indexeddb' : 'new' };
  }

  /** Serialised save so overlapping writes can never interleave. */
  save(db: Database): Promise<Database> {
    const next: Database = { ...db, updatedAt: new Date().toISOString() };
    const job = this.queue.then(() => this.write(next));
    this.queue = job.catch(() => undefined);
    return job.then(() => next);
  }

  private async write(db: Database): Promise<void> {
    let kvError: unknown = null;
    try {
      await this.kv.set(DB_KEY, db);
    } catch (e) {
      kvError = e;
    }
    if (this.mirror) {
      const snapshot: SnapshotFile = { app: 'Invoice Jot', snapshotVersion: 1, savedAt: db.updatedAt, db };
      // Atomic: write tmp -> keep previous -> rename tmp over main.
      await this.mirror.write(MIRROR_TMP, JSON.stringify(snapshot));
      await this.mirror.copy(MIRROR_MAIN, MIRROR_PREV);
      await this.mirror.rename(MIRROR_TMP, MIRROR_MAIN);
    } else if (kvError) {
      throw kvError;
    }
  }

  private async readMirror(name: string): Promise<Database | null> {
    if (!this.mirror) return null;
    try {
      const text = await this.mirror.read(name);
      if (!text) return null;
      const parsed = JSON.parse(text) as Partial<SnapshotFile>;
      if (!parsed || parsed.app !== 'Invoice Jot' || !parsed.db) return null;
      return normalizeDatabase(parsed.db);
    } catch {
      return null; // corrupt file: fall through to the previous snapshot
    }
  }

  private async safeKvSet(db: Database) {
    try {
      await this.kv.set(DB_KEY, db);
    } catch {
      /* mirror remains the source of truth */
    }
  }

  get keyValue(): KeyValueBackend {
    return this.kv;
  }
}

/* ---------------- IndexedDB backend ---------------- */

export function createIndexedDbBackend(dbName = 'invoicejot', storeName = 'kv'): KeyValueBackend {
  let dbp: Promise<IDBDatabase> | null = null;
  const open = () => {
    if (!dbp) {
      dbp = new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(dbName, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(storeName)) req.result.createObjectStore(storeName);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      dbp.catch(() => {
        dbp = null;
      });
    }
    return dbp;
  };
  const tx = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> => {
    const db = await open();
    return new Promise<T | undefined>((resolve, reject) => {
      const t = db.transaction(storeName, mode);
      const store = t.objectStore(storeName);
      const req = fn(store);
      let result: T | undefined;
      if (req) req.onsuccess = () => (result = req.result);
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  };
  return {
    get: <T>(key: string) => tx<T>('readonly', (s) => s.get(key) as IDBRequest<T>),
    set: async (key, value) => {
      await tx('readwrite', (s) => s.put(value, key));
    },
    del: async (key) => {
      await tx('readwrite', (s) => s.delete(key));
    },
  };
}

/** In-memory backend for tests and as an emergency fallback. */
export function createMemoryBackend(): KeyValueBackend & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: async <T>(k: string) => (data.has(k) ? (structuredClone(data.get(k)) as T) : undefined),
    set: async (k, v) => {
      data.set(k, structuredClone(v));
    },
    del: async (k) => {
      data.delete(k);
    },
  };
}

export function createMemoryMirror(): MirrorBackend & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return {
    files,
    read: async (n) => files.get(n) ?? null,
    write: async (n, d) => {
      files.set(n, d);
    },
    copy: async (a, b) => {
      if (!files.has(a)) return false;
      files.set(b, files.get(a) as string);
      return true;
    },
    rename: async (a, b) => {
      const v = files.get(a);
      if (v === undefined) throw new Error('missing ' + a);
      files.set(b, v);
      files.delete(a);
    },
  };
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    /* ignore */
  }
  return false;
}
