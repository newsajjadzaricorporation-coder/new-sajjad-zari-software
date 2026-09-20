import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Building,
  Phone,
  ArrowUpRight,
  PackagePlus,
  Trash2,
  CheckCircle,
  X,
  FileText,
  DollarSign,
  Edit2,
  Calendar,
  AlertTriangle,
  Receipt,
  Layers,
  ShoppingBag,
  CreditCard,
  User,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Clock,
  ArrowUp,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Supplier, Product, PurchaseOrder, UserProfile } from '../../types';
import { OfflineDB } from '../../services/db';
import { SupplierPriceHistoryView } from './SupplierPriceHistoryView';
import { exportToCSV } from '../../utils/csvExport';
import { PaginationControls } from '../common/PaginationControls';

interface SupplierKhataModuleProps {
  suppliers: Supplier[];
  products: Product[];
  currentUser: UserProfile;
  onRefreshData: () => void;
}

const getSupplierName = (s?: Partial<Supplier> | null): string => {
  if (!s) return 'Unknown Supplier';
  return s.companyName || s.name || s.company || s.contactPerson || 'Unknown Supplier';
};

const getSupplierCategory = (s?: Partial<Supplier> | null): string => {
  if (!s) return 'General';
  return s.category || s.categorySupplied || 'General';
};

const SupplierKhataModuleComponent: React.FC<SupplierKhataModuleProps> = ({
  suppliers = [],
  products = [],
  currentUser,
  onRefreshData,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchases' | 'price_history'>('suppliers');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-Select Suppliers State
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [isBatchSupplierDeleteOpen, setIsBatchSupplierDeleteOpen] = useState(false);
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierPageSize, setSupplierPageSize] = useState(20);

  // Multi-Select Purchases State
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([]);
  const [isBatchPurchaseDeleteOpen, setIsBatchPurchaseDeleteOpen] = useState(false);
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchasePageSize, setPurchasePageSize] = useState(20);

  // Modals
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

  // Deletion modals
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseOrder | null>(null);

  // Quick Payment/Settlement Modal
  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Cheque'>('Cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // New Purchase Inward Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<'cash' | 'credit' | 'bank'>('cash');
  const [purchaseDueDate, setPurchaseDueDate] = useState<string>(
    () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<
    { productId: string; quantity: number; costPrice: number }[]
  >([]);

  const [purchasesRefreshKey, setPurchasesRefreshKey] = useState(0);

  // Get all purchases from OfflineDB
  const purchases: PurchaseOrder[] = useMemo(() => {
    return OfflineDB.getPurchases();
  }, [suppliers, products, purchasesRefreshKey]);

  // Supplier payables total
  const totalPayables = useMemo(() => {
    return suppliers.reduce((acc, s) => acc + (s.balancePayable || 0), 0);
  }, [suppliers]);

  // Total Inward Purchases Amount
  const totalInwardPurchases = useMemo(() => {
    return purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
  }, [purchases]);

  // 30-Day Supplier Expenditure Analytics for Bar Chart Visualization
  const last30DaysExpenditureData = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 86400000;

    // Filter inward purchases within last 30 days
    const recentPurchases = purchases.filter((p) => {
      if (p.timestamp) return p.timestamp >= thirtyDaysAgo;
      const parsed = Date.parse(p.date);
      if (!isNaN(parsed)) return parsed >= thirtyDaysAgo;
      return true; // Fallback to include recent records
    });

    const map = new Map<string, {
      supplierId: string;
      name: string;
      totalSpent: number;
      orderCount: number;
      payable: number;
    }>();

    // Pre-fill registered suppliers
    suppliers.forEach((s) => {
      map.set(s.id, {
        supplierId: s.id,
        name: getSupplierName(s),
        totalSpent: 0,
        orderCount: 0,
        payable: s.balancePayable || 0,
      });
    });

    recentPurchases.forEach((p) => {
      let entry = map.get(p.supplierId);
      if (!entry) {
        const pSupName = (p.supplierName || '').toLowerCase().trim();
        const found = suppliers.find(
          (s) => getSupplierName(s).toLowerCase().trim() === pSupName
        );
        if (found) entry = map.get(found.id);
      }

      if (entry) {
        entry.totalSpent += p.totalAmount || 0;
        entry.orderCount += 1;
      } else {
        const vendorName = p.supplierName || 'Unknown Vendor';
        map.set(p.supplierId || vendorName, {
          supplierId: p.supplierId || vendorName,
          name: vendorName,
          totalSpent: p.totalAmount || 0,
          orderCount: 1,
          payable: 0,
        });
      }
    });

    const list = Array.from(map.values())
      .sort((a, b) => b.totalSpent - a.totalSpent);

    const total30DaySpend = list.reduce((sum, i) => sum + i.totalSpent, 0);
    const activeVendorsCount = list.filter((i) => i.totalSpent > 0).length;

    const chartData = list.map((item, idx) => {
      const rawName = item.name || 'Vendor';
      return {
        ...item,
        displayName: rawName.length > 15 ? `${rawName.slice(0, 13)}…` : rawName,
        percentage: total30DaySpend > 0 ? ((item.totalSpent / total30DaySpend) * 100).toFixed(1) : '0',
        colorIndex: idx,
      };
    });

    const topVendor = chartData[0]?.totalSpent > 0 ? chartData[0] : null;

    return {
      chartData,
      total30DaySpend,
      activeVendorsCount,
      topVendor,
      totalOrdersCount: recentPurchases.length,
    };
  }, [purchases, suppliers]);

  // Filtered suppliers with company name, contact person, normalized phone, category, and address
  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return suppliers;
    const cleanQ = q.replace(/[^0-9a-z]/gi, '');
    return suppliers.filter((s) => {
      const companyMatch = getSupplierName(s).toLowerCase().includes(q);
      const personMatch = Boolean(s.contactPerson && s.contactPerson.toLowerCase().includes(q));
      const categoryMatch = Boolean(getSupplierCategory(s).toLowerCase().includes(q));
      const addressMatch = Boolean(s.address && s.address.toLowerCase().includes(q));

      // Exact & normalized phone matching (e.g. 0300123 matches 0300-1234567 or +92 300 1234567)
      const rawPhone = (s.phone || '').replace(/[^0-9]/g, '');
      const phoneMatch = (s.phone || '').includes(q) || (cleanQ.length >= 3 && rawPhone.includes(cleanQ));

      return companyMatch || personMatch || categoryMatch || addressMatch || phoneMatch;
    });
  }, [suppliers, searchQuery]);

  // Paginated suppliers
  const paginatedSuppliers = useMemo(() => {
    const start = (supplierPage - 1) * supplierPageSize;
    return filteredSuppliers.slice(start, start + supplierPageSize);
  }, [filteredSuppliers, supplierPage, supplierPageSize]);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return purchases.filter(
      (p) =>
        !q ||
        (p.purchaseNo && p.purchaseNo.toLowerCase().includes(q)) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(q)) ||
        (p.date && p.date.includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
    );
  }, [purchases, searchQuery]);

  // Paginated purchases
  const paginatedPurchases = useMemo(() => {
    const start = (purchasePage - 1) * purchasePageSize;
    return filteredPurchases.slice(start, start + purchasePageSize);
  }, [filteredPurchases, purchasePage, purchasePageSize]);

  // Toggle select single supplier
  const handleToggleSelectSupplier = (id: string) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all suppliers on current page
  const handleToggleSelectAllSuppliers = () => {
    const allPageIds = paginatedSuppliers.map((s) => s.id);
    const isAllSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedSupplierIds.includes(id));
    if (isAllSelected) {
      setSelectedSupplierIds((prev) => prev.filter((id) => !allPageIds.includes(id)));
    } else {
      setSelectedSupplierIds((prev) => Array.from(new Set([...prev, ...allPageIds])));
    }
  };

  // Export Selected Suppliers to CSV
  const handleExportSelectedSuppliers = () => {
    const toExport = suppliers.filter((s) => selectedSupplierIds.includes(s.id));
    if (toExport.length === 0) return;

    const headers = [
      'Supplier ID',
      'Company Name',
      'Contact Person',
      'Phone Number',
      'Material Category',
      'Balance Payable (Rs)',
      'Total Purchased (Rs)',
      'Total Paid (Rs)',
    ];

    const rows = toExport.map((s) => [
      s.id,
      getSupplierName(s),
      s.contactPerson || '',
      s.phone || '',
      getSupplierCategory(s),
      s.balancePayable || 0,
      s.totalPurchased || 0,
      s.totalPaid || 0,
    ]);

    exportToCSV(`Suppliers_Export_${Date.now()}`, headers, rows);
  };

  // Batch delete suppliers
  const confirmBatchDeleteSuppliers = () => {
    selectedSupplierIds.forEach((id) => {
      OfflineDB.deleteSupplier(id, currentUser.email);
    });
    setSelectedSupplierIds([]);
    setIsBatchSupplierDeleteOpen(false);
    onRefreshData();
  };

  // Toggle select single purchase
  const handleToggleSelectPurchase = (id: string) => {
    setSelectedPurchaseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all purchases on current page
  const handleToggleSelectAllPurchases = () => {
    const allPageIds = paginatedPurchases.map((p) => p.id);
    const isAllSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedPurchaseIds.includes(id));
    if (isAllSelected) {
      setSelectedPurchaseIds((prev) => prev.filter((id) => !allPageIds.includes(id)));
    } else {
      setSelectedPurchaseIds((prev) => Array.from(new Set([...prev, ...allPageIds])));
    }
  };

  // Export Selected Purchases to CSV
  const handleExportSelectedPurchases = () => {
    const toExport = purchases.filter((p) => selectedPurchaseIds.includes(p.id));
    if (toExport.length === 0) return;

    const headers = [
      'Purchase Order #',
      'Date',
      'Supplier Name',
      'Total Amount (Rs)',
      'Payment Mode',
      'Items Count',
      'Received By',
      'Notes',
    ];

    const rows = toExport.map((p) => [
      p.purchaseNo || 'PUR-ORD',
      p.date || '',
      p.supplierName || 'Unknown Vendor',
      p.totalAmount || 0,
      p.paymentMethod || 'cash',
      (p.items || []).length,
      p.receivedBy || '',
      p.notes || '',
    ]);

    exportToCSV(`Purchases_Export_${Date.now()}`, headers, rows);
  };

  // Batch delete purchases
  const confirmBatchDeletePurchases = () => {
    selectedPurchaseIds.forEach((id) => {
      OfflineDB.deletePurchase(id, currentUser.email);
    });
    setSelectedPurchaseIds([]);
    setIsBatchPurchaseDeleteOpen(false);
    setPurchasesRefreshKey((prev) => prev + 1);
    onRefreshData();
  };

  // Add Item to purchase order
  const addPurchaseRow = () => {
    if (products.length === 0) return;
    setPurchaseItems((prev) => [
      ...prev,
      {
        productId: products[0].id,
        quantity: 10,
        costPrice: products[0].costPrice || 100,
      },
    ]);
  };

  const updatePurchaseRow = (index: number, field: string, value: any) => {
    setPurchaseItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'productId') {
        const p = products.find((prod) => prod.id === value);
        if (p) updated[index].costPrice = p.costPrice || 100;
      }
      return updated;
    });
  };

  const removePurchaseRow = (index: number) => {
    setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
  };

  const purchaseGrossTotal = useMemo(() => {
    return purchaseItems.reduce((acc, row) => acc + row.quantity * row.costPrice, 0);
  }, [purchaseItems]);

  // Save new Purchase Inward (Stock Inward)
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || purchaseItems.length === 0) return;

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    if (!supplier) return;

    const itemsMapped = purchaseItems.map((row) => {
      const prod = products.find((p) => p.id === row.productId);
      return {
        productId: row.productId,
        productName: prod ? prod.name : 'Product',
        quantity: Number(row.quantity) || 1,
        costPrice: Number(row.costPrice) || 0,
        totalCost: (Number(row.quantity) || 1) * (Number(row.costPrice) || 0),
      };
    });

    const supplierDisplayName = getSupplierName(supplier);
    const purchaseOrder: PurchaseOrder = {
      id: `pur-${Date.now()}`,
      purchaseNo: `PUR-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`,
      supplierId: supplier.id,
      supplierName: supplierDisplayName,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      items: itemsMapped,
      totalAmount: purchaseGrossTotal,
      paidAmount: purchasePaymentMethod === 'credit' ? 0 : purchaseGrossTotal,
      paymentMethod: purchasePaymentMethod,
      dueDate: purchaseDueDate,
      dueDateTimestamp: new Date(purchaseDueDate).getTime(),
      notes: purchaseNotes,
      receivedBy: currentUser.displayName || currentUser.email,
    };

    OfflineDB.recordPurchase(purchaseOrder, currentUser.email);
    setIsPurchaseModalOpen(false);
    setPurchaseItems([]);
    setPurchaseNotes('');
    setPurchasesRefreshKey((prev) => prev + 1);
    onRefreshData();
  };

  // Add/Edit Supplier Profile
  const openNewSupplier = () => {
    setEditingSupplier({
      id: `sup-${Date.now()}`,
      companyName: '',
      contactPerson: '',
      phone: '',
      category: 'Zari Raw Materials',
      balancePayable: 0,
    });
    setIsSupplierModalOpen(true);
  };

  const openEditSupplier = (sup: Supplier) => {
    setEditingSupplier({
      ...sup,
      companyName: getSupplierName(sup),
      category: getSupplierCategory(sup),
    });
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.companyName || !editingSupplier.phone) return;

    const compName = editingSupplier.companyName.trim();
    const cat = (editingSupplier.category || 'General').trim();

    const fullSup: Supplier = {
      id: editingSupplier.id || `sup-${Date.now()}`,
      name: compName,
      company: compName,
      companyName: compName,
      contactPerson: editingSupplier.contactPerson || '',
      phone: editingSupplier.phone,
      category: cat,
      categorySupplied: cat,
      balancePayable: Number(editingSupplier.balancePayable) || 0,
      totalPurchased: Number(editingSupplier.totalPurchased) || 0,
      totalPaid: Number(editingSupplier.totalPaid) || 0,
      createdAt: editingSupplier.createdAt || new Date().toISOString(),
    };

    OfflineDB.saveSupplier(fullSup);
    setIsSupplierModalOpen(false);
    setEditingSupplier(null);
    onRefreshData();
  };

  // Execute Supplier Deletion
  const confirmDeleteSupplier = () => {
    if (!supplierToDelete) return;
    OfflineDB.deleteSupplier(supplierToDelete.id, currentUser.email);
    setSupplierToDelete(null);
    onRefreshData();
  };

  // Execute Purchase Deletion
  const confirmDeletePurchase = () => {
    if (!purchaseToDelete) return;
    OfflineDB.deletePurchase(purchaseToDelete.id, currentUser.email);
    setPurchaseToDelete(null);
    setPurchasesRefreshKey((prev) => prev + 1);
    onRefreshData();
  };

  // Record Payment to Supplier (Reduces Balance Payable)
  const handleRecordSupplierPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSupplier) return;
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const updatedSup: Supplier = {
      ...paymentSupplier,
      totalPaid: (paymentSupplier.totalPaid || 0) + amount,
      balancePayable: Math.max(0, (paymentSupplier.balancePayable || 0) - amount),
    };

    const supDisplayName = getSupplierName(paymentSupplier);
    OfflineDB.saveSupplier(updatedSup);
    OfflineDB.addAuditLog({
      userEmail: currentUser.email,
      actionType: 'EXPENSE_CREATE',
      entityId: supDisplayName,
      details: `Paid Rs ${amount.toLocaleString()} to supplier "${supDisplayName}" via ${paymentMethod}. New Balance: Rs ${updatedSup.balancePayable}`,
    });

    setPaymentSupplier(null);
    setPaymentAmount('');
    setPaymentNotes('');
    onRefreshData();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-900">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-amber-400" />
            Supplier Khata & Stock Inward (Purchases)
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage raw material vendors, purchase inward orders, and accounts payable
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openNewSupplier}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            New Supplier
          </button>

          <button
            onClick={() => {
              addPurchaseRow();
              setIsPurchaseModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            New Stock Inward
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold">Active Vendor Partners</span>
          <div className="text-2xl font-black text-white mt-1">{suppliers.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Manufacturers & Importers</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold">Total Accounts Payable</span>
          <div className="text-2xl font-black text-red-400 mt-1">
            Rs {totalPayables.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Outstanding supplier debts</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold">Total Stock Inward Value</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            Rs {totalInwardPurchases.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{purchases.length} Inward Purchase Orders</p>
        </div>
      </div>

      {/* ================= 30-DAY SUPPLIER EXPENDITURE BAR CHART WIDGET ================= */}
      <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Supplier Expenditure (Last 30 Days)
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                  Rolling 30 Days
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Visualizing procurement spend per supplier to optimize vendor capital allocation and volume pricing
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">30-Day Sourced Total:</span>
              <span className="font-bold text-emerald-400">
                Rs {last30DaysExpenditureData.total30DaySpend.toLocaleString()}
              </span>
            </div>

            {last30DaysExpenditureData.topVendor && (
              <div className="px-3 py-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center gap-1.5 text-amber-300">
                <span className="text-slate-400 text-[11px]">Top Vendor:</span>
                <span className="font-bold">{last30DaysExpenditureData.topVendor.name}</span>
                <span className="text-[10px] text-amber-400 font-mono">
                  ({last30DaysExpenditureData.topVendor.percentage}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {last30DaysExpenditureData.chartData.length === 0 || last30DaysExpenditureData.total30DaySpend === 0 ? (
          <div className="py-8 text-center bg-slate-900/40 rounded-xl border border-slate-800/60">
            <CalendarDays className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-400">No stock inward purchases recorded in the last 30 days.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Record a new stock inward purchase to populate live expenditure bars.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={last30DaysExpenditureData.chartData}
                  margin={{ top: 10, right: 15, left: 15, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="displayName"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`)}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[200px]">
                          <p className="font-bold text-white text-sm border-b border-slate-800 pb-1 flex items-center justify-between">
                            <span>{data.name}</span>
                            <span className="text-[10px] text-amber-400 font-mono">#{data.supplierId}</span>
                          </p>
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400">30-Day Procurement:</span>
                            <span className="font-bold text-emerald-400 font-mono">
                              Rs {data.totalSpent.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400">Share of 30-Day Spend:</span>
                            <span className="font-bold text-amber-400 font-mono">
                              {data.percentage}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400">Inward Batches:</span>
                            <span className="font-bold text-slate-200">
                              {data.orderCount} {data.orderCount === 1 ? 'batch' : 'batches'}
                            </span>
                          </div>
                          {data.payable > 0 && (
                            <div className="flex justify-between items-center pt-1 border-t border-slate-800/80 text-[11px]">
                              <span className="text-red-400">Current Balance Payable:</span>
                              <span className="font-bold text-red-300 font-mono">
                                Rs {data.payable.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="totalSpent"
                    name="Expenditure"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={55}
                  >
                    {last30DaysExpenditureData.chartData.map((_, index) => {
                      const colors = [
                        '#f59e0b', // amber
                        '#10b981', // emerald
                        '#06b6d4', // cyan
                        '#6366f1', // indigo
                        '#ec4899', // pink
                        '#8b5cf6', // purple
                        '#14b8a6', // teal
                        '#f97316', // orange
                      ];
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={colors[index % colors.length]}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Supplier Spend Breakdown Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {last30DaysExpenditureData.chartData.slice(0, 4).map((item, idx) => (
                <div
                  key={item.supplierId || idx}
                  className="p-2.5 bg-slate-900/70 rounded-xl border border-slate-800/80 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300 truncate max-w-[120px]">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-bold text-amber-400 font-mono">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-white font-mono">
                      Rs {item.totalSpent.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {item.orderCount} {item.orderCount === 1 ? 'order' : 'orders'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap bg-slate-950/90 p-1.5 rounded-xl border border-slate-700/80 text-xs gap-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition cursor-pointer ${
              activeTab === 'suppliers'
                ? 'nav-tab-active bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold shadow-lg shadow-amber-500/25 ring-2 ring-amber-300/80'
                : 'nav-tab-inactive text-slate-200 hover:text-white hover:bg-slate-800/80 border border-slate-700/60'
            }`}
          >
            <Building className="w-4 h-4" />
            Supplier Accounts ({suppliers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition cursor-pointer ${
              activeTab === 'purchases'
                ? 'nav-tab-active bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold shadow-lg shadow-amber-500/25 ring-2 ring-amber-300/80'
                : 'nav-tab-inactive text-slate-200 hover:text-white hover:bg-slate-800/80 border border-slate-700/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            Stock Inward Purchases ({purchases.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('price_history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition cursor-pointer ${
              activeTab === 'price_history'
                ? 'nav-tab-active bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold shadow-lg shadow-amber-500/25 ring-2 ring-amber-300/80'
                : 'nav-tab-inactive text-slate-200 hover:text-white hover:bg-slate-800/80 border border-slate-700/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Price History & Negotiation Trends
          </button>
        </div>

        {activeTab !== 'price_history' && (
          <div className="flex items-center gap-2 w-full sm:w-80">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'suppliers'
                    ? 'Search vendor by name or phone (0300...)'
                    : 'Search purchase invoice #, supplier...'
                }
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= TAB 1: SUPPLIERS DIRECTORY ================= */}
      {activeTab === 'suppliers' && (
        <div className="space-y-3">
          {/* Supplier Bulk Action Bar */}
          {selectedSupplierIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-950">
                  {selectedSupplierIds.length}
                </span>
                <span className="text-xs font-medium text-amber-300">
                  supplier{selectedSupplierIds.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportSelectedSuppliers}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  Export Selected ({selectedSupplierIds.length})
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsBatchSupplierDeleteOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Selected
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedSupplierIds([])}
                  className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {searchQuery && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400">
              <span className="font-semibold">Showing {filteredSuppliers.length} of {suppliers.length} vendor contacts</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white underline cursor-pointer text-[11px]"
              >
                Clear Search
              </button>
            </div>
          )}

          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase font-semibold text-[11px]">
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          paginatedSuppliers.length > 0 &&
                          paginatedSuppliers.every((s) => selectedSupplierIds.includes(s.id))
                        }
                        onChange={handleToggleSelectAllSuppliers}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/40 cursor-pointer"
                        title="Select all on this page"
                      />
                    </th>
                    <th className="p-3.5">Vendor / Company</th>
                    <th className="p-3.5">Contact Person</th>
                    <th className="p-3.5">Phone Number</th>
                    <th className="p-3.5">Product Category</th>
                    <th className="p-3.5 text-right">Balance Payable (Rs)</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No suppliers found matching your query.
                      </td>
                    </tr>
                  ) : (
                    paginatedSuppliers.map((sup) => (
                      <tr
                        key={sup.id}
                        className={`hover:bg-slate-900/50 transition ${
                          selectedSupplierIds.includes(sup.id) ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedSupplierIds.includes(sup.id)}
                            onChange={() => handleToggleSelectSupplier(sup.id)}
                            className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/40 cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5 font-bold text-white flex items-center gap-2">
                          <Building className="w-4 h-4 text-amber-400" />
                          <div>
                            <div>{getSupplierName(sup)}</div>
                            <div className="text-[10px] text-slate-500 font-normal">ID: #{sup.id}</div>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-300">{sup.contactPerson || '—'}</td>
                        <td className="p-3.5 text-slate-400 font-mono">{sup.phone}</td>
                        <td className="p-3.5 text-slate-400">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]">
                            {getSupplierCategory(sup)}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-red-400">
                          Rs {(sup.balancePayable || 0).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Settle / Pay Button */}
                            <button
                              onClick={() => {
                                setPaymentSupplier(sup);
                                setPaymentAmount(sup.balancePayable > 0 ? sup.balancePayable.toString() : '');
                              }}
                              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition cursor-pointer"
                              title="Record Payment / Settle Balance"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Supplier */}
                            <button
                              onClick={() => openEditSupplier(sup)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                              title="Edit Supplier Profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Supplier Button */}
                            {isAdmin && (
                              <button
                                onClick={() => setSupplierToDelete(sup)}
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition cursor-pointer"
                                title="Delete Supplier Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Suppliers */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/40">
              <PaginationControls
                currentPage={supplierPage}
                pageSize={supplierPageSize}
                totalItems={filteredSuppliers.length}
                onPageChange={setSupplierPage}
                onPageSizeChange={(size) => {
                  setSupplierPageSize(size);
                  setSupplierPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: STOCK INWARD (PURCHASES) LOG ================= */}
      {activeTab === 'purchases' && (
        <div className="space-y-3">
          {/* Purchases Bulk Action Bar */}
          {selectedPurchaseIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-950">
                  {selectedPurchaseIds.length}
                </span>
                <span className="text-xs font-medium text-amber-300">
                  purchase{selectedPurchaseIds.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportSelectedPurchases}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  Export Selected ({selectedPurchaseIds.length})
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsBatchPurchaseDeleteOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Selected
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPurchaseIds([])}
                  className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase font-semibold text-[11px]">
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          paginatedPurchases.length > 0 &&
                          paginatedPurchases.every((p) => selectedPurchaseIds.includes(p.id))
                        }
                        onChange={handleToggleSelectAllPurchases}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/40 cursor-pointer"
                        title="Select all on this page"
                      />
                    </th>
                    <th className="p-3.5">Purchase Order #</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Supplier / Mill</th>
                    <th className="p-3.5">Items Inward</th>
                    <th className="p-3.5">Payment Mode</th>
                    <th className="p-3.5 text-right">Total Cost (Rs)</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No stock inward purchase orders recorded yet. Click "New Stock Inward" above to receive inventory.
                      </td>
                    </tr>
                  ) : (
                    paginatedPurchases.map((pur) => (
                      <tr
                        key={pur.id}
                        className={`hover:bg-slate-900/50 transition ${
                          selectedPurchaseIds.includes(pur.id) ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedPurchaseIds.includes(pur.id)}
                            onChange={() => handleToggleSelectPurchase(pur.id)}
                            className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/40 cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5 font-mono font-bold text-amber-300">
                          {pur.purchaseNo}
                        </td>
                        <td className="p-3.5 text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {pur.date}
                        </td>
                        <td className="p-3.5 font-semibold text-white">
                          {pur.supplierName}
                        </td>
                        <td className="p-3.5 text-slate-300">
                          <div className="space-y-0.5 max-w-xs">
                            {pur.items.map((item, idx) => (
                              <div key={idx} className="text-[11px] truncate text-slate-300">
                                • {item.productName || 'Product'} (x{item.quantity}) @ Rs {item.costPrice}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                pur.paymentMethod === 'cash'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : pur.paymentMethod === 'credit'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {pur.paymentMethod === 'credit' ? 'Credit Khata' : pur.paymentMethod}
                            </span>
                            {pur.dueDate && (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                  (() => {
                                    const diffDays = Math.ceil(
                                      (new Date(pur.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                                    );
                                    if ((pur.totalAmount || 0) > (pur.paidAmount || 0) && diffDays <= 3) {
                                      return 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse';
                                    }
                                    return 'bg-slate-800 text-slate-400 border border-slate-700';
                                  })()
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                {(() => {
                                  const diffDays = Math.ceil(
                                    (new Date(pur.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                                  );
                                  if ((pur.totalAmount || 0) <= (pur.paidAmount || 0)) return `Settled`;
                                  if (diffDays < 0) return `OVERDUE (${Math.abs(diffDays)}d ago)`;
                                  if (diffDays <= 3) return `Due in ${diffDays}d`;
                                  return `Due: ${pur.dueDate}`;
                                })()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-white">
                          Rs {pur.totalAmount.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center">
                          {/* Delete Purchase Order Button */}
                          {isAdmin && (
                            <button
                              onClick={() => setPurchaseToDelete(pur)}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition cursor-pointer"
                              title="Delete Stock Inward Purchase Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Purchases */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/40">
              <PaginationControls
                currentPage={purchasePage}
                pageSize={purchasePageSize}
                totalItems={filteredPurchases.length}
                onPageChange={setPurchasePage}
                onPageSizeChange={(size) => {
                  setPurchasePageSize(size);
                  setPurchasePage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: PRICE HISTORY & NEGOTIATION TRENDS ================= */}
      {activeTab === 'price_history' && (
        <SupplierPriceHistoryView
          suppliers={suppliers}
          products={products}
          purchases={purchases}
        />
      )}

      {/* ================= IN-APP DELETE SUPPLIER CONFIRMATION MODAL ================= */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Supplier Account</h3>
                <p className="text-xs text-slate-400">Remove vendor record from local database</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="text-slate-200 font-bold text-sm">{supplierToDelete.companyName}</div>
              <div className="text-slate-400">Contact: {supplierToDelete.contactPerson || 'N/A'}</div>
              <div className="text-slate-400 font-mono">Phone: {supplierToDelete.phone}</div>
              {supplierToDelete.balancePayable > 0 && (
                <div className="p-2 bg-red-500/15 border border-red-500/30 rounded-lg text-red-300 font-bold text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Warning: Outstanding Balance Payable of Rs {supplierToDelete.balancePayable.toLocaleString()}!
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSupplierToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSupplier}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Confirm Delete Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= IN-APP DELETE PURCHASE INWARD CONFIRMATION MODAL ================= */}
      {purchaseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Stock Inward Purchase</h3>
                <p className="text-xs text-slate-400">Roll back inward order and adjust balances</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="text-slate-200 font-bold">
                Order #{purchaseToDelete.purchaseNo} ({purchaseToDelete.date})
              </div>
              <div className="text-slate-400">Supplier: <span className="text-white font-semibold">{purchaseToDelete.supplierName}</span></div>
              <div className="text-slate-400">
                Amount: <span className="text-amber-300 font-mono font-bold">Rs {purchaseToDelete.totalAmount.toLocaleString()}</span> ({purchaseToDelete.paymentMethod.toUpperCase()})
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Deleting this purchase order will automatically roll back the supplier's balance and write an audit trail log.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPurchaseToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePurchase}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Confirm Delete Inward Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= QUICK SUPPLIER PAYMENT SETTLEMENT MODAL ================= */}
      {paymentSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Record Supplier Payment / Settlement
              </h3>
              <button onClick={() => setPaymentSupplier(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordSupplierPayment} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-slate-400">Supplier: <span className="font-bold text-white">{paymentSupplier.companyName}</span></div>
                <div className="text-slate-400 mt-0.5">
                  Current Payable: <span className="font-mono font-bold text-red-400">Rs {(paymentSupplier.balancePayable || 0).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Payment Amount (Rs) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount paid"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Payment Method</label>
                <select
                  aria-label="Payment Method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="Cash">Cash (Drawn from Register)</option>
                  <option value="Bank">Bank Online Transfer (Meezan / HBL)</option>
                  <option value="Cheque">Cheque / Demand Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Payment Reference / Notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Cheque #4592, Slip #8812"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentSupplier(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= NEW PURCHASE INWARD MODAL ================= */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 my-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-amber-400" />
                Record Stock Inward (Purchase Order)
              </h3>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Supplier *</label>
                  <select
                    aria-label="Select Supplier"
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {getSupplierName(s)} - Bal: Rs {s.balancePayable || 0}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Payment Method</label>
                  <select
                    aria-label="Select Payment Method"
                    value={purchasePaymentMethod}
                    onChange={(e) => setPurchasePaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="cash">Cash Paid (Deducts from Cash Drawer)</option>
                    <option value="credit">Supplier Credit / Udhaar (Adds to Payable)</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Payment Due Date (واجب الادا تاریخ)</label>
                  <input
                    type="date"
                    value={purchaseDueDate}
                    onChange={(e) => setPurchaseDueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-400 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-slate-300">Inward Line Items:</label>
                  <button
                    type="button"
                    onClick={addPurchaseRow}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {purchaseItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <select
                        aria-label={`Product Selection Item ${idx + 1}`}
                        value={item.productId}
                        onChange={(e) => updatePurchaseRow(idx, 'productId', e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updatePurchaseRow(idx, 'quantity', parseFloat(e.target.value) || 1)}
                          placeholder="Qty"
                          className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-center text-white"
                        />
                      </div>

                      <div className="w-28">
                        <input
                          type="number"
                          min="0"
                          value={item.costPrice}
                          onChange={(e) => updatePurchaseRow(idx, 'costPrice', parseFloat(e.target.value) || 0)}
                          placeholder="Cost Price"
                          className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-right text-white"
                        />
                      </div>

                      <div className="w-28 text-right font-bold text-amber-400 font-mono">
                        Rs {(item.quantity * item.costPrice).toLocaleString()}
                      </div>

                      <button
                        type="button"
                        onClick={() => removePurchaseRow(idx)}
                        className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Notes */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <input
                  type="text"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="Notes, carrier or consignment ref..."
                  className="w-1/2 bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />

                <div className="text-right">
                  <span className="text-slate-400 mr-2">Total Inward Value:</span>
                  <span className="text-lg font-black text-amber-400 font-mono">
                    Rs {purchaseGrossTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={purchaseItems.length === 0}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl shadow cursor-pointer"
                >
                  Receive Inward Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADD / EDIT SUPPLIER MODAL ================= */}
      {isSupplierModalOpen && editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingSupplier.createdAt ? 'Edit Supplier Profile' : 'Create Supplier Profile'}
              </h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 pt-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Company / Mill Name *</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.companyName || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, companyName: e.target.value })}
                  placeholder="e.g. Lahore Zari & Thread Mills"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editingSupplier.contactPerson || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, contactPerson: e.target.value })}
                  placeholder="e.g. Sheikh Naveed"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.phone || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    placeholder="0321-7654321"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Material Category</label>
                  <input
                    type="text"
                    value={editingSupplier.category || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, category: e.target.value })}
                    placeholder="Zari Raw Materials"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Opening Balance Payable (Rs)</label>
                <input
                  type="number"
                  min="0"
                  value={editingSupplier.balancePayable ?? 0}
                  onChange={(e) =>
                    setEditingSupplier({ ...editingSupplier, balancePayable: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow cursor-pointer"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= BATCH DELETE SUPPLIERS MODAL ================= */}
      {isBatchSupplierDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Batch Delete Suppliers</h3>
                <p className="text-xs text-slate-400">
                  Permanently remove {selectedSupplierIds.length} selected suppliers from your directory.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchSupplierDeleteOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBatchDeleteSuppliers}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20"
              >
                Delete {selectedSupplierIds.length} Suppliers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BATCH DELETE PURCHASES MODAL ================= */}
      {isBatchPurchaseDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Batch Delete Purchases</h3>
                <p className="text-xs text-slate-400">
                  Permanently remove {selectedPurchaseIds.length} selected purchase orders.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchPurchaseDeleteOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBatchDeletePurchases}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20"
              >
                Delete {selectedPurchaseIds.length} Purchases
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SupplierKhataModule = React.memo(SupplierKhataModuleComponent);
