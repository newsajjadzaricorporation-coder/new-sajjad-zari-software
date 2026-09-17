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
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_EXPENSES,
  DEFAULT_SETTINGS,
  INITIAL_USER,
} from '../data/seedData';

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

// Local storage helper with memory fallback
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Error reading key ${key} from storage:`, err);
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
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
    return getLocalItem<Product[]>(DB_KEYS.PRODUCTS, INITIAL_PRODUCTS);
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

    broadcastUpdate('SALES_UPDATED', sales);
    broadcastUpdate('PRODUCTS_UPDATED', products);
    return sale;
  }

  // CUSTOMERS & LEDGER
  static getCustomers(): Customer[] {
    return getLocalItem<Customer[]>(DB_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  static saveCustomer(customer: Customer, userEmail?: string): Customer {
    const customers = this.getCustomers();
    const idx = customers.findIndex((c) => c.id === customer.id);
    if (idx >= 0) {
      customers[idx] = { ...customer, updatedAt: new Date().toISOString() };
    } else {
      customers.unshift({
        ...customer,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setLocalItem(DB_KEYS.CUSTOMERS, customers);
    broadcastUpdate('CUSTOMERS_UPDATED', customers);
    return customer;
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

  // SUPPLIERS & PURCHASES
  static getSuppliers(): Supplier[] {
    return getLocalItem<Supplier[]>(DB_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  }

  static saveSupplier(supplier: Supplier): Supplier {
    const suppliers = this.getSuppliers();
    const idx = suppliers.findIndex((s) => s.id === supplier.id);
    if (idx >= 0) {
      suppliers[idx] = supplier;
    } else {
      suppliers.unshift(supplier);
    }
    setLocalItem(DB_KEYS.SUPPLIERS, suppliers);
    broadcastUpdate('SUPPLIERS_UPDATED', suppliers);
    return supplier;
  }

  static getPurchases(): PurchaseOrder[] {
    return getLocalItem<PurchaseOrder[]>(DB_KEYS.PURCHASES, []);
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

    // Restock items if selected
    const products = this.getProducts();
    for (const item of returnData.items) {
      if (item.restockOption === 'return_to_stock') {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stock += item.returnedQty;
          prod.updatedAt = new Date().toISOString();
        }
      }
    }
    setLocalItem(DB_KEYS.PRODUCTS, products);

    // If refund settled to Credit Khata, credit customer's ledger
    if (returnData.refundSettlement === 'credit_khata' && returnData.customerId) {
      this.addCustomerTransaction({
        customerId: returnData.customerId,
        type: 'return_credit',
        referenceId: returnData.returnNo,
        amount: returnData.totalRefundAmount,
        notes: `Refund credit note for Return #${returnData.returnNo} (Invoice #${returnData.originalInvoiceNo})`,
        recordedBy: userEmail,
      });
    }

    // Update original invoice status
    const sales = this.getSales();
    const inv = sales.find((s) => s.invoiceNo === returnData.originalInvoiceNo);
    if (inv) {
      inv.status = 'returned';
      setLocalItem(DB_KEYS.SALES, sales);
    }

    this.addAuditLog({
      userEmail,
      actionType: 'RETURN_PROCESSED',
      entityId: returnData.returnNo,
      details: `Return processed: #${returnData.returnNo} for Invoice #${returnData.originalInvoiceNo}. Refund Rs ${returnData.totalRefundAmount} (${returnData.refundSettlement})`,
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

  static deleteExpense(expenseId: string): void {
    const expenses = this.getExpenses();
    const filtered = expenses.filter((e) => e.id !== expenseId);
    setLocalItem(DB_KEYS.EXPENSES, filtered);
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

  // DATABASE SNAPSHOT BACKUP & RESTORE
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

  static restoreFullBackup(jsonString: string, userEmail: string): boolean {
    try {
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

  // INVENTORY CSV EXPORT & IMPORT
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

  static importProductsFromCSV(csvText: string, userEmail: string): { successCount: number; errors: string[] } {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return { successCount: 0, errors: ['CSV file is empty or missing data rows'] };

    const products = this.getProducts();
    let count = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Basic CSV parser handling quoted tokens
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());

      if (cols.length < 5) {
        errors.push(`Row ${i + 1}: Insufficient columns`);
        continue;
      }

      const name = cols[1] || cols[0];
      const category = cols[3] || 'General Zari';
      const sku = cols[4] || `SKU-${Date.now()}-${i}`;
      const barcode = cols[5] || `890${Date.now() % 100000000}`;
      const costPrice = parseFloat(cols[6]) || 0;
      const sellingPrice = parseFloat(cols[7]) || (costPrice > 0 ? costPrice * 1.3 : 100);
      const stock = parseFloat(cols[8]) || 0;
      const unit = (cols[9] as any) || 'piece';
      const minStockAlert = parseFloat(cols[10]) || 10;

      const existingIndex = products.findIndex((p) => p.sku === sku || p.barcode === barcode);
      const productObj: Product = {
        id: existingIndex >= 0 ? products[existingIndex].id : `prod-csv-${Date.now()}-${i}`,
        name,
        urduName: cols[2] || '',
        category,
        sku,
        barcode,
        costPrice,
        sellingPrice,
        stock,
        minStockAlert,
        unit,
        notes: cols[11] || 'Imported via CSV',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        products[existingIndex] = productObj;
      } else {
        products.push(productObj);
      }
      count++;
    }

    setLocalItem(DB_KEYS.PRODUCTS, products);
    this.addAuditLog({
      userEmail,
      actionType: 'STOCK_OVERRIDE',
      entityId: 'CSV_IMPORT',
      details: `Bulk CSV imported ${count} products`,
    });
    broadcastUpdate('PRODUCTS_UPDATED', products);

    return { successCount: count, errors };
  }

  // ALIAS & CONVENIENCE METHODS
  static onSyncUpdate(callback: (type?: string, payload?: unknown) => void) {
    return this.onSync((type, payload) => callback(type, payload));
  }

  static recordSale(sale: SaleInvoice, userEmail?: string): SaleInvoice {
    return this.createSale(sale);
  }

  static exportFullDatabaseJSON(): string {
    return this.exportFullBackup();
  }

  static importFullDatabaseJSON(jsonString: string, userEmail: string = 'admin@sajjadzari.com'): boolean {
    return this.restoreFullBackup(jsonString, userEmail);
  }

  static resetToSeedData(): void {
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
}
