import { openDB, IDBPDatabase } from 'idb';
import { encode, decode } from '@msgpack/msgpack';

const DB_NAME = 'nszc_pos_indexeddb_v2';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getIDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('products')) {
          const store = db.createObjectStore('products', { keyPath: 'id' });
          store.createIndex('sku', 'sku', { unique: false });
          store.createIndex('barcode', 'barcode', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }
        if (!db.objectStoreNames.contains('sales')) {
          const store = db.createObjectStore('sales', { keyPath: 'id' });
          store.createIndex('invoiceNo', 'invoiceNo', { unique: false });
          store.createIndex('customerId', 'customerId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('keyval')) {
          db.createObjectStore('keyval');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * High-performance MessagePack binary serialization helper.
 * Minimizes heap overhead and serialization latency compared to JSON stringify/parse.
 */
export function packData<T>(data: T): Uint8Array {
  return encode(data);
}

export function unpackData<T>(buffer: Uint8Array): T {
  return decode(buffer) as T;
}

/**
 * High-speed IndexedDB Batch Put Operation using 'idb' transaction
 */
export async function idbBulkPut<T extends { id: string }>(
  storeName: 'products' | 'sales' | 'customers',
  items: T[]
): Promise<void> {
  const db = await getIDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);

  for (let i = 0; i < items.length; i++) {
    // Store MessagePack binary blob or item directly
    store.put(items[i]);
  }

  await tx.done;
}

/**
 * High-speed IndexedDB Batch Delete Operation using 'idb' transaction
 */
export async function idbBulkDelete(
  storeName: 'products' | 'sales' | 'customers',
  ids: string[]
): Promise<void> {
  const db = await getIDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);

  for (let i = 0; i < ids.length; i++) {
    store.delete(ids[i]);
  }

  await tx.done;
}

/**
 * Key-Value Binary Storage for OfflineDB fallback and fast caching
 */
export async function idbSetKeyVal<T>(key: string, value: T): Promise<void> {
  const db = await getIDB();
  const binaryBlob = packData(value);
  await db.put('keyval', binaryBlob, key);
}

export async function idbGetKeyVal<T>(key: string): Promise<T | null> {
  try {
    const db = await getIDB();
    const rawBinary = await db.get('keyval', key);
    if (!rawBinary) return null;
    return unpackData<T>(rawBinary);
  } catch {
    return null;
  }
}
