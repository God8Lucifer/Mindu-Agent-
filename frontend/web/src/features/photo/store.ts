/**
 * Keeps visitors' photos on their own device (IndexedDB), so a collection
 * survives moving between chambers and page reloads without uploading anything.
 * Photos are stored per chamber as an array of JPEG blobs.
 */

const DB = 'mindu-photos';
const STORE = 'chambers';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

export async function loadAll(): Promise<Record<string, Blob[]>> {
  try {
    const out: Record<string, Blob[]> = {};
    const keys = await run('readonly', s => s.getAllKeys());
    const values = await run('readonly', s => s.getAll());
    keys.forEach((k, i) => { out[String(k)] = values[i] as Blob[]; });
    return out;
  } catch {
    return {}; // private mode or storage blocked: start empty
  }
}

export async function saveChamber(id: string, photos: Blob[]) {
  try { await run('readwrite', s => s.put(photos, id)); } catch { /* keep in memory only */ }
}

export async function clearAll() {
  try { await run('readwrite', s => s.clear()); } catch { /* ignore */ }
}
