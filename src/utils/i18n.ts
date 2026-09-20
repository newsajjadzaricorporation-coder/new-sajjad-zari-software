// Central translations and localization configuration for New Sajjad Zari Corporation

export type Language = 'en' | 'ur';

export interface Translations {
  [key: string]: {
    en: string;
    ur: string;
  };
}

export const TRANSLATIONS: Translations = {
  // Brand & Header
  appName: {
    en: 'New Sajjad Zari Corporation',
    ur: 'نیو سجاد زری کارپوریشن',
  },
  retailWholesale: {
    en: 'RETAIL & WHOLESALE',
    ur: 'ریٹیل اور ہول سیل',
  },
  offlineMode: {
    en: 'Offline Mode',
    ur: 'آف لائن موڈ',
  },
  syncing: {
    en: 'Syncing...',
    ur: 'ہم آہنگ ہو رہا ہے...',
  },
  synced: {
    en: 'Synced',
    ur: 'ہم آہنگ',
  },
  pendingRecords: {
    en: 'pending',
    ur: 'زیر التواء',
  },
  installApp: {
    en: 'Install App',
    ur: 'ایپ انسٹال کریں',
  },

  // Navigation Tabs
  navPos: {
    en: 'Point of Sale',
    ur: 'سیل کاؤنٹر (POS)',
  },
  navInventory: {
    en: 'Inventory & CSV',
    ur: 'اسٹاک اور انوینٹری',
  },
  navAnalytics: {
    en: 'Profit Heatmap',
    ur: 'منافع اینالیٹکس',
  },
  navCustomers: {
    en: 'Customer Khata',
    ur: 'گاہک کھاتہ و ادھار',
  },
  navSuppliers: {
    en: 'Suppliers & Inward',
    ur: 'سپلائرز اور مال کی آمد',
  },
  navReturns: {
    en: 'Returns & Credit',
    ur: 'واپسی اور کریڈٹ نوٹ',
  },
  navExpenses: {
    en: 'Expenses & Z-Closing',
    ur: 'اخراجات اور روزانہ کھاتہ بندی',
  },
  navAudit: {
    en: 'RBAC & Backups',
    ur: 'سیکیورٹی اور بیک اپ',
  },
  navGuide: {
    en: 'User Guide & .EXE',
    ur: 'رہنمائی اور انسٹالیشن',
  },

  // POS Actions & Labels
  newBill: {
    en: 'New Bill',
    ur: 'نیا بل',
  },
  activeCart: {
    en: 'Active Cart',
    ur: 'موجودہ کارٹ',
  },
  clearCart: {
    en: 'Clear Cart',
    ur: 'کارٹ صاف کریں',
  },
  batchDelete: {
    en: 'Delete Selected',
    ur: 'منتخب کردہ حذف کریں',
  },
  selectAll: {
    en: 'Select All',
    ur: 'سب منتخب کریں',
  },
  searchProducts: {
    en: 'Search products by name, SKU, Urdu title, or barcode...',
    ur: 'پروڈکٹ کا نام، کوڈ، یا اردو نام تلاش کریں...',
  },
  allCategories: {
    en: 'All Categories',
    ur: 'تمام کیٹگریز',
  },
  inStock: {
    en: 'In Stock',
    ur: 'دستیاب اسٹاک',
  },
  lowStock: {
    en: 'Low Stock',
    ur: 'کم اسٹاک',
  },
  outOfStock: {
    en: 'Out of Stock',
    ur: 'ختم شدہ اسٹاک',
  },
  allSuppliers: {
    en: 'All Suppliers',
    ur: 'تمام سپلائرز',
  },
  priceRange: {
    en: 'Price Range',
    ur: 'قیمت کی حد',
  },
  minPrice: {
    en: 'Min Price',
    ur: 'کم سے کم قیمت',
  },
  maxPrice: {
    en: 'Max Price',
    ur: 'زیادہ سے زیادہ قیمت',
  },
  sellingPrice: {
    en: 'Selling Price',
    ur: 'فروخت کی قیمت',
  },
  costPrice: {
    en: 'Cost Price',
    ur: 'خریداری کی قیمت',
  },
  filter: {
    en: 'Filter',
    ur: 'فلٹر',
  },
  resetFilters: {
    en: 'Reset Filters',
    ur: 'فلٹر ختم کریں',
  },
  completeSale: {
    en: 'Complete Sale',
    ur: 'سیل مکمل کریں',
  },
  subtotal: {
    en: 'Subtotal',
    ur: 'کل رقم',
  },
  discount: {
    en: 'Discount',
    ur: 'رعایت',
  },
  netTotal: {
    en: 'Net Total',
    ur: 'خالص رقم',
  },
  tendered: {
    en: 'Amount Tendered',
    ur: 'وصول شدہ رقم',
  },
  change: {
    en: 'Change Due',
    ur: 'بقایا رقم',
  },

  // Daily Profit Summary Card
  dailyProfitReport: {
    en: 'Daily Profit Report',
    ur: 'روزانہ منافع رپورٹ',
  },
  netProfitToday: {
    en: 'Net Profit Today',
    ur: 'آج کا خالص منافع',
  },
  totalCogs: {
    en: 'Total COGS (Cost)',
    ur: 'کل لاگت (خریداری)',
  },
  profitMargin: {
    en: 'Profit Margin',
    ur: 'منافع کی شرح',
  },
  todaySalesRevenue: {
    en: "Today's Revenue",
    ur: 'آج کی کل سیل',
  },

  // Redundancy & Backups
  backupNow: {
    en: 'Backup Now',
    ur: 'فوری بیک اپ لیں',
  },
  backupSuccess: {
    en: 'IndexedDB backup downloaded successfully!',
    ur: 'بیک اپ کامیابی سے ڈاؤن لوڈ ہو گیا!',
  },
  downloadReport: {
    en: 'Download Report',
    ur: 'رپورٹ ڈاؤن لوڈ کریں',
  },
  generatingPdf: {
    en: 'Generating PDF Report...',
    ur: 'پی ڈی ایف رپورٹ تیار ہو رہی ہے...',
  },

  // Sync Reconciliation Failure Modal
  reconciliationFailureTitle: {
    en: 'Sync Reconciliation Issue Detected',
    ur: 'ہم آہنگی میں رکاوٹ کا سامنا ہے',
  },
  reconciliationFailureDesc: {
    en: 'The app detected a discrepancy or network timeout while reconciling local OfflineDB with Cloud Firestore.',
    ur: 'مقامی آف لائن ڈیٹا کو کلاؤڈ ڈیٹا بیس کے ساتھ ہم آہنگ کرتے وقت تاخیر یا خرابی پیش آئی ہے۔',
  },
  retrySync: {
    en: 'Retry Sync Now',
    ur: 'دوبارہ کوشش کریں',
  },
  resolveManually: {
    en: 'Resolve Manually',
    ur: 'خود حل کریں (دستی)',
  },
  downloadEmergencyBackup: {
    en: 'Download Emergency Backup',
    ur: 'ہنگامی بیک اپ ڈاؤن لوڈ کریں',
  },
  continueOffline: {
    en: 'Continue Offline',
    ur: 'آف لائن جاری رکھیں',
  },

  // Common Buttons
  save: { en: 'Save', ur: 'محفوظ کریں' },
  cancel: { en: 'Cancel', ur: 'منسوخ' },
  close: { en: 'Close', ur: 'بند کریں' },
  delete: { en: 'Delete', ur: 'حذف کریں' },
  edit: { en: 'Edit', ur: 'ترمیم' },
  add: { en: 'Add Product', ur: 'نیا پروڈکٹ شامل کریں' },
  actions: { en: 'Actions', ur: 'کارروائی' },
};

export const CATEGORY_TRANSLATIONS: Record<string, { en: string; ur: string }> = {
  Zari: { en: 'Zari', ur: 'زری' },
  Tilla: { en: 'Tilla', ur: 'تلہ' },
  Dori: { en: 'Dori', ur: 'ڈوری' },
  Laces: { en: 'Laces', ur: 'لیسز' },
  Beads: { en: 'Beads', ur: 'موتی' },
  Sequins: { en: 'Sequins', ur: 'ستارے' },
  Ribbons: { en: 'Ribbons', ur: 'ربن' },
  Threads: { en: 'Threads', ur: 'دھاگے' },
  Motifs: { en: 'Motifs', ur: 'موٹفس' },
  Fabric: { en: 'Fabric', ur: 'کپڑا' },
};

export function translate(key: string, lang: Language, defaultVal?: string): string {
  if (TRANSLATIONS[key]) {
    return TRANSLATIONS[key][lang] || TRANSLATIONS[key].en;
  }
  return defaultVal || key;
}

export function translateCategory(cat: string, lang: Language): string {
  if (CATEGORY_TRANSLATIONS[cat]) {
    return CATEGORY_TRANSLATIONS[cat][lang] || cat;
  }
  return cat;
}
