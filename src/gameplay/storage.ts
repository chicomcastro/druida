/**
 * Camada de persistência key-value assíncrona sobre IndexedDB, com fallback
 * para localStorage quando IDB não está disponível. Saves de mundo aberto
 * tendem a crescer; IDB evita o limite/sincronia do localStorage. Ver ADR 0024.
 */
const DB = 'druida';
const STORE = 'kv';

function openStore(mode: IDBTransactionMode): Promise<IDBObjectStore | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => {
        try { resolve(req.result.transaction(STORE, mode).objectStore(STORE)); }
        catch { resolve(null); }
      };
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

// Fallback síncrono em localStorage (JSON).
function lsGet(key: string) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
}
function lsSet(key: string, val: any) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch { return false; }
}
function lsDel(key: string) {
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

export async function kvGet(key: string): Promise<any> {
  const store = await openStore('readonly');
  if (!store) return lsGet(key);
  return new Promise((resolve) => {
    const r = store.get(key);
    r.onsuccess = () => resolve(r.result ?? lsGet(key));
    r.onerror = () => resolve(lsGet(key));
  });
}

export async function kvSet(key: string, val: any): Promise<boolean> {
  const store = await openStore('readwrite');
  if (!store) return lsSet(key, val);
  return new Promise((resolve) => {
    const r = store.put(val, key);
    r.onsuccess = () => { lsSet(key, val); resolve(true); }; // espelha p/ robustez
    r.onerror = () => resolve(lsSet(key, val));
  });
}

export async function kvDel(key: string): Promise<void> {
  lsDel(key);
  const store = await openStore('readwrite');
  if (!store) return;
  await new Promise<void>((resolve) => {
    const r = store.delete(key);
    r.onsuccess = () => resolve();
    r.onerror = () => resolve();
  });
}
