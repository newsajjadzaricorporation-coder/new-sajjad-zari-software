export type UserRole = 'admin' | 'staff' | 'blocked';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
}

export type UnitType = 'meter' | 'yard' | 'roll' | 'piece' | 'packet' | 'dozen' | 'box';

export interface Product {
  id: string;
  name: string;
  urduName?: string;
  category: string;
  sku: string;
  barcode: string;
  costPrice: number; // Purchase price (hidden from staff)
  sellingPrice: number;
  stock: number;
  minStockAlert: number;
  minMarginPercent?: number; // Minimum acceptable profit margin percentage threshold
  unit: UnitType;
  supplierId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number; // Editable at billing
  itemDiscount: number; // Flat discount per item
  subtotal: number;
}

export type PaymentMethod = 'cash' | 'card' | 'credit';

export interface SaleInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  timestamp: number;
  cashierId: string;
  cashierName: string;
  cashierEmail: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: CartItem[];
  subtotal: number;
  discountType: 'flat' | 'percentage';
  discountValue: number;
  discountAmount: number;
  serviceFee?: number;
  serviceFeeType?: 'flat' | 'percentage';
  serviceFeeValue?: number;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscountAmount?: number;
  customerTier?: LoyaltyTier;
  netTotal: number;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  changeGiven: number;
  previousBalance?: number;
  newBalance?: number;
  status: 'completed' | 'returned' | 'partial_return';
  notes?: string;
}

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface LoyaltyTierConfig {
  tier: LoyaltyTier;
  minPoints: number;
  discountPercent: number;
  pointMultiplier: number;
  badgeColor: string;
  urduTitle: string;
  perks: string;
}

export interface Customer {
  id: string;
  name: string;
  urduName?: string;
  phone: string;
  shopName?: string;
  address?: string;
  creditLimit: number;
  currentBalance: number; // positive = customer owes shop (debt/udhaar)
  loyaltyPoints?: number; // available redeemable points
  lifetimePoints?: number; // total points accumulated
  loyaltyTier?: LoyaltyTier; // Bronze, Silver, Gold, Platinum
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  date: string;
  timestamp: number;
  type: 'credit_sale' | 'payment_received' | 'return_credit' | 'opening_balance';
  referenceId?: string; // invoice # or receipt #
  debit: number; // increases balance (e.g. credit purchase)
  credit: number; // decreases balance (payment received or return)
  runningBalance: number;
  paymentMethod?: string;
  notes?: string;
  recordedBy: string;
}
export type LedgerEntry = CustomerLedgerEntry;

export interface Supplier {
  id: string;
  name?: string;
  company?: string;
  companyName?: string;
  contactPerson: string;
  phone: string;
  address?: string;
  category?: string;
  categorySupplied?: string;
  totalPurchased?: number;
  totalPaid?: number;
  balancePayable: number;
  createdAt?: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName?: string;
  product?: Product;
  quantity: number;
  costPrice?: number;
  unitCost?: number;
  total?: number;
  subtotal?: number;
}

export interface PurchaseOrder {
  id: string;
  purchaseNo?: string;
  invoiceNo?: string;
  supplierId: string;
  supplierName: string;
  date: string;
  timestamp: number;
  items: PurchaseOrderItem[];
  totalAmount: number;
  paidAmount: number;
  paymentMethod: 'cash' | 'bank' | 'credit';
  status?: 'received' | 'pending';
  notes?: string;
  receivedBy?: string;
}
export type PurchaseInvoice = PurchaseOrder;

export interface ReturnItem {
  productId?: string;
  productName?: string;
  product?: Product;
  returnedQty?: number;
  returnedQuantity?: number;
  unitPrice?: number;
  unitRefundPrice?: number;
  refundAmount?: number;
  subtotal?: number;
  restockOption?: 'return_to_stock' | 'damaged_waste';
}

export interface SaleReturn {
  id: string;
  returnNo?: string;
  invoiceNo?: string;
  originalInvoiceNo: string;
  originalInvoiceId?: string;
  date: string;
  timestamp: number;
  customerId?: string;
  customerName: string;
  items: ReturnItem[];
  totalRefundAmount?: number;
  refundAmount?: number;
  refundSettlement?: 'cash' | 'credit_khata';
  refundMethod?: 'cash' | 'khata_credit';
  restockedToInventory?: boolean;
  reason: string;
  cashierEmail: string;
}
export type ReturnRecord = SaleReturn;

export type ExpenseCategory =
  | 'rent'
  | 'electricity_utilities'
  | 'salaries'
  | 'tea_food'
  | 'packaging'
  | 'maintenance'
  | 'transport'
  | 'miscellaneous'
  | string;

export interface Expense {
  id: string;
  date: string;
  timestamp?: number;
  amount: number;
  category: ExpenseCategory;
  paymentMethod: 'cash' | 'bank';
  description: string;
  recordedBy?: string;
  paidBy?: string;
}
export type ExpenseItem = Expense;

export interface DailyClosingReport {
  id: string;
  date: string;
  closedAt: string;
  timestamp?: number;
  closedByEmail: string;
  openingCash: number;
  cashSalesTotal: number;
  udhaarCollectedCash: number;
  cashExpensesTotal: number;
  expectedCash: number;
  actualCash: number;
  discrepancy: number; // actual - expected
  notes: string;
}

export type AuditActionType =
  | 'PRICE_CHANGE'
  | 'STOCK_OVERRIDE'
  | 'PRODUCT_DELETE'
  | 'ROLE_CHANGE'
  | 'DISCOUNT_OVERRIDE'
  | 'DATABASE_RESTORE'
  | 'RETURN_PROCESSED'
  | 'Z_REPORT_CLOSED'
  | string;

export interface AuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  actionType?: AuditActionType;
  action?: string;
  entityId?: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}
export type AuditLogEntry = AuditLog;

export interface ShopSettings {
  shopName: string;
  urduTitle: string;
  tagline: string;
  phone: string;
  address: string;
  logoUrl?: string;
  thermalHeaderNote: string;
  thermalFooterUrdu: string;
  defaultPrinterMode: 'thermal80' | 'thermal58' | 'a4';
  currency: string;
  enableSoundEffects: boolean;
  autoPrintReceipt?: boolean;
  autoPrintOnSale?: boolean;
  dailySalesGoal?: number;
  dailyRevenueTarget?: number;
  autoLockEnabled?: boolean;
  autoLockMinutes?: number;
  defaultServiceFee?: number;
  defaultServiceFeeType?: 'flat' | 'percentage';
  loyaltyEnabled?: boolean;
  pointsPerHundredRupees?: number; // e.g. 1 point for every 100 Rs spent (or 1 pt/100 Rs = 1%)
  pointRedemptionRate?: number; // e.g. 1 point = 1 Rs
  minPointsToRedeem?: number; // minimum points needed to redeem (e.g. 50)
}

export interface CSVValidationItem {
  rowIndex: number;
  isValid: boolean;
  action: 'insert' | 'update';
  existingProductId?: string;
  data: {
    sku: string;
    barcode?: string;
    name: string;
    urduName?: string;
    category: string;
    costPrice: number;
    sellingPrice: number;
    stock: number;
    unit: UnitType;
    minStockAlert: number;
    notes?: string;
  };
  errors: string[];
  warnings: string[];
}

export interface CSVValidationSummary {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  newCount: number;
  updateCount: number;
  warningCount: number;
  items: CSVValidationItem[];
  errors: string[];
}
