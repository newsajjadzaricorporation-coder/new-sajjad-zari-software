import { CartItem, SaleInvoice } from '../types';

/**
 * High-Performance Object Pool for Cart Items and Sale Transactions.
 * Eliminates heap allocations and GC pause overhead during high-frequency POS event loops.
 */
class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private resetFn: (obj: T) => void;

  constructor(factory: () => T, resetFn: (obj: T) => void, initialCapacity = 100) {
    this.factory = factory;
    this.resetFn = resetFn;
    for (let i = 0; i < initialCapacity; i++) {
      this.pool.push(this.factory());
    }
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    this.resetFn(obj);
    if (this.pool.length < 500) {
      this.pool.push(obj);
    }
  }

  releaseAll(objs: T[]): void {
    for (let i = 0; i < objs.length; i++) {
      this.release(objs[i]);
    }
  }
}

// Pre-configured global pools for POS event loop
export const cartItemPool = new ObjectPool<CartItem>(
  () => ({
    product: {
      id: '',
      name: '',
      sku: '',
      barcode: '',
      costPrice: 0,
      sellingPrice: 0,
      stock: 0,
      unit: 'piece',
      category: '',
      minStockAlert: 0,
      createdAt: '',
      updatedAt: '',
    },
    quantity: 0,
    unitPrice: 0,
    itemDiscount: 0,
    subtotal: 0,
  }),
  (item) => {
    item.quantity = 0;
    item.unitPrice = 0;
    item.itemDiscount = 0;
    item.subtotal = 0;
  },
  200
);

export const saleInvoicePool = new ObjectPool<Partial<SaleInvoice>>(
  () => ({
    id: '',
    invoiceNo: '',
    date: '',
    timestamp: 0,
    items: [],
    subtotal: 0,
    discountAmount: 0,
    netTotal: 0,
    amountTendered: 0,
    changeGiven: 0,
    paymentMethod: 'cash',
    status: 'completed',
  }),
  (invoice) => {
    invoice.id = '';
    invoice.invoiceNo = '';
    invoice.date = '';
    invoice.timestamp = 0;
    invoice.items = [];
    invoice.subtotal = 0;
    invoice.discountAmount = 0;
    invoice.netTotal = 0;
    invoice.amountTendered = 0;
    invoice.changeGiven = 0;
    invoice.customerId = undefined;
    invoice.customerName = undefined;
  },
  100
);
