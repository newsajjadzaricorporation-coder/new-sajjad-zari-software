import {
  Product,
  SaleInvoice,
  Customer,
  CustomerLedgerEntry,
  Supplier,
  PurchaseOrder,
  SaleReturn,
  Expense,
  DailyClosingReport,
  AuditLog,
  ShopSettings,
  UserProfile,
  AuditActionType,
  UnitType,
  CSVValidationItem,
  CSVValidationSummary,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_EXPENSES,
  DEFAULT_SETTINGS,
  INITIAL_USER,
  INITIAL_PURCHASES,
} from '../data/seedData';
import { getCustomerLoyaltyTier } from '../utils/loyalty';

const DB_KEYS = {
  PRODUCTS: 'nszc_products_v1',
  SALES: 'nszc_sales_v1',
  CUSTOMERS: 'nszc_customers_v1',
  LEDGER: 'nszc_customer_ledger_v1',
  SUPPLIERS: 'nszc_suppliers_v1',
  PURCHASES: 'nszc_purchases_v1',
  RETURNS: 'nszc_returns_v1',
  EXPENSES: 'nszc_expenses_v1',
  CLOSING_REPORTS: 'nszc_closing_reports_v1',
  AUDIT_LOGS: 'nszc_audit_logs_v1',
  SETTINGS: 'nszc_settings_v1',
  USERS: 'nszc_users_v1',
  CURRENT_USER: 'nszc_current_user_v1',
  LAST_CLOSING: 'nszc_last_closing_v1',
  SESSION_LOCKED: 'nszc_session_locked_v1',
  PIN_CREDENTIALS: 'nszc_user_pins_v1',
  THEME_MODE: 'nszc_theme_mode_v1',
  DAILY_BACKUPS: 'nszc_daily_backups_v1',
  LAST_BACKUP_DATE: 'nszc_last_daily_backup_date_v1',
  PENDING_SYNC_QUEUE: 'nszc_pending_sync_queue_v1',
};

// Broadcast channel for multi-tab synchronization
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('nszc_pos_sync_bus')
  : null;

function broadcastUpdate(type: string, payload?: unknown) {
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type, payload, timestamp: Date.now() });
    } catch {
      // ignore
    }
  }
}

// High-performance in-memory cache layer to eliminate repetitive JSON serialization overhead
const memoryCache = new Map<string, any>();

// In-Memory Index Maps for O(1) Lookups
const productIndexById = new Map<string, Product>();
const productIndexBySku = new Map<string, Product>();
const productIndexByBarcode = new Map<string, Product>();

function rebuildProductIndices(products: Product[]) {
  productIndexById.clear();
  productIndexBySku.clear();
  productIndexByBarcode.clear();
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    productIndexById.set(p.id, p);
    if (p.sku) productIndexBySku.set(p.sku.toLowerCase(), p);
    if (p.barcode) productIndexByBarcode.set(p.barcode, p);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key) {
      memoryCache.delete(e.key);
      if (e.key === DB_KEYS.PRODUCTS) {
        const prods = getLocalItem<Product[]>(DB_KEYS.PRODUCTS, INITIAL_PRODUCTS);
        rebuildProductIndices(prods);
      }
    } else {
      memoryCache.clear();
    }
  });
}

// Local storage helper with high-speed memory caching
function getLocalItem<T>(key: string, defaultValue: T): T {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      memoryCache.set(key, defaultValue);
      return defaultValue;
    }
    const parsed = JSON.parse(raw);
    memoryCache.set(key, parsed);
    return parsed;
  } catch (err) {
    console.warn(`Error reading key ${key} from storage:`, err);
    memoryCache.set(key, defaultValue);
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  memoryCache.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving key ${key} to storage:`, err);
  }
}

export class OfflineDB {
  // Initialization
  static initDatabase() {
    if (!localStorage.getItem(DB_KEYS.PRODUCTS)) {
      setLocalItem(DB_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    }
    if (!localStorage.getItem(DB_KEYS.CUSTOMERS)) {
      setLocalItem(DB_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    }
    if (!localStorage.getItem(DB_KEYS.SUPPLIERS)) {
      setLocalItem(DB_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    }
    if (!localStorage.getItem(DB_KEYS.PURCHASES)) {
      setLocalItem(DB_KEYS.PURCHASES, INITIAL_PURCHASES);
    }
    if (!localStorage.getItem(DB_KEYS.EXPENSES)) {
      setLocalItem(DB_KEYS.EXPENSES, INITIAL_EXPENSES);
    }
    if (!localStorage.getItem(DB_KEYS.SETTINGS)) {
      setLocalItem(DB_KEYS.SETTINGS, DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(DB_KEYS.USERS)) {
      const defaultUsers: UserProfile[] = [
        INITIAL_USER,
        {
          uid: 'staff-01',
          email: 'counter1@sajjadzari.com',
          displayName: 'Counter 1 (Bilal Cashier)',
          role: 'staff',
          createdAt: '2026-08-15T00:00:00Z',
        },
      ];
      setLocalItem(DB_KEYS.USERS, defaultUsers);
    }
    if (!localStorage.getItem(DB_KEYS.CURRENT_USER)) {
      setLocalItem(DB_KEYS.CURRENT_USER, INITIAL_USER);
    }

    // Pre-populate some historical customer ledger entries
    if (!localStorage.getItem(DB_KEYS.LEDGER)) {
      const initialLedger: CustomerLedgerEntry[] = [
        {
          id: 'led-001',
          customerId: 'cust-001',
          date: '2026-09-01 11:30 AM',
          timestamp: Date.now() - 14 * 86400000,
          type: 'credit_sale',
          referenceId: 'INV-202609-001',
          debit: 55000,
          credit: 0,
          runningBalance: 55000,
          notes: 'Wedding Season Bulk Zari Order',
          recordedBy: 'admin',
        },
        {
          id: 'led-002',
          customerId: 'cust-001',
          date: '2026-09-08 04:15 PM',
          timestamp: Date.now() - 7 * 86400000,
          type: 'payment_received',
          referenceId: 'RCPT-0982',
          debit: 0,
          credit: 12500,
          runningBalance: 42500,
          paymentMethod: 'Cash',
          notes: 'Partial payment on delivery',
          recordedBy: 'admin',
        },
        {
          id: 'led-003',
          customerId: 'cust-002',
          date: '2026-09-05 02:00 PM',
          timestamp: Date.now() - 10 * 86400000,
          type: 'credit_sale',
          referenceId: 'INV-202609-003',
          debit: 25400,
          credit: 0,
          runningBalance: 25400,
          notes: 'Antique Silver Tilla batch',
          recordedBy: 'admin',
        },
        {
          id: 'led-004',
          customerId: 'cust-002',
          date: '2026-09-12 05:45 PM',
          timestamp: Date.now() - 3 * 86400000,
          type: 'payment_received',
          referenceId: 'RCPT-1004',
          debit: 0,
          credit: 7000,
          runningBalance: 18400,
          paymentMethod: 'Bank Transfer',
          notes: 'Meezan Bank transfer slip #8821',
          recordedBy: 'admin',
        },
      ];
      setLocalItem(DB_KEYS.LEDGER, initialLedger);
    }
  }

  // Multi-tab listener
  static onSync(callback: (type: string, payload: unknown) => void) {
    if (!syncChannel) return () => {};
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type) {
        callback(e.data.type, e.data.payload);
      }
    };
    syncChannel.addEventListener('message', handler);
    return () => syncChannel.removeEventListener('message', handler);
  }

  // PRODUCTS
  static getProducts(): Product[] {
    const prods = getLocalItem<Product[]>(DB_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    if (productIndexById.size !== prods.length) {
      rebuildProductIndices(prods);
    }
    return prods;
  }

  static getProductById(id: string): Product | undefined {
    if (productIndexById.size === 0) {
      this.getProducts();
    }
    return productIndexById.get(id);
  }

  static getProductBySku(sku: string): Product | undefined {
    if (productIndexBySku.size === 0) {
      this.getProducts();
    }
    return productIndexBySku.get(sku.trim().toLowerCase());
  }

  static getProductByBarcode(barcode: string): Product | undefined {
    if (productIndexByBarcode.size === 0) {
      this.getProducts();
    }
    return productIndexByBarcode.get(barcode.trim());
  }

  static saveProduct(product: Product, userEmail: string): void {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    let isUpdate = false;
    let oldProduct: Product | undefined;

    if (index >= 0) {
      isUpdate = true;
      oldProduct = products[index];
      products[index] = { ...product, updatedAt: new Date().toISOString() };
    } else {
      products.unshift({
        ...product,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setLocalItem(DB_KEYS.PRODUCTS, products);
    rebuildProductIndices(products);

    if (isUpdate && oldProduct) {
      if (oldProduct.sellingPrice !== product.sellingPrice) {
        this.addAuditLog({
          userEmail,
          actionType: 'PRICE_CHANGE',
          entityId: product.sku,
          details: `Selling price modified for "${product.name}" from Rs ${oldProduct.sellingPrice} to Rs ${product.sellingPrice}`,
          previousValue: `Rs ${oldProduct.sellingPrice}`,
          newValue: `Rs ${product.sellingPrice}`,
        });
      }
      if (oldProduct.stock !== product.stock) {
        this.addAuditLog({
          userEmail,
          actionType: 'STOCK_OVERRIDE',
          entityId: product.sku,
          details: `Manual stock override for "${product.name}" from ${oldProduct.stock} ${oldProduct.unit} to ${product.stock} ${product.unit}`,
          previousValue: `${oldProduct.stock}`,
          newValue: `${product.stock}`,
        });
      }
    }

    broadcastUpdate('PRODUCTS_UPDATED', products);
  }

  static deleteProduct(productId: string, userEmail: string): void {
    const products = this.getProducts();
    const prod = products.find((p) => p.id === productId);
    const filtered = products.filter((p) => p.id !== productId);
    setLocalItem(DB_KEYS.PRODUCTS, filtered);
    rebuildProductIndices(filtered);

    if (prod) {
      this.addAuditLog({
        userEmail,
        actionType: 'PRODUCT_DELETE',
        entityId: prod.sku,
        details: `Deleted product: "${prod.name}" (SKU: ${prod.sku})`,
      });
    }

    broadcastUpdate('PRODUCTS_UPDATED', filtered);
  }

  static batchDeleteProducts(productIds: string[], userEmail?: string): void {
    if (!productIds || productIds.length === 0) return;
    const idSet = new Set(productIds);
    const products = this.getProducts();
    const removed = products.filter((p) => idSet.has(p.id));
    const filtered = products.filter((p) => !idSet.has(p.id));
    setLocalItem(DB_KEYS.PRODUCTS, filtered);
    rebuildProductIndices(filtered);

    if (userEmail && removed.length > 0) {
      this.addAuditLog({
        userEmail,
        actionType: 'STOCK_OVERRIDE',
        entityId: productIds.join(','),
        details: `Batch deleted ${removed.length} product(s): ${removed.slice(0, 5).map((r) => `"${r.name}" (${r.sku})`).join(', ')}${removed.length > 5 ? ` and ${removed.length - 5} more` : ''}`,
      });
    }

    broadcastUpdate('PRODUCTS_UPDATED', filtered);
  }

  // Non-blocking asynchronous batch deletion with step progress notifications
  static async batchDeleteProductsAsync(
    productIds: string[],
    userEmail: string,
    onProgress?: (processed: number, total: number) => void
  ): Promise<void> {
    if (!productIds || productIds.length === 0) return;
    const total = productIds.length;
    const chunkSize = 50; // Process in chunks of 50 to avoid freezing event loop
    const idSet = new Set(productIds);
    let processed = 0;

    for (let i = 0; i < productIds.length; i += chunkSize) {
      processed = Math.min(total, i + chunkSize);
      if (onProgress) {
        onProgress(processed, total);
      }
      // Yield to main UI thread
      await new Promise((res) => setTimeout(res, 10));
    }

    const products = this.getProducts();
    const removed = products.filter((p) => idSet.has(p.id));
    const filtered = products.filter((p) => !idSet.has(p.id));
    setLocalItem(DB_KEYS.PRODUCTS, filtered);
    rebuildProductIndices(filtered);

    if (userEmail && removed.length > 0) {
      this.addAuditLog({
        userEmail,
        actionType: 'STOCK_OVERRIDE',
        entityId: productIds.slice(0, 10).join(','),
        details: `Batch deleted ${removed.length} product(s) via batch engine.`,
      });
    }

    broadcastUpdate('PRODUCTS_UPDATED', filtered);
    if (onProgress) {
      onProgress(total, total);
    }
  }

  // Non-blocking asynchronous batch product updates
  static async batchUpdateProductsAsync(
    updates: Array<Partial<Product> & { id: string }>,
    userEmail: string,
    onProgress?: (processed: number, total: number) => void
  ): Promise<void> {
    if (!updates || updates.length === 0) return;
    const total = updates.length;
    const chunkSize = 50;
    const products = [...this.getProducts()];
    const map = new Map<string, Product>(products.map((p) => [p.id, p]));

    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      for (const item of chunk) {
        const existing = map.get(item.id);
        if (existing) {
          map.set(item.id, {
            ...existing,
            ...item,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      if (onProgress) {
        onProgress(Math.min(total, i + chunkSize), total);
      }
      await new Promise((res) => setTimeout(res, 10));
    }

    const updatedList = Array.from(map.values());
    setLocalItem(DB_KEYS.PRODUCTS, updatedList);
    rebuildProductIndices(updatedList);

    this.addAuditLog({
      userEmail,
      actionType: 'STOCK_OVERRIDE',
      entityId: `BATCH_${total}_ITEMS`,
      details: `Bulk updated ${total} product records (stock / pricing / alerts).`,
    });

    this.enqueuePendingSync({
      type: 'BATCH_PRODUCT_UPDATE',
      summary: `Bulk updated ${total} product(s) in catalog`,
      data: { count: total, timestamp: Date.now() },
    });

    broadcastUpdate('PRODUCTS_UPDATED', updatedList);
    if (onProgress) {
      onProgress(total, total);
    }
  }

  static adjustStock(productId: string, delta: number): void {
    const products = this.getProducts();
    const p = products.find((x) => x.id === productId);
    if (p) {
      p.stock = Math.max(0, p.stock + delta);
      p.updatedAt = new Date().toISOString();
      setLocalItem(DB_KEYS.PRODUCTS, products);
      broadcastUpdate('PRODUCTS_UPDATED', products);
    }
  }

  // SALES & INVOICES
  static getSales(): SaleInvoice[] {
    return getLocalItem<SaleInvoice[]>(DB_KEYS.SALES, []);
  }

  static createSale(sale: SaleInvoice): SaleInvoice {
    const sales = this.getSales();
    sales.unshift(sale);
    setLocalItem(DB_KEYS.SALES, sales);

    // Deduct stock for all items
    const products = this.getProducts();
    for (const item of sale.items) {
      const prod = products.find((p) => p.id === item.product.id);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.updatedAt = new Date().toISOString();
      }
    }
    setLocalItem(DB_KEYS.PRODUCTS, products);

    // If Credit/Udhaar sale linked to customer, update customer balance and ledger
    if (sale.paymentMethod === 'credit' && sale.customerId) {
      this.addCustomerTransaction({
        customerId: sale.customerId,
        type: 'credit_sale',
        referenceId: sale.invoiceNo,
        amount: sale.netTotal,
        notes: `POS Credit Invoice #${sale.invoiceNo} (${sale.items.length} items)`,
        recordedBy: sale.cashierEmail,
      });
    }

    // Update Customer Loyalty Points and Tier if linked
    if (sale.customerId) {
      const customers = this.getCustomers();
      const customer = customers.find((c) => c.id === sale.customerId);
      if (customer) {
        const redeemed = sale.loyaltyPointsRedeemed || 0;
        const earned = sale.loyaltyPointsEarned || 0;

        const currentPoints = customer.loyaltyPoints ?? 0;
        const lifetime = customer.lifetimePoints ?? currentPoints;

        // Deduct redeemed points, add newly earned points
        const updatedPoints = Math.max(0, currentPoints - redeemed + earned);
        const updatedLifetime = lifetime + earned;
        const updatedTier = getCustomerLoyaltyTier(updatedLifetime);

        customer.loyaltyPoints = updatedPoints;
        customer.lifetimePoints = updatedLifetime;
        customer.loyaltyTier = updatedTier;
        customer.updatedAt = new Date().toISOString();

        setLocalItem(DB_KEYS.CUSTOMERS, customers);
        broadcastUpdate('CUSTOMERS_UPDATED', customers);
      }
    }

    broadcastUpdate('SALES_UPDATED', sales);
    broadcastUpdate('PRODUCTS_UPDATED', products);

    // Track pending sync record for reconciliation
    try {
      this.enqueuePendingSync({
        id: sale.id,
        type: 'SALE_INVOICE',
        summary: `Invoice #${sale.invoiceNo} - Rs ${sale.netTotal.toLocaleString()}`,
        data: { id: sale.id, invoiceNo: sale.invoiceNo, netTotal: sale.netTotal, itemsCount: sale.items.length },
      });
    } catch {
      // Ignore
    }

    return sale;
  }

  // CUSTOMERS & LEDGER
  static getCustomers(): Customer[] {
    const list = getLocalItem<Customer[]>(DB_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    return list.map((c) => {
      const lifetime = c.lifetimePoints ?? c.loyaltyPoints ?? 0;
      const tier = c.loyaltyTier || getCustomerLoyaltyTier(lifetime);
      return {
        ...c,
        loyaltyPoints: c.loyaltyPoints ?? 0,
        lifetimePoints: lifetime,
        loyaltyTier: tier,
      };
    });
  }

  static saveCustomer(customer: Customer, userEmail?: string): Customer {
    const customers = this.getCustomers();
    const lifetime = customer.lifetimePoints ?? customer.loyaltyPoints ?? 0;
    const tier = customer.loyaltyTier || getCustomerLoyaltyTier(lifetime);
    const enrichedCustomer: Customer = {
      ...customer,
      loyaltyPoints: customer.loyaltyPoints ?? 0,
      lifetimePoints: lifetime,
      loyaltyTier: tier,
    };

    const idx = customers.findIndex((c) => c.id === customer.id);
    if (idx >= 0) {
      customers[idx] = { ...enrichedCustomer, updatedAt: new Date().toISOString() };
    } else {
      customers.unshift({
        ...enrichedCustomer,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setLocalItem(DB_KEYS.CUSTOMERS, customers);
    broadcastUpdate('CUSTOMERS_UPDATED', customers);
    return enrichedCustomer;
  }

  static getCustomerLedger(customerId: string): CustomerLedgerEntry[] {
    const all = getLocalItem<CustomerLedgerEntry[]>(DB_KEYS.LEDGER, []);
    return all.filter((l) => l.customerId === customerId).sort((a, b) => b.timestamp - a.timestamp);
  }

  static addCustomerTransaction(entry: {
    customerId: string;
    type: 'credit_sale' | 'payment_received' | 'return_credit';
    referenceId?: string;
    amount: number;
    paymentMethod?: string;
    notes?: string;
    recordedBy: string;
  }): CustomerLedgerEntry {
    const customers = this.getCustomers();
    const customer = customers.find((c) => c.id === entry.customerId);
    if (!customer) throw new Error('Customer not found');

    const isDebit = entry.type === 'credit_sale';
    const debit = isDebit ? entry.amount : 0;
    const credit = !isDebit ? entry.amount : 0;

    const previousBalance = customer.currentBalance;
    const runningBalance = previousBalance + debit - credit;
    customer.currentBalance = runningBalance;
    customer.updatedAt = new Date().toISOString();
    setLocalItem(DB_KEYS.CUSTOMERS, customers);

    const allLedger = getLocalItem<CustomerLedgerEntry[]>(DB_KEYS.LEDGER, []);
    const newEntry: CustomerLedgerEntry = {
      id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerId: entry.customerId,
      date: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      timestamp: Date.now(),
      type: entry.type,
      referenceId: entry.referenceId,
      debit,
      credit,
      runningBalance,
      paymentMethod: entry.paymentMethod,
      notes: entry.notes,
      recordedBy: entry.recordedBy,
    };

    allLedger.unshift(newEntry);
    setLocalItem(DB_KEYS.LEDGER, allLedger);

    broadcastUpdate('CUSTOMERS_UPDATED', customers);
    broadcastUpdate('LEDGER_UPDATED', allLedger);
    return newEntry;
  }

  static deleteCustomer(customerId: string, userEmail?: string): void {
    const customers = this.getCustomers();
    const cust = customers.find((c) => c.id === customerId);
    const filtered = customers.filter((c) => c.id !== customerId);
    setLocalItem(DB_KEYS.CUSTOMERS, filtered);

    // Also remove customer ledger
    const allLedger = getLocalItem<CustomerLedgerEntry[]>(DB_KEYS.LEDGER, []);
    const filteredLedger = allLedger.filter((l) => l.customerId !== customerId);
    setLocalItem(DB_KEYS.LEDGER, filteredLedger);

    if (userEmail && cust) {
      this.addAuditLog({
        userEmail,
        actionType: 'CUSTOMER_DELETE' as any,
        entityId: cust.name,
        details: `Deleted customer account: "${cust.name}" (Phone: ${cust.phone})`,
      });
    }

    broadcastUpdate('CUSTOMERS_UPDATED', filtered);
    broadcastUpdate('LEDGER_UPDATED', filteredLedger);
  }

  static batchDeleteCustomers(customerIds: string[], userEmail?: string): void {
    if (!customerIds || customerIds.length === 0) return;
    const customers = this.getCustomers();
    const removed = customers.filter((c) => customerIds.includes(c.id));
    const filtered = customers.filter((c) => !customerIds.includes(c.id));
    setLocalItem(DB_KEYS.CUSTOMERS, filtered);

    const allLedger = getLocalItem<CustomerLedgerEntry[]>(DB_KEYS.LEDGER, []);
    const filteredLedger = allLedger.filter((l) => !customerIds.includes(l.customerId));
    setLocalItem(DB_KEYS.LEDGER, filteredLedger);

    if (userEmail && removed.length > 0) {
      this.addAuditLog({
        userEmail,
        actionType: 'CUSTOMER_DELETE' as any,
        entityId: customerIds.join(','),
        details: `Batch deleted ${removed.length} customer account(s): ${removed.map((c) => c.name).join(', ')}`,
      });
    }

    broadcastUpdate('CUSTOMERS_UPDATED', filtered);
    broadcastUpdate('LEDGER_UPDATED', filteredLedger);
  }

  static deleteCustomerLedgerEntry(entryId: string, userEmail?: string): void {
    const allLedger = getLocalItem<CustomerLedgerEntry[]>(DB_KEYS.LEDGER, []);
    const targetEntry = allLedger.find((l) => l.id === entryId);
    if (!targetEntry) return;

    const filteredLedger = allLedger.filter((l) => l.id !== entryId);
    setLocalItem(DB_KEYS.LEDGER, filteredLedger);

    // Recompute the customer's balance from remaining ledger entries
    const customers = this.getCustomers();
    const customer = customers.find((c) => c.id === targetEntry.customerId);
    if (customer) {
      const customerEntries = filteredLedger
        .filter((l) => l.customerId === customer.id)
        .sort((a, b) => a.timestamp - b.timestamp);

      let running = 0;
      for (const e of customerEntries) {
        running = running + (e.debit || 0) - (e.credit || 0);
        e.runningBalance = running;
      }
      customer.currentBalance = running;
      customer.updatedAt = new Date().toISOString();
      setLocalItem(DB_KEYS.CUSTOMERS, customers);
      setLocalItem(DB_KEYS.LEDGER, filteredLedger);
      broadcastUpdate('CUSTOMERS_UPDATED', customers);
    }

    if (userEmail) {
      this.addAuditLog({
        userEmail,
        actionType: 'LEDGER_ENTRY_DELETE' as any,
        entityId: entryId,
        details: `Deleted Khata ledger entry (${targetEntry.type}) of Rs ${targetEntry.debit || targetEntry.credit} for customer #${targetEntry.customerId}`,
      });
    }

    broadcastUpdate('LEDGER_UPDATED', filteredLedger);
  }

  static batchDeleteCustomerLedgerEntries(entryIds: string[], userEmail?: string): void {
    if (!entryIds || entryIds.length === 0) return;
    const allLedger = getLocalItem<CustomerLedgerEntry[]>(DB_KEYS.LEDGER, []);
    const targetEntries = allLedger.filter((l) => entryIds.includes(l.id));
    const filteredLedger = allLedger.filter((l) => !entryIds.includes(l.id));
    setLocalItem(DB_KEYS.LEDGER, filteredLedger);

    // Recompute balances for affected customers
    const affectedCustomerIds = Array.from(new Set(targetEntries.map((e) => e.customerId)));
    const customers = this.getCustomers();

    for (const custId of affectedCustomerIds) {
      const customer = customers.find((c) => c.id === custId);
      if (customer) {
        const customerEntries = filteredLedger
          .filter((l) => l.customerId === custId)
          .sort((a, b) => a.timestamp - b.timestamp);

        let running = 0;
        for (const e of customerEntries) {
          running = running + (e.debit || 0) - (e.credit || 0);
          e.runningBalance = running;
        }
        customer.currentBalance = running;
        customer.updatedAt = new Date().toISOString();
      }
    }

    setLocalItem(DB_KEYS.CUSTOMERS, customers);
    setLocalItem(DB_KEYS.LEDGER, filteredLedger);

    if (userEmail && targetEntries.length > 0) {
      this.addAuditLog({
        userEmail,
        actionType: 'LEDGER_ENTRY_DELETE' as any,
        entityId: entryIds.join(','),
        details: `Batch deleted ${targetEntries.length} ledger entry(ies) across ${affectedCustomerIds.length} customer(s)`,
      });
    }

    broadcastUpdate('CUSTOMERS_UPDATED', customers);
    broadcastUpdate('LEDGER_UPDATED', filteredLedger);
  }

  // SUPPLIERS & PURCHASES
  static getSuppliers(): Supplier[] {
    const raw = getLocalItem<Supplier[]>(DB_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    return (raw || []).map((s) => {
      const companyName = s.companyName || s.name || s.company || 'Unnamed Supplier';
      const category = s.category || s.categorySupplied || 'General';
      return {
        ...s,
        name: s.name || companyName,
        company: s.company || companyName,
        companyName,
        category,
        categorySupplied: s.categorySupplied || category,
        contactPerson: s.contactPerson || '',
        phone: s.phone || '',
        balancePayable: Number(s.balancePayable) || 0,
        totalPurchased: Number(s.totalPurchased) || 0,
        totalPaid: Number(s.totalPaid) || 0,
      };
    });
  }

  static saveSupplier(supplier: Supplier): Supplier {
    const suppliers = this.getSuppliers();
    const companyName = supplier.companyName || supplier.name || supplier.company || 'Unnamed Supplier';
    const category = supplier.category || supplier.categorySupplied || 'General';
    const normalizedSupplier: Supplier = {
      ...supplier,
      companyName,
      name: supplier.name || companyName,
      company: supplier.company || companyName,
      category,
      categorySupplied: supplier.categorySupplied || category,
      balancePayable: Number(supplier.balancePayable) || 0,
      totalPurchased: Number(supplier.totalPurchased) || 0,
      totalPaid: Number(supplier.totalPaid) || 0,
    };
    const idx = suppliers.findIndex((s) => s.id === supplier.id);
    if (idx >= 0) {
      suppliers[idx] = normalizedSupplier;
    } else {
      suppliers.unshift(normalizedSupplier);
    }
    setLocalItem(DB_KEYS.SUPPLIERS, suppliers);
    broadcastUpdate('SUPPLIERS_UPDATED', suppliers);
    return normalizedSupplier;
  }

  static deleteSupplier(supplierId: string, userEmail?: string): void {
    const suppliers = this.getSuppliers();
    const sup = suppliers.find((s) => s.id === supplierId);
    const filtered = suppliers.filter((s) => s.id !== supplierId);
    setLocalItem(DB_KEYS.SUPPLIERS, filtered);

    if (userEmail && sup) {
      const displayName = sup.companyName || sup.name || sup.company || 'Supplier';
      this.addAuditLog({
        userEmail,
        actionType: 'SUPPLIER_DELETE' as any,
        entityId: displayName,
        details: `Deleted supplier account: "${displayName}"`,
      });
    }

    broadcastUpdate('SUPPLIERS_UPDATED', filtered);
  }

  static getPurchases(): PurchaseOrder[] {
    const raw = getLocalItem<PurchaseOrder[]>(DB_KEYS.PURCHASES, INITIAL_PURCHASES);
    return (raw || []).map((p) => ({
      ...p,
      purchaseNo: p.purchaseNo || 'PUR-ORD',
      supplierName: p.supplierName || 'Unknown Vendor',
      items: p.items || [],
      totalAmount: Number(p.totalAmount) || 0,
      paidAmount: Number(p.paidAmount) || 0,
      date: p.date || new Date().toLocaleDateString(),
    }));
  }

  static deletePurchase(purchaseId: string, userEmail?: string): void {
    const purchases = this.getPurchases();
    const order = purchases.find((p) => p.id === purchaseId);
    if (!order) return;

    const filtered = purchases.filter((p) => p.id !== purchaseId);
    setLocalItem(DB_KEYS.PURCHASES, filtered);

    // Rollback supplier balance
    const suppliers = this.getSuppliers();
    const supp = suppliers.find((s) => s.id === order.supplierId);
    if (supp) {
      supp.totalPurchased = Math.max(0, supp.totalPurchased - order.totalAmount);
      supp.totalPaid = Math.max(0, supp.totalPaid - order.paidAmount);
      supp.balancePayable = Math.max(0, supp.totalPurchased - supp.totalPaid);
      setLocalItem(DB_KEYS.SUPPLIERS, suppliers);
      broadcastUpdate('SUPPLIERS_UPDATED', suppliers);
    }

    if (userEmail) {
      this.addAuditLog({
        userEmail,
        actionType: 'PURCHASE_DELETE' as any,
        entityId: order.purchaseNo,
        details: `Deleted Stock Inward / Purchase Order #${order.purchaseNo} (Rs ${order.totalAmount})`,
      });
    }

    broadcastUpdate('PURCHASES_UPDATED', filtered);
  }

  static batchDeleteSuppliers(supplierIds: string[], userEmail?: string): void {
    if (!supplierIds || supplierIds.length === 0) return;
    const idSet = new Set(supplierIds);
    const suppliers = this.getSuppliers();
    const removed = suppliers.filter((s) => idSet.has(s.id));
    const filtered = suppliers.filter((s) => !idSet.has(s.id));
    setLocalItem(DB_KEYS.SUPPLIERS, filtered);

    if (userEmail && removed.length > 0) {
      this.addAuditLog({
        userEmail,
        actionType: 'SUPPLIER_DELETE' as any,
        entityId: supplierIds.join(','),
        details: `Batch deleted ${removed.length} supplier account(s): ${removed.map((s) => s.companyName || s.name || 'Supplier').join(', ')}`,
      });
    }

    broadcastUpdate('SUPPLIERS_UPDATED', filtered);
  }

  static batchDeletePurchases(purchaseIds: string[], userEmail?: string): void {
    if (!purchaseIds || purchaseIds.length === 0) return;
    const idSet = new Set(purchaseIds);
    const purchases = this.getPurchases();
    const removed = purchases.filter((p) => idSet.has(p.id));
    const filtered = purchases.filter((p) => !idSet.has(p.id));
    setLocalItem(DB_KEYS.PURCHASES, filtered);

    // Rollback affected suppliers balances in one pass
    const suppliers = this.getSuppliers();
    for (const order of removed) {
      const supp = suppliers.find((s) => s.id === order.supplierId);
      if (supp) {
        supp.totalPurchased = Math.max(0, supp.totalPurchased - order.totalAmount);
        supp.totalPaid = Math.max(0, supp.totalPaid - order.paidAmount);
        supp.balancePayable = Math.max(0, supp.totalPurchased - supp.totalPaid);
      }
    }
    setLocalItem(DB_KEYS.SUPPLIERS, suppliers);

    if (userEmail && removed.length > 0) {
      this.addAuditLog({
        userEmail,
        actionType: 'PURCHASE_DELETE' as any,
        entityId: purchaseIds.join(','),
        details: `Batch deleted ${removed.length} purchase inward order(s) totaling Rs ${removed.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}`,
      });
    }

    broadcastUpdate('PURCHASES_UPDATED', filtered);
    broadcastUpdate('SUPPLIERS_UPDATED', suppliers);
  }

  static deleteReturn(returnId: string, userEmail?: string): void {
    const returns = this.getReturns();
    const ret = returns.find((r) => r.id === returnId);
    if (!ret) return;

    const filtered = returns.filter((r) => r.id !== returnId);
    setLocalItem(DB_KEYS.RETURNS, filtered);

    if (userEmail) {
      this.addAuditLog({
        userEmail,
        actionType: 'RETURN_DELETE' as any,
        entityId: ret.returnNo,
        details: `Deleted Return Credit Note #${ret.returnNo} (Invoice #${ret.originalInvoiceNo})`,
      });
    }

    broadcastUpdate('RETURNS_UPDATED', filtered);
  }

  static recordPurchase(order: PurchaseOrder, userEmail: string): PurchaseOrder {
    const purchases = this.getPurchases();
    purchases.unshift(order);
    setLocalItem(DB_KEYS.PURCHASES, purchases);

    // Update stock and cost prices for inventory
    const products = this.getProducts();
    for (const item of order.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock += item.quantity;
        prod.costPrice = item.costPrice; // update latest purchase cost
        prod.updatedAt = new Date().toISOString();
      }
    }
    setLocalItem(DB_KEYS.PRODUCTS, products);

    // Update supplier balance
    const suppliers = this.getSuppliers();
    const supp = suppliers.find((s) => s.id === order.supplierId);
    if (supp) {
      supp.totalPurchased += order.totalAmount;
      supp.totalPaid += order.paidAmount;
      supp.balancePayable = supp.totalPurchased - supp.totalPaid;
      setLocalItem(DB_KEYS.SUPPLIERS, suppliers);
    }

    this.addAuditLog({
      userEmail,
      actionType: 'STOCK_OVERRIDE',
      entityId: order.purchaseNo,
      details: `Inward stock received via Purchase #${order.purchaseNo} from "${order.supplierName}". Total: Rs ${order.totalAmount}`,
    });

    broadcastUpdate('PURCHASES_UPDATED', purchases);
    broadcastUpdate('PRODUCTS_UPDATED', products);
    broadcastUpdate('SUPPLIERS_UPDATED', suppliers);
    return order;
  }

  // RETURNS ENGINE
  static getReturns(): SaleReturn[] {
    return getLocalItem<SaleReturn[]>(DB_KEYS.RETURNS, []);
  }

  static processReturn(returnData: SaleReturn, userEmail: string): SaleReturn {
    const returns = this.getReturns();
    returns.unshift(returnData);
    setLocalItem(DB_KEYS.RETURNS, returns);

    // Restock items to inventory if selected
    const products = this.getProducts();
    let stockUpdatedCount = 0;

    for (const item of returnData.items || []) {
      const pId = item.productId || item.product?.id || (item as any).id;
      const qty = Number(item.returnedQty ?? item.returnedQuantity ?? item.quantity ?? 0);
      const isRestockOption =
        item.restockOption === 'return_to_stock' ||
        item.restockOption === 'restock' ||
        returnData.restockedToInventory === true;

      if (pId && qty > 0 && isRestockOption) {
        const prod = products.find((p) => p.id === pId);
        if (prod) {
          prod.stock = Number(prod.stock || 0) + qty;
          prod.updatedAt = new Date().toISOString();
          stockUpdatedCount++;
        }
      }
    }

    if (stockUpdatedCount > 0) {
      setLocalItem(DB_KEYS.PRODUCTS, products);
      rebuildProductIndices(products);
    }

    // If refund settled to Credit Khata, credit customer's ledger
    const totalRefund = returnData.totalRefundAmount || returnData.refundAmount || 0;
    const settlementMethod = returnData.refundSettlement || returnData.refundMethod;
    if ((settlementMethod === 'credit_khata' || settlementMethod === 'khata_credit') && returnData.customerId) {
      this.addCustomerTransaction({
        customerId: returnData.customerId,
        type: 'return_credit',
        referenceId: returnData.returnNo || returnData.invoiceNo,
        amount: totalRefund,
        notes: `Refund credit note for Return #${returnData.returnNo || returnData.invoiceNo} (Invoice #${returnData.originalInvoiceNo})`,
        recordedBy: userEmail,
      });
    }

    // Update original invoice status
    const sales = this.getSales();
    const inv = sales.find((s) => s.invoiceNo === returnData.originalInvoiceNo || s.id === returnData.originalInvoiceId);
    if (inv) {
      inv.status = 'returned';
      setLocalItem(DB_KEYS.SALES, sales);
    }

    this.addAuditLog({
      userEmail,
      actionType: 'RETURN_PROCESSED',
      entityId: returnData.returnNo || returnData.invoiceNo,
      details: `Return processed: #${returnData.returnNo || returnData.invoiceNo} for Invoice #${returnData.originalInvoiceNo}. Restocked ${stockUpdatedCount} product line(s). Refund Rs ${totalRefund}`,
    });

    broadcastUpdate('RETURNS_UPDATED', returns);
    broadcastUpdate('PRODUCTS_UPDATED', products);
    broadcastUpdate('SALES_UPDATED', sales);
    return returnData;
  }

  // EXPENSES
  static getExpenses(): Expense[] {
    return getLocalItem<Expense[]>(DB_KEYS.EXPENSES, INITIAL_EXPENSES);
  }

  static addExpense(expense: Expense): Expense {
    const expenses = this.getExpenses();
    expenses.unshift(expense);
    setLocalItem(DB_KEYS.EXPENSES, expenses);
    broadcastUpdate('EXPENSES_UPDATED', expenses);
    return expense;
  }

  static deleteExpense(expenseId: string, userEmail?: string): void {
    const expenses = this.getExpenses();
    const exp = expenses.find((e) => e.id === expenseId);
    const filtered = expenses.filter((e) => e.id !== expenseId);
    setLocalItem(DB_KEYS.EXPENSES, filtered);

    if (userEmail && exp) {
      this.addAuditLog({
        userEmail,
        actionType: 'EXPENSE_DELETE' as any,
        entityId: expenseId,
        details: `Deleted expense: "${exp.category}" of Rs ${exp.amount} (${exp.paymentMethod})`,
      });
    }

    broadcastUpdate('EXPENSES_UPDATED', filtered);
  }

  // DAILY CLOSING (Z-REPORT)
  static getClosingReports(): DailyClosingReport[] {
    return getLocalItem<DailyClosingReport[]>(DB_KEYS.CLOSING_REPORTS, []);
  }

  static saveClosingReport(report: DailyClosingReport, userEmail: string): DailyClosingReport {
    const reports = this.getClosingReports();
    reports.unshift(report);
    setLocalItem(DB_KEYS.CLOSING_REPORTS, reports);
    setLocalItem(DB_KEYS.LAST_CLOSING, report);

    this.addAuditLog({
      userEmail,
      actionType: 'Z_REPORT_CLOSED',
      entityId: report.date,
      details: `Daily Z-Report closed on ${report.date}. Expected: Rs ${report.expectedCash}, Actual: Rs ${report.actualCash}, Diff: Rs ${report.discrepancy}`,
    });

    broadcastUpdate('CLOSING_REPORTS_UPDATED', reports);
    return report;
  }

  static getLastClosing(): DailyClosingReport | null {
    return getLocalItem<DailyClosingReport | null>(DB_KEYS.LAST_CLOSING, null);
  }

  // AUDIT LOGS
  static getAuditLogs(): AuditLog[] {
    return getLocalItem<AuditLog[]>(DB_KEYS.AUDIT_LOGS, []);
  }

  static addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Keep last 500 audit entries
    if (logs.length > 500) logs.length = 500;
    setLocalItem(DB_KEYS.AUDIT_LOGS, logs);
    broadcastUpdate('AUDIT_LOGS_UPDATED', logs);
  }

  // SETTINGS
  static getSettings(): ShopSettings {
    return getLocalItem<ShopSettings>(DB_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  static saveSettings(settings: ShopSettings): void {
    setLocalItem(DB_KEYS.SETTINGS, settings);
    broadcastUpdate('SETTINGS_UPDATED', settings);
  }

  /**
   * Unified deleteRecord method for removing single or batch entities with audit trail logging
   */
  static deleteRecord(
    entityType: 'products' | 'sales' | 'customers' | 'ledger' | 'suppliers' | 'purchases' | 'expenses' | 'returns',
    idOrIds: string | string[],
    userEmail?: string
  ): void {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    if (ids.length === 0) return;

    switch (entityType) {
      case 'products': {
        this.batchDeleteProducts(ids, userEmail);
        break;
      }
      case 'expenses': {
        const expenses = this.getExpenses();
        const removed = expenses.filter((e) => ids.includes(e.id));
        const filtered = expenses.filter((e) => !ids.includes(e.id));
        setLocalItem(DB_KEYS.EXPENSES, filtered);
        if (userEmail && removed.length > 0) {
          const totalAmt = removed.reduce((sum, r) => sum + r.amount, 0);
          this.addAuditLog({
            userEmail,
            actionType: 'EXPENSE_DELETE' as any,
            entityId: ids.join(','),
            details: `Deleted ${removed.length} expense record(s) totaling Rs ${totalAmt}: ${removed.map((r) => r.description || r.category).join(', ')}`,
          });
        }
        broadcastUpdate('EXPENSES_UPDATED', filtered);
        break;
      }
      case 'returns': {
        const returns = this.getReturns();
        const removed = returns.filter((r) => ids.includes(r.id));
        const filtered = returns.filter((r) => !ids.includes(r.id));
        setLocalItem(DB_KEYS.RETURNS, filtered);
        if (userEmail && removed.length > 0) {
          this.addAuditLog({
            userEmail,
            actionType: 'RETURN_DELETE' as any,
            entityId: ids.join(','),
            details: `Deleted ${removed.length} Return Credit Note(s): ${removed.map((r) => `#${r.returnNo || r.invoiceNo}`).join(', ')}`,
          });
        }
        broadcastUpdate('RETURNS_UPDATED', filtered);
        break;
      }
      case 'customers': {
        this.batchDeleteCustomers(ids, userEmail);
        break;
      }
      case 'ledger': {
        this.batchDeleteCustomerLedgerEntries(ids, userEmail);
        break;
      }
      case 'suppliers': {
        this.batchDeleteSuppliers(ids, userEmail);
        break;
      }
      case 'purchases': {
        this.batchDeletePurchases(ids, userEmail);
        break;
      }
      case 'sales': {
        const sales = this.getSales();
        const removed = sales.filter((s) => ids.includes(s.id));
        const filtered = sales.filter((s) => !ids.includes(s.id));
        setLocalItem(DB_KEYS.SALES, filtered);
        if (userEmail && removed.length > 0) {
          this.addAuditLog({
            userEmail,
            actionType: 'SALE_DELETE' as any,
            entityId: ids.join(','),
            details: `Voided/Deleted ${removed.length} sale invoice(s): ${removed.map((s) => `#${s.invoiceNo}`).join(', ')}`,
          });
        }
        broadcastUpdate('SALES_UPDATED', filtered);
        break;
      }
    }
  }

  // USERS & ROLES
  static getUsers(): UserProfile[] {
    return getLocalItem<UserProfile[]>(DB_KEYS.USERS, [INITIAL_USER]);
  }

  static saveUser(user: UserProfile, adminEmail: string): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.uid === user.uid || u.email === user.email);
    if (idx >= 0) {
      const old = users[idx];
      users[idx] = user;
      if (old.role !== user.role) {
        this.addAuditLog({
          userEmail: adminEmail,
          actionType: 'ROLE_CHANGE',
          entityId: user.email,
          details: `Role updated for user "${user.displayName || user.email}" from ${old.role} to ${user.role}`,
          previousValue: old.role,
          newValue: user.role,
        });
      }
    } else {
      users.push(user);
    }
    setLocalItem(DB_KEYS.USERS, users);
    broadcastUpdate('USERS_UPDATED', users);
  }

  static getCurrentUser(): UserProfile {
    return getLocalItem<UserProfile>(DB_KEYS.CURRENT_USER, INITIAL_USER);
  }

  static setCurrentUser(user: UserProfile): void {
    setLocalItem(DB_KEYS.CURRENT_USER, user);
    broadcastUpdate('CURRENT_USER_UPDATED', user);
  }

  static isSessionLocked(): boolean {
    return getLocalItem<boolean>(DB_KEYS.SESSION_LOCKED, false);
  }

  static setSessionLocked(locked: boolean): void {
    setLocalItem(DB_KEYS.SESSION_LOCKED, locked);
    broadcastUpdate('SESSION_LOCK_UPDATED', locked);
  }

  static getUserPins(): Record<string, string> {
    const defaultPins: Record<string, string> = {
      'admin-sajjad-01': '1234',
      'staff-01': '0000',
    };
    return getLocalItem<Record<string, string>>(DB_KEYS.PIN_CREDENTIALS, defaultPins);
  }

  static setUserPin(uid: string, pin: string): void {
    const pins = this.getUserPins();
    pins[uid] = pin;
    setLocalItem(DB_KEYS.PIN_CREDENTIALS, pins);
  }

  static verifyUserPin(uid: string, pin: string): boolean {
    const pins = this.getUserPins();
    const correctPin = pins[uid] || (uid.includes('admin') ? '1234' : '0000');
    return correctPin === pin.trim();
  }

  static recordAuthEvent(
    action: 'LOGIN' | 'LOGOUT' | 'LOCK',
    user: UserProfile,
    method: string = 'Credentials'
  ): void {
    const actionLabel =
      action === 'LOGIN'
        ? 'User Logged In'
        : action === 'LOGOUT'
        ? 'User Logged Out'
        : 'Terminal Locked';

    this.addAuditLog({
      userEmail: user.email,
      actionType: action === 'LOGIN' ? 'ROLE_CHANGE' : 'ROLE_CHANGE',
      entityId: user.uid,
      details: `${actionLabel}: ${user.displayName} (${user.role}) via ${method}`,
      newValue: action,
    });
  }

  static getTheme(): 'dark' | 'light' {
    return getLocalItem<'dark' | 'light'>(DB_KEYS.THEME_MODE, 'dark');
  }

  static setTheme(theme: 'dark' | 'light'): void {
    setLocalItem(DB_KEYS.THEME_MODE, theme);
    broadcastUpdate('THEME_MODE_UPDATED', theme);
  }

  // DATABASE SNAPSHOT BACKUP, AUTOMATED DAILY TRIGGER & RESTORE
  static exportFullBackup(): string {
    const snapshot = {
      version: '1.0.0',
      appName: 'New Sajjad Zari Corporation POS',
      exportDate: new Date().toISOString(),
      data: {
        products: this.getProducts(),
        sales: this.getSales(),
        customers: this.getCustomers(),
        ledger: getLocalItem(DB_KEYS.LEDGER, []),
        suppliers: this.getSuppliers(),
        purchases: this.getPurchases(),
        returns: this.getReturns(),
        expenses: this.getExpenses(),
        closingReports: this.getClosingReports(),
        auditLogs: this.getAuditLogs(),
        settings: this.getSettings(),
        users: this.getUsers(),
      },
    };
    return JSON.stringify(snapshot, null, 2);
  }

  /**
   * Automated Daily Backup Trigger: Automatically takes a browser snapshot backup
   * once per calendar day on app startup, preserving rolling daily snapshots.
   */
  static runAutomatedDailyBackup(): { triggered: boolean; backupDate: string; totalRecords: number } {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const lastBackupDate = getLocalItem<string | null>(DB_KEYS.LAST_BACKUP_DATE, null);

      const products = this.getProducts();
      const sales = this.getSales();
      const customers = this.getCustomers();
      const ledger = getLocalItem<unknown[]>(DB_KEYS.LEDGER, []);
      const suppliers = this.getSuppliers();
      const purchases = this.getPurchases();
      const expenses = this.getExpenses();
      const returns = this.getReturns();

      const totalRecords =
        products.length +
        sales.length +
        customers.length +
        ledger.length +
        suppliers.length +
        purchases.length +
        expenses.length +
        returns.length;

      // If already backed up today, return status
      if (lastBackupDate === today) {
        return { triggered: false, backupDate: today, totalRecords };
      }

      const backupData = {
        version: '1.0.0',
        backupId: `auto-daily-${today}`,
        backupType: 'AUTOMATED_DAILY',
        date: today,
        timestamp: Date.now(),
        totalRecords,
        counts: {
          products: products.length,
          sales: sales.length,
          customers: customers.length,
          ledger: ledger.length,
          suppliers: suppliers.length,
          purchases: purchases.length,
          expenses: expenses.length,
          returns: returns.length,
        },
        payload: {
          products,
          sales,
          customers,
          ledger,
          suppliers,
          purchases,
          returns,
          expenses,
          closingReports: this.getClosingReports(),
          auditLogs: this.getAuditLogs(),
          settings: this.getSettings(),
          users: this.getUsers(),
        },
      };

      // Store in rolling snapshots
      const settings = this.getSettings();
      const retentionDays = settings.backupRetentionDays || 30;
      const existingSnapshots = getLocalItem<any[]>(DB_KEYS.DAILY_BACKUPS, []);
      const updatedSnapshots = [
        backupData,
        ...existingSnapshots.filter((s) => s.date !== today),
      ];

      setLocalItem(DB_KEYS.DAILY_BACKUPS, updatedSnapshots);
      setLocalItem(DB_KEYS.LAST_BACKUP_DATE, today);

      // Automatically purge backups older than retention period (e.g. 30 or 60 days)
      this.purgeOldBackupSnapshots(retentionDays);

      this.addAuditLog({
        userEmail: 'system-scheduler@sajjadzari.com',
        actionType: 'DATABASE_BACKUP' as any,
        entityId: `DAILY-${today}`,
        details: `Automated Daily Backup snapshot executed successfully. ${totalRecords} records archived across 8 tables.`,
      });

      return { triggered: true, backupDate: today, totalRecords };
    } catch (err) {
      console.warn('Automated daily backup encountered a non-fatal error:', err);
      return { triggered: false, backupDate: new Date().toISOString().slice(0, 10), totalRecords: 0 };
    }
  }

  static purgeOldBackupSnapshots(retentionDays?: number): number {
    const settings = this.getSettings();
    const daysToKeep = retentionDays || settings.backupRetentionDays || 30;
    const nowMs = Date.now();
    const cutoffMs = nowMs - daysToKeep * 24 * 60 * 60 * 1000;

    const snapshots = getLocalItem<any[]>(DB_KEYS.DAILY_BACKUPS, []);
    const initialCount = snapshots.length;

    const filtered = snapshots.filter((s) => {
      const snapMs = s.timestamp || (s.date ? new Date(s.date).getTime() : 0);
      return snapMs >= cutoffMs;
    });

    const deletedCount = initialCount - filtered.length;
    if (deletedCount > 0) {
      setLocalItem(DB_KEYS.DAILY_BACKUPS, filtered);
      this.addAuditLog({
        userEmail: 'system-scheduler@sajjadzari.com',
        actionType: 'DATABASE_BACKUP' as any,
        entityId: 'PURGE-BACKUPS',
        details: `Purged ${deletedCount} backup snapshot(s) older than ${daysToKeep} days.`,
      });
    }
    return deletedCount;
  }

  static getDailyBackupSnapshots(): Array<{
    backupId: string;
    backupType: string;
    date: string;
    timestamp: number;
    totalRecords: number;
    counts: Record<string, number>;
    payload: any;
  }> {
    return getLocalItem(DB_KEYS.DAILY_BACKUPS, []);
  }

  /**
   * Generates a complete standard SQLite / SQL DDL & DML export script
   */
  static exportSQLiteDump(): string {
    const products = this.getProducts();
    const sales = this.getSales();
    const customers = this.getCustomers();
    const suppliers = this.getSuppliers();
    const purchases = this.getPurchases();
    const expenses = this.getExpenses();
    const ledger = getLocalItem<any[]>(DB_KEYS.LEDGER, []);
    const settings = this.getSettings();

    const escapeSql = (str: any) => {
      if (str === null || str === undefined) return 'NULL';
      if (typeof str === 'number') return str;
      if (typeof str === 'boolean') return str ? 1 : 0;
      return `'${String(str).replace(/'/g, "''")}'`;
    };

    const lines: string[] = [
      `-- ==========================================================`,
      `-- New Sajjad Zari Corporation - SQLite & SQL Database Dump`,
      `-- Generated: ${new Date().toISOString()}`,
      `-- Application: Point of Sale & Khata Ledger Engine`,
      `-- ==========================================================`,
      `PRAGMA foreign_keys = OFF;`,
      `BEGIN TRANSACTION;`,
      ``,
      `-- 1. PRODUCTS TABLE`,
      `CREATE TABLE IF NOT EXISTS products (`,
      `  id TEXT PRIMARY KEY,`,
      `  name TEXT NOT NULL,`,
      `  urdu_name TEXT,`,
      `  sku TEXT UNIQUE NOT NULL,`,
      `  barcode TEXT,`,
      `  category TEXT,`,
      `  cost_price REAL NOT NULL,`,
      `  selling_price REAL NOT NULL,`,
      `  stock REAL NOT NULL,`,
      `  unit TEXT DEFAULT 'piece',`,
      `  min_stock_alert REAL DEFAULT 10,`,
      `  notes TEXT,`,
      `  created_at TEXT`,
      `);`,
    ];

    products.forEach((p) => {
      lines.push(
        `INSERT INTO products (id, name, urdu_name, sku, barcode, category, cost_price, selling_price, stock, unit, min_stock_alert, notes, created_at) VALUES (${escapeSql(p.id)}, ${escapeSql(p.name)}, ${escapeSql(p.urduName)}, ${escapeSql(p.sku)}, ${escapeSql(p.barcode)}, ${escapeSql(p.category)}, ${p.costPrice || 0}, ${p.sellingPrice || 0}, ${p.stock || 0}, ${escapeSql(p.unit)}, ${p.minStockAlert || 5}, ${escapeSql(p.notes)}, ${escapeSql(p.createdAt || new Date().toISOString())});`
      );
    });

    lines.push(``, `-- 2. CUSTOMERS TABLE`);
    lines.push(`CREATE TABLE IF NOT EXISTS customers (`);
    lines.push(`  id TEXT PRIMARY KEY,`);
    lines.push(`  name TEXT NOT NULL,`);
    lines.push(`  phone TEXT NOT NULL,`);
    lines.push(`  shop_name TEXT,`);
    lines.push(`  address TEXT,`);
    lines.push(`  credit_limit REAL DEFAULT 50000,`);
    lines.push(`  current_balance REAL DEFAULT 0,`);
    lines.push(`  loyalty_points INTEGER DEFAULT 0,`);
    lines.push(`  created_at TEXT`);
    lines.push(`);`);

    customers.forEach((c) => {
      lines.push(
        `INSERT INTO customers (id, name, phone, shop_name, address, credit_limit, current_balance, loyalty_points, created_at) VALUES (${escapeSql(c.id)}, ${escapeSql(c.name)}, ${escapeSql(c.phone)}, ${escapeSql(c.shopName)}, ${escapeSql(c.address)}, ${c.creditLimit || 50000}, ${c.currentBalance || 0}, ${c.loyaltyPoints || 0}, ${escapeSql(c.createdAt || new Date().toISOString())});`
      );
    });

    lines.push(``, `-- 3. SUPPLIERS TABLE`);
    lines.push(`CREATE TABLE IF NOT EXISTS suppliers (`);
    lines.push(`  id TEXT PRIMARY KEY,`);
    lines.push(`  name TEXT NOT NULL,`);
    lines.push(`  company_name TEXT NOT NULL,`);
    lines.push(`  phone TEXT NOT NULL,`);
    lines.push(`  category TEXT,`);
    lines.push(`  balance_payable REAL DEFAULT 0,`);
    lines.push(`  created_at TEXT`);
    lines.push(`);`);

    suppliers.forEach((s) => {
      lines.push(
        `INSERT INTO suppliers (id, name, company_name, phone, category, balance_payable, created_at) VALUES (${escapeSql(s.id)}, ${escapeSql(s.name)}, ${escapeSql(s.companyName)}, ${escapeSql(s.phone)}, ${escapeSql(s.category)}, ${s.balancePayable || 0}, ${escapeSql(s.createdAt || new Date().toISOString())});`
      );
    });

    lines.push(``, `-- 4. SALES INVOICES & ITEMS TABLES`);
    lines.push(`CREATE TABLE IF NOT EXISTS sales_invoices (`);
    lines.push(`  id TEXT PRIMARY KEY,`);
    lines.push(`  invoice_no TEXT UNIQUE NOT NULL,`);
    lines.push(`  customer_id TEXT,`);
    lines.push(`  customer_name TEXT,`);
    lines.push(`  date TEXT NOT NULL,`);
    lines.push(`  subtotal REAL NOT NULL,`);
    lines.push(`  discount REAL DEFAULT 0,`);
    lines.push(`  tax REAL DEFAULT 0,`);
    lines.push(`  total REAL NOT NULL,`);
    lines.push(`  paid_amount REAL NOT NULL,`);
    lines.push(`  payment_method TEXT,`);
    lines.push(`  salesman_name TEXT`);
    lines.push(`);`);

    lines.push(`CREATE TABLE IF NOT EXISTS sales_invoice_items (`);
    lines.push(`  id INTEGER PRIMARY KEY AUTOINCREMENT,`);
    lines.push(`  invoice_id TEXT NOT NULL,`);
    lines.push(`  product_id TEXT,`);
    lines.push(`  product_name TEXT NOT NULL,`);
    lines.push(`  quantity REAL NOT NULL,`);
    lines.push(`  unit_price REAL NOT NULL,`);
    lines.push(`  total REAL NOT NULL`);
    lines.push(`);`);

    sales.forEach((s) => {
      lines.push(
        `INSERT INTO sales_invoices (id, invoice_no, customer_id, customer_name, date, subtotal, discount, tax, total, paid_amount, payment_method, salesman_name) VALUES (${escapeSql(s.id)}, ${escapeSql(s.invoiceNo)}, ${escapeSql(s.customerId || '')}, ${escapeSql(s.customerName)}, ${escapeSql(s.date)}, ${s.subtotal || s.netTotal}, ${s.discountAmount || 0}, 0, ${s.netTotal}, ${s.amountTendered || s.netTotal}, ${escapeSql(s.paymentMethod)}, ${escapeSql(s.cashierName || 'Admin')});`
      );
      (s.items || []).forEach((item) => {
        lines.push(
          `INSERT INTO sales_invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total) VALUES (${escapeSql(s.id)}, ${escapeSql(item.product?.id || '')}, ${escapeSql(item.product?.name || '')}, ${item.quantity}, ${item.unitPrice}, ${item.subtotal});`
        );
      });
    });

    lines.push(``, `-- 5. STOCK PURCHASES TABLE`);
    lines.push(`CREATE TABLE IF NOT EXISTS purchases (`);
    lines.push(`  id TEXT PRIMARY KEY,`);
    lines.push(`  purchase_no TEXT UNIQUE NOT NULL,`);
    lines.push(`  supplier_id TEXT,`);
    lines.push(`  supplier_name TEXT,`);
    lines.push(`  date TEXT NOT NULL,`);
    lines.push(`  total_amount REAL NOT NULL,`);
    lines.push(`  paid_amount REAL NOT NULL,`);
    lines.push(`  payment_method TEXT,`);
    lines.push(`  notes TEXT`);
    lines.push(`);`);

    purchases.forEach((p) => {
      lines.push(
        `INSERT INTO purchases (id, purchase_no, supplier_id, supplier_name, date, total_amount, paid_amount, payment_method, notes) VALUES (${escapeSql(p.id)}, ${escapeSql(p.purchaseNo)}, ${escapeSql(p.supplierId)}, ${escapeSql(p.supplierName)}, ${escapeSql(p.date)}, ${p.totalAmount}, ${p.paidAmount}, ${escapeSql(p.paymentMethod)}, ${escapeSql(p.notes)});`
      );
    });

    lines.push(``, `-- 6. EXPENSES TABLE`);
    lines.push(`CREATE TABLE IF NOT EXISTS expenses (`);
    lines.push(`  id TEXT PRIMARY KEY,`);
    lines.push(`  category TEXT NOT NULL,`);
    lines.push(`  description TEXT,`);
    lines.push(`  amount REAL NOT NULL,`);
    lines.push(`  date TEXT NOT NULL,`);
    lines.push(`  recorded_by TEXT`);
    lines.push(`);`);

    expenses.forEach((e) => {
      lines.push(
        `INSERT INTO expenses (id, category, description, amount, date, recorded_by) VALUES (${escapeSql(e.id)}, ${escapeSql(e.category)}, ${escapeSql(e.description)}, ${e.amount}, ${escapeSql(e.date)}, ${escapeSql(e.recordedBy)});`
      );
    });

    lines.push(``, `-- 7. CUSTOMER LEDGER (KHATA)`);
    lines.push(`CREATE TABLE IF NOT EXISTS customer_ledger (`);
    lines.push(`  id TEXT PRIMARY KEY,`);
    lines.push(`  customer_id TEXT NOT NULL,`);
    lines.push(`  date TEXT NOT NULL,`);
    lines.push(`  type TEXT NOT NULL,`);
    lines.push(`  debit REAL DEFAULT 0,`);
    lines.push(`  credit REAL DEFAULT 0,`);
    lines.push(`  running_balance REAL NOT NULL,`);
    lines.push(`  notes TEXT`);
    lines.push(`);`);

    ledger.forEach((l) => {
      lines.push(
        `INSERT INTO customer_ledger (id, customer_id, date, type, debit, credit, running_balance, notes) VALUES (${escapeSql(l.id)}, ${escapeSql(l.customerId)}, ${escapeSql(l.date)}, ${escapeSql(l.type)}, ${l.debit || 0}, ${l.credit || 0}, ${l.runningBalance || 0}, ${escapeSql(l.notes)});`
      );
    });

    lines.push(``, `COMMIT;`, `-- End of SQLite Dump`);
    return lines.join('\n');
  }

  static restoreFullBackup(jsonString: string, userEmail: string): boolean {
    try {
      memoryCache.clear();
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.data) {
        throw new Error('Invalid backup file format');
      }
      const d = parsed.data;
      if (Array.isArray(d.products)) setLocalItem(DB_KEYS.PRODUCTS, d.products);
      if (Array.isArray(d.sales)) setLocalItem(DB_KEYS.SALES, d.sales);
      if (Array.isArray(d.customers)) setLocalItem(DB_KEYS.CUSTOMERS, d.customers);
      if (Array.isArray(d.ledger)) setLocalItem(DB_KEYS.LEDGER, d.ledger);
      if (Array.isArray(d.suppliers)) setLocalItem(DB_KEYS.SUPPLIERS, d.suppliers);
      if (Array.isArray(d.purchases)) setLocalItem(DB_KEYS.PURCHASES, d.purchases);
      if (Array.isArray(d.returns)) setLocalItem(DB_KEYS.RETURNS, d.returns);
      if (Array.isArray(d.expenses)) setLocalItem(DB_KEYS.EXPENSES, d.expenses);
      if (Array.isArray(d.closingReports)) setLocalItem(DB_KEYS.CLOSING_REPORTS, d.closingReports);
      if (Array.isArray(d.auditLogs)) setLocalItem(DB_KEYS.AUDIT_LOGS, d.auditLogs);
      if (d.settings) setLocalItem(DB_KEYS.SETTINGS, d.settings);

      this.addAuditLog({
        userEmail,
        actionType: 'DATABASE_RESTORE',
        entityId: 'SYSTEM',
        details: `Full database restore performed from backup export dated ${parsed.exportDate || 'Unknown'}`,
      });

      broadcastUpdate('DATABASE_RESTORED');
      return true;
    } catch (err) {
      console.error('Failed to restore database backup:', err);
      return false;
    }
  }

  // INVENTORY CSV EXPORT & BULK VALIDATION IMPORT
  static exportProductsToCSV(): string {
    const products = this.getProducts();
    const headers = [
      'ID',
      'Name',
      'Urdu Name',
      'Category',
      'SKU',
      'Barcode',
      'Purchase Cost Price',
      'Selling Price',
      'Stock Qty',
      'Unit',
      'Min Alert Threshold',
      'Notes',
    ];

    const rows = products.map((p) => [
      `"${p.id}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.urduName || '').replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.sku}"`,
      `"${p.barcode}"`,
      p.costPrice,
      p.sellingPrice,
      p.stock,
      `"${p.unit}"`,
      p.minStockAlert,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Helper to parse CSV text lines with RFC-4180 quote and delimiter handling
   */
  static parseCSVText(csvText: string): string[][] {
    const lines: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"';
          i++; // Skip the escaped quote
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',' || char === '\t' || char === ';') {
          currentRow.push(currentField.trim());
          currentField = '';
        } else if (char === '\r') {
          if (nextChar === '\n') i++;
          currentRow.push(currentField.trim());
          if (currentRow.some((field) => field.length > 0)) {
            lines.push(currentRow);
          }
          currentRow = [];
          currentField = '';
        } else if (char === '\n') {
          currentRow.push(currentField.trim());
          if (currentRow.some((field) => field.length > 0)) {
            lines.push(currentRow);
          }
          currentRow = [];
          currentField = '';
        } else {
          currentField += char;
        }
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some((field) => field.length > 0)) {
        lines.push(currentRow);
      }
    }

    return lines;
  }

  /**
   * Pre-import CSV validation & summary builder
   */
  static validateProductsCSV(csvText: string): CSVValidationSummary {
    const rawRows = this.parseCSVText(csvText);
    const summary: CSVValidationSummary = {
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      newCount: 0,
      updateCount: 0,
      warningCount: 0,
      items: [],
      errors: [],
    };

    if (rawRows.length <= 1) {
      summary.errors.push('CSV content is empty or contains only the header row.');
      return summary;
    }

    const headerRow = rawRows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    // Column header mapping
    const findCol = (aliases: string[]) => {
      return headerRow.findIndex((h) => aliases.some((a) => h.includes(a)));
    };

    const skuIdx = findCol(['sku', 'code', 'itemcode', 'barcode', 'itemno']);
    const nameIdx = findCol(['name', 'title', 'itemname', 'productname', 'description']);
    const urduNameIdx = findCol(['urdu', 'urduname', 'urdutitle']);
    const catIdx = findCol(['category', 'cat', 'group', 'department', 'type']);
    const costIdx = findCol(['cost', 'costprice', 'unitcost', 'purchasecost', 'purchaserate', 'buyprice']);
    const priceIdx = findCol(['price', 'sellingprice', 'saleprice', 'rate', 'retailprice', 'retail']);
    const stockIdx = findCol(['stock', 'quantity', 'qty', 'units', 'instock', 'count']);
    const unitIdx = findCol(['unit', 'uom', 'unittype', 'measure']);
    const alertIdx = findCol(['minalert', 'minstock', 'alertthreshold', 'threshold', 'min']);
    const notesIdx = findCol(['note', 'notes', 'remarks', 'memo']);

    const existingProducts = this.getProducts();
    const seenSkusInFile = new Map<string, number>();

    const validUnits: UnitType[] = ['meter', 'yard', 'roll', 'piece', 'packet', 'dozen', 'box'];

    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (row.length === 0 || row.every((c) => !c)) continue;

      summary.totalRows++;
      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];

      // Extract values with flexible fallbacks
      let sku = (skuIdx >= 0 && row[skuIdx] ? row[skuIdx] : '').trim();
      let name = (nameIdx >= 0 && row[nameIdx] ? row[nameIdx] : '').trim();
      const urduName = (urduNameIdx >= 0 && row[urduNameIdx] ? row[urduNameIdx] : '').trim();
      let category = (catIdx >= 0 && row[catIdx] ? row[catIdx] : '').trim();
      const costRaw = costIdx >= 0 ? row[costIdx] : '';
      const priceRaw = priceIdx >= 0 ? row[priceIdx] : '';
      const stockRaw = stockIdx >= 0 ? row[stockIdx] : '';
      const unitRaw = (unitIdx >= 0 && row[unitIdx] ? row[unitIdx].toLowerCase().trim() : '') as UnitType;
      const alertRaw = alertIdx >= 0 ? row[alertIdx] : '';
      const notes = notesIdx >= 0 ? row[notesIdx] : '';

      // Positional fallback if no headers matched
      if (skuIdx === -1 && nameIdx === -1 && row.length >= 4) {
        sku = row[0] || '';
        name = row[1] || '';
        category = row[2] || '';
      }

      // Validations
      if (!name) {
        rowErrors.push('Product name is required');
      }

      if (!sku) {
        // Auto-generate SKU if missing and name exists, or mark error
        sku = `ZAR-${Date.now().toString().slice(-4)}-${r}`;
        rowWarnings.push(`Missing SKU: auto-assigned temporary SKU "${sku}"`);
      }

      // Check duplicates within the uploaded CSV
      const normalizedSku = sku.toUpperCase();
      if (seenSkusInFile.has(normalizedSku)) {
        rowErrors.push(`Duplicate SKU "${sku}" repeated on row ${seenSkusInFile.get(normalizedSku)} and row ${r + 1}`);
      } else {
        seenSkusInFile.set(normalizedSku, r + 1);
      }

      // Numeric Parsing
      const costPrice = parseFloat(costRaw.replace(/[^0-9.-]/g, '')) || 0;
      const sellingPrice = parseFloat(priceRaw.replace(/[^0-9.-]/g, '')) || 0;
      const stock = parseFloat(stockRaw.replace(/[^0-9.-]/g, '')) || 0;
      const minStockAlert = parseFloat(alertRaw.replace(/[^0-9.-]/g, '')) || 10;

      if (isNaN(costPrice) || costPrice < 0) {
        rowErrors.push('Cost price must be a positive number');
      }

      if (isNaN(sellingPrice) || sellingPrice <= 0) {
        rowErrors.push('Selling price is required and must be greater than 0');
      }

      if (sellingPrice > 0 && costPrice > 0 && sellingPrice < costPrice) {
        rowWarnings.push(`Selling price (Rs ${sellingPrice}) is below cost price (Rs ${costPrice})`);
      }

      if (!category) {
        category = 'Zari & Tilla Threads';
      }

      let unit: UnitType = 'piece';
      if (unitRaw && validUnits.includes(unitRaw as UnitType)) {
        unit = unitRaw as UnitType;
      } else if (unitRaw) {
        rowWarnings.push(`Unknown unit "${unitRaw}", default to "piece"`);
      }

      // Check existing product match by SKU
      const existing = existingProducts.find(
        (p) => p.sku.trim().toLowerCase() === sku.trim().toLowerCase()
      );

      const action: 'insert' | 'update' = existing ? 'update' : 'insert';
      const isValid = rowErrors.length === 0;

      if (isValid) {
        summary.validCount++;
        if (action === 'insert') summary.newCount++;
        else summary.updateCount++;
      } else {
        summary.invalidCount++;
      }

      if (rowWarnings.length > 0) {
        summary.warningCount += rowWarnings.length;
      }

      summary.items.push({
        rowIndex: r + 1,
        isValid,
        action,
        existingProductId: existing?.id,
        data: {
          sku,
          name,
          urduName: urduName || existing?.urduName || '',
          category,
          costPrice,
          sellingPrice: sellingPrice || (costPrice > 0 ? costPrice * 1.3 : 100),
          stock: stock >= 0 ? stock : 0,
          unit,
          minStockAlert: minStockAlert >= 0 ? minStockAlert : 10,
          notes: notes || 'Imported via CSV',
        },
        errors: rowErrors,
        warnings: rowWarnings,
      });
    }

    return summary;
  }

  /**
   * Commits validated CSV import items directly to OfflineDB
   */
  static commitBulkProductsImport(
    validatedItems: CSVValidationItem[],
    userEmail: string = 'admin@sajjadzari.com'
  ): { successCount: number; updatedCount: number; insertedCount: number } {
    const products = this.getProducts();
    let updatedCount = 0;
    let insertedCount = 0;

    const validItemsToCommit = validatedItems.filter((item) => item.isValid);

    for (const item of validItemsToCommit) {
      const d = item.data;
      const existingIdx = products.findIndex(
        (p) => p.id === item.existingProductId || p.sku.trim().toLowerCase() === d.sku.trim().toLowerCase()
      );

      if (existingIdx >= 0) {
        const old = products[existingIdx];
        products[existingIdx] = {
          ...old,
          name: d.name,
          urduName: d.urduName || old.urduName,
          category: d.category || old.category,
          costPrice: d.costPrice,
          sellingPrice: d.sellingPrice,
          stock: d.stock,
          unit: d.unit,
          minStockAlert: d.minStockAlert,
          notes: d.notes || old.notes,
          updatedAt: new Date().toISOString(),
        };
        updatedCount++;
      } else {
        const newProduct: Product = {
          id: `prod-csv-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          name: d.name,
          urduName: d.urduName || '',
          category: d.category,
          sku: d.sku,
          barcode: d.barcode || `890${Math.floor(10000000 + Math.random() * 90000000)}`,
          costPrice: d.costPrice,
          sellingPrice: d.sellingPrice,
          stock: d.stock,
          unit: d.unit,
          minStockAlert: d.minStockAlert,
          notes: d.notes || 'Imported via Bulk CSV Utility',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        products.unshift(newProduct);
        insertedCount++;
      }
    }

    setLocalItem(DB_KEYS.PRODUCTS, products);
    const totalProcessed = insertedCount + updatedCount;

    this.addAuditLog({
      userEmail,
      actionType: 'STOCK_OVERRIDE',
      entityId: 'CSV_BULK_IMPORT',
      details: `Bulk CSV Import completed: ${insertedCount} new products added, ${updatedCount} existing products updated. Total: ${totalProcessed}`,
    });

    broadcastUpdate('PRODUCTS_UPDATED', products);
    return {
      successCount: totalProcessed,
      updatedCount,
      insertedCount,
    };
  }

  static importProductsFromCSV(csvText: string, userEmail: string): { successCount: number; errors: string[] } {
    const validation = this.validateProductsCSV(csvText);
    if (validation.validCount === 0) {
      return {
        successCount: 0,
        errors: validation.errors.length > 0 ? validation.errors : ['No valid product records found in CSV.'],
      };
    }

    const result = this.commitBulkProductsImport(validation.items, userEmail);
    const errors = validation.items
      .filter((i) => !i.isValid)
      .map((i) => `Row ${i.rowIndex}: ${i.errors.join(', ')}`);

    return {
      successCount: result.successCount,
      errors,
    };
  }

  // ALIAS & CONVENIENCE METHODS
  static broadcast(type: string, payload?: unknown) {
    broadcastUpdate(type, payload);
  }

  static onSyncUpdate(callback: (type?: string, payload?: unknown) => void) {
    return this.onSync((type, payload) => callback(type, payload));
  }

  static recordSale(sale: SaleInvoice, userEmail?: string): SaleInvoice {
    return this.createSale(sale);
  }

  static exportFullDatabaseJSON(): string {
    return this.exportFullBackup();
  }

  static exportFullDatabaseSQLite(): string {
    return this.exportSQLiteDump();
  }

  static importFullDatabaseJSON(jsonString: string, userEmail: string = 'admin@sajjadzari.com'): boolean {
    return this.restoreFullBackup(jsonString, userEmail);
  }

  static resetToSeedData(): void {
    memoryCache.clear();
    setLocalItem(DB_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    setLocalItem(DB_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    setLocalItem(DB_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    setLocalItem(DB_KEYS.EXPENSES, INITIAL_EXPENSES);
    setLocalItem(DB_KEYS.SETTINGS, DEFAULT_SETTINGS);
    setLocalItem(DB_KEYS.SALES, []);
    setLocalItem(DB_KEYS.RETURNS, []);
    setLocalItem(DB_KEYS.PURCHASES, []);
    setLocalItem(DB_KEYS.CLOSING_REPORTS, []);
    this.addAuditLog({
      userEmail: 'admin@sajjadzari.com',
      actionType: 'DATABASE_RESTORE',
      entityId: 'SYSTEM',
      details: 'System reset to factory seed data',
    });
    broadcastUpdate('DATABASE_RESTORED');
  }

  static saveExpense(expense: Expense, userEmail?: string): Expense {
    return this.addExpense(expense);
  }

  static saveDailyClosing(report: DailyClosingReport, userEmail?: string): DailyClosingReport {
    return this.saveClosingReport(report, userEmail || report.closedByEmail);
  }

  static getCustomerPaymentsToday(): CustomerLedgerEntry[] {
    const today = new Date().toLocaleDateString();
    const all = getLocalItem<CustomerLedgerEntry[]>(DB_KEYS.LEDGER, []);
    return all.filter((l) => l.type === 'payment_received' && l.date.includes(today));
  }

  static recordCustomerPayment(
    customerIdOrObj:
      | string
      | {
          customerId: string;
          amount: number;
          paymentMethod?: string;
          notes?: string;
          recordedBy: string;
        },
    amount?: number,
    paymentMethod?: string,
    notes?: string,
    recordedBy?: string
  ): CustomerLedgerEntry {
    if (typeof customerIdOrObj === 'object') {
      return this.addCustomerTransaction({
        ...customerIdOrObj,
        type: 'payment_received',
        referenceId: `RCPT-${Date.now().toString().slice(-4)}`,
      });
    }

    return this.addCustomerTransaction({
      customerId: customerIdOrObj,
      type: 'payment_received',
      amount: amount || 0,
      paymentMethod: paymentMethod || 'Cash',
      notes: notes || 'Wasooli payment received',
      recordedBy: recordedBy || 'admin',
      referenceId: `RCPT-${Date.now().toString().slice(-4)}`,
    });
  }

  static savePurchaseInvoice(order: PurchaseOrder, userEmail: string = 'admin@sajjadzari.com'): PurchaseOrder {
    return this.recordPurchase(order, userEmail);
  }

  static processSaleReturn(returnData: SaleReturn, userEmail: string = 'admin@sajjadzari.com'): SaleReturn {
    return this.processReturn(returnData, userEmail);
  }

  // PENDING SYNC QUEUE MANAGEMENT
  static getPendingSyncQueue(): Array<{ id: string; type: string; timestamp: number; summary: string; data?: any }> {
    const queue = getLocalItem<Array<{ id: string; type: string; timestamp: number; summary: string; data?: any }>>(
      DB_KEYS.PENDING_SYNC_QUEUE,
      []
    );
    // If queue is empty, calculate pending based on unsynced sales or draft changes
    if (queue.length === 0) {
      const sales = this.getSales();
      if (sales.length > 0) {
        // Return recent sales that were created locally
        return sales.slice(0, 3).map((s) => ({
          id: s.id,
          type: 'SALE_INVOICE',
          timestamp: s.timestamp || Date.now(),
          summary: `Invoice #${s.invoiceNo} - Rs ${s.netTotal.toLocaleString()}`,
          data: s,
        }));
      }
    }
    return queue;
  }

  static getPendingSyncCount(): number {
    return this.getPendingSyncQueue().length;
  }

  static enqueuePendingSync(item: { id?: string; type: string; summary: string; data?: any }): void {
    const queue = getLocalItem<Array<{ id: string; type: string; timestamp: number; summary: string; data?: any }>>(
      DB_KEYS.PENDING_SYNC_QUEUE,
      []
    );
    const entry = {
      id: item.id || `SYNC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: item.type,
      summary: item.summary,
      timestamp: Date.now(),
      data: item.data,
    };
    queue.push(entry);
    setLocalItem(DB_KEYS.PENDING_SYNC_QUEUE, queue);
    broadcastUpdate('PENDING_SYNC_UPDATED', { count: queue.length });
  }

  static clearPendingSyncQueue(): void {
    setLocalItem(DB_KEYS.PENDING_SYNC_QUEUE, []);
    broadcastUpdate('PENDING_SYNC_UPDATED', { count: 0 });
  }
}
