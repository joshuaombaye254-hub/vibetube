/** IndexedDB storage for offline playback of completed authorized downloads. */

const DB_NAME = "vibetube-offline";
const STORE = "files";
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open offline storage"));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Offline storage error"));
        transaction.oncomplete = () => db.close();
      }),
  );
}

export function offlineKey(videoId: string, quality: string) {
  return `${videoId}__${quality}`;
}

export async function saveOfflineFile(key: string, blob: Blob): Promise<void> {
  await tx("readwrite", (store) => store.put(blob, key));
}

export async function getOfflineFile(key: string): Promise<Blob | undefined> {
  return tx<Blob | undefined>("readonly", (store) => store.get(key) as IDBRequest<Blob | undefined>);
}

export async function hasOfflineFile(key: string): Promise<boolean> {
  const blob = await getOfflineFile(key);
  return blob !== undefined;
}

export async function deleteOfflineFile(key: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(key) as unknown as IDBRequest<undefined>);
}
