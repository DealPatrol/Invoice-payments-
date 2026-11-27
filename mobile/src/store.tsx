import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Database } from './lib/types';
import { emptyDatabase } from './lib/db';
import { LocalStore, createIndexedDbBackend, createMemoryBackend, requestPersistentStorage } from './lib/storage';
import { createFilesystemMirror } from './lib/native';
import { isNative } from './lib/platform';
import { cachedPro, onEntitlementsChanged, refreshEntitlement } from './lib/storekit';

export type Route =
  | { name: 'home' }
  | { name: 'docs'; kind: 'invoice' | 'estimate' }
  | { name: 'doc'; id: string }
  | { name: 'clients' }
  | { name: 'client'; id: string | null }
  | { name: 'items' }
  | { name: 'receipts' }
  | { name: 'receipt'; id: string | null }
  | { name: 'settings' }
  | { name: 'more' };

interface Ctx {
  db: Database;
  ready: boolean;
  loadError: string | null;
  saveError: string | null;
  update: (fn: (db: Database) => Database) => void;
  replace: (db: Database) => Promise<void>;
  pro: boolean;
  setPro: (v: boolean) => void;
  route: Route;
  go: (r: Route) => void;
  back: () => void;
  paywall: { open: boolean; reason: string };
  openPaywall: (reason: string) => void;
  closePaywall: () => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
}

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}

function makeStore(): LocalStore {
  let kv;
  try {
    kv = typeof indexedDB !== 'undefined' ? createIndexedDbBackend() : createMemoryBackend();
  } catch {
    kv = createMemoryBackend();
  }
  return new LocalStore(kv, isNative() ? createFilesystemMirror() : null);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [store] = useState<LocalStore>(makeStore);
  const [db, setDb] = useState<Database>(() => emptyDatabase());
  const dbRef = useRef(db);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pro, setPro] = useState<boolean>(cachedPro());
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const [paywall, setPaywall] = useState({ open: false, reason: '' });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void requestPersistentStorage();
    store
      .load()
      .then(({ db: loaded }) => {
        if (!alive) return;
        dbRef.current = loaded;
        setDb(loaded);
        setReady(true);
      })
      .catch((e) => {
        setLoadError(String((e as Error)?.message ?? e));
        setReady(true);
      });
    void refreshEntitlement().then((p) => alive && setPro(p));
    const off = onEntitlementsChanged((p) => setPro(p));
    return () => {
      alive = false;
      off();
    };
  }, [store]);

  const persist = useCallback((next: Database) => {
    store
      .save(next)
      .then(() => setSaveError(null))
      .catch((e) => setSaveError(`Could not save: ${String((e as Error)?.message ?? e)}`));
  }, [store]);

  const update = useCallback(
    (fn: (d: Database) => Database) => {
      const next = fn(dbRef.current);
      if (next === dbRef.current) return;
      dbRef.current = next;
      setDb(next);
      persist(next);
    },
    [persist],
  );

  const replace = useCallback(
    async (next: Database) => {
      dbRef.current = next;
      setDb(next);
      await store.save(next);
    },
    [store],
  );

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      db,
      ready,
      loadError,
      saveError,
      update,
      replace,
      pro,
      setPro,
      route: stack[stack.length - 1],
      go: (r) => {
        const tabs = ['home', 'docs', 'clients', 'more'];
        setStack((s) => (tabs.includes(r.name) ? [r] : [...s, r]));
        window.scrollTo(0, 0);
      },
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      paywall,
      openPaywall: (reason) => setPaywall({ open: true, reason }),
      closePaywall: () => setPaywall({ open: false, reason: '' }),
      toast,
      toastMsg,
    }),
    [db, ready, loadError, saveError, update, replace, pro, stack, paywall, toast, toastMsg],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
