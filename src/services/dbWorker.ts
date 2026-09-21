import { encode, decode } from '@msgpack/msgpack';
import { Product } from '../types';

/**
 * Dedicated Web Worker for Off-Main-Thread Database & Binary Data Operations
 */
self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    if (type === 'BATCH_PROCESS_PRODUCTS') {
      const { products, updates } = payload as { products: Product[]; updates: Array<Partial<Product> & { id: string }> };
      const map = new Map<string, Product>();

      for (let i = 0; i < products.length; i++) {
        map.set(products[i].id, products[i]);
      }

      for (let i = 0; i < updates.length; i++) {
        const item = updates[i];
        const existing = map.get(item.id);
        if (existing) {
          map.set(item.id, {
            ...existing,
            ...item,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      const updatedList = Array.from(map.values());
      const packedBuffer = encode(updatedList);

      (self as unknown as { postMessage: (msg: unknown, transfer?: Transferable[]) => void }).postMessage(
        { id, type: 'SUCCESS', result: updatedList, packedBuffer },
        [packedBuffer.buffer]
      );
    } else if (type === 'PACK_BINARY') {
      const packedBuffer = encode(payload);
      (self as unknown as { postMessage: (msg: unknown, transfer?: Transferable[]) => void }).postMessage(
        { id, type: 'SUCCESS', packedBuffer },
        [packedBuffer.buffer]
      );
    } else if (type === 'UNPACK_BINARY') {
      const decoded = decode(payload);
      (self as unknown as { postMessage: (msg: unknown) => void }).postMessage({ id, type: 'SUCCESS', result: decoded });
    } else {
      (self as unknown as { postMessage: (msg: unknown) => void }).postMessage({ id, type: 'ERROR', error: 'Unknown worker task type' });
    }
  } catch (err) {
    (self as unknown as { postMessage: (msg: unknown) => void }).postMessage({ id, type: 'ERROR', error: String(err) });
  }
};
