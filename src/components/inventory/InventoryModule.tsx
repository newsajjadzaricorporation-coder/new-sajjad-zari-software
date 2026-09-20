import React, { useState, useMemo, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Download,
  Upload,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Edit2,
  Trash2,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Layers,
  Eye,
  EyeOff,
  CheckSquare,
} from 'lucide-react';
import { Product, UserProfile, UnitType } from '../../types';
import { OfflineDB } from '../../services/db';
import { CSVBulkImportModal } from './CSVBulkImportModal';
import { PaginationControls } from '../common/PaginationControls';
import { TableSkeleton } from '../common/SkeletonLoaders';
import { exportToCSV } from '../../utils/csvExport';
import { ActionLoaderModal, ActionLoaderState } from '../common/ActionLoaderModal';
import { useLanguage } from '../../context/LanguageContext';

function highlightMatch(text?: string | null, query?: string): React.ReactNode {
  if (!text) return null;
  const trimmed = (query || '').trim();
  if (!trimmed) return text;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  if (parts.length <= 1) return text;
  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-amber-400 text-slate-950 font-black px-1 py-0.5 rounded shadow-sm"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

interface InventoryModuleProps {
  products: Product[];
  currentUser: UserProfile;
  onRefreshProducts: () => void;
}

const InventoryModuleComponent: React.FC<InventoryModuleProps> = ({
  products,
  currentUser,
  onRefreshProducts,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Action Loader / Progress Modal state
  const [actionLoader, setActionLoader] = useState<ActionLoaderState>({
    isOpen: false,
    title: '',
    currentCount: 0,
    totalCount: 0,
    status: 'idle',
    actionIcon: 'delete',
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // Quick Adjust & Delete Modal States
  const [quickAdjustProduct, setQuickAdjustProduct] = useState<Product | null>(null);
  const [customAdjustValue, setCustomAdjustValue] = useState<string>('');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvImportResult, setCsvImportResult] = useState<{ successCount: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Categories
  const categories = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => {
      if (p.category) s.add(p.category);
    });
    return ['All', ...Array.from(s)];
  }, [products]);

  // Stock Valuation Metrics
  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const totalUnits = products.reduce((acc, p) => acc + p.stock, 0);
    const totalCostValue = products.reduce((acc, p) => acc + p.stock * (p.costPrice || 0), 0);
    const totalRetailValue = products.reduce((acc, p) => acc + p.stock * p.sellingPrice, 0);
    const potentialProfit = totalRetailValue - totalCostValue;
    const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStockAlert).length;
    const outOfStockCount = products.filter((p) => p.stock <= 0).length;

    return {
      totalProducts,
      totalUnits,
      totalCostValue,
      totalRetailValue,
      potentialProfit,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.urduName && p.urduName.includes(q)) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q);

      let matchStock = true;
      if (stockFilter === 'low') matchStock = p.stock > 0 && p.stock <= p.minStockAlert;
      if (stockFilter === 'out') matchStock = p.stock <= 0;

      return matchCat && matchSearch && matchStock;
    });
  }, [products, selectedCategory, searchQuery, stockFilter]);

  // Paginated products slice for instantaneous UI rendering
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Export Selected Products (.CSV)
  const handleExportSelected = () => {
    const selectedItems = products.filter((p) => selectedProductIds.includes(p.id));
    if (selectedItems.length === 0) return;

    const headers = [
      'SKU',
      'Product Name',
      'Urdu Name',
      'Category',
      'Cost Price (Rs)',
      'Selling Price (Rs)',
      'Current Stock',
      'Unit',
      'Barcode',
      'Min Stock Alert',
    ];

    const rows = selectedItems.map((p) => [
      p.sku,
      p.name,
      p.urduName || '',
      p.category,
      p.costPrice || 0,
      p.sellingPrice,
      p.stock,
      p.unit,
      p.barcode,
      p.minStockAlert,
    ]);

    exportToCSV(`selected_inventory_${Date.now()}`, headers, rows);
  };

  // Quick Stock Adjustment (+/- 1, 5, 10)
  const handleQuickStock = (productId: string, delta: number) => {
    OfflineDB.adjustStock(productId, delta);
    onRefreshProducts();
  };

  // Open Edit Modal
  const openNewProductModal = () => {
    setEditingProduct({
      id: `prod-${Date.now()}`,
      name: '',
      urduName: '',
      category: 'Zari & Tilla Threads',
      sku: `ZAR-${Date.now().toString().slice(-4)}`,
      barcode: `890${Math.floor(10000000 + Math.random() * 90000000)}`,
      costPrice: 100,
      sellingPrice: 150,
      stock: 50,
      minStockAlert: 15,
      unit: 'roll',
      notes: '',
    });
    setIsEditModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct({ ...product });
    setIsEditModalOpen(true);
  };

  // Save Product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.sku) return;

    const fullProduct: Product = {
      id: editingProduct.id || `prod-${Date.now()}`,
      name: editingProduct.name,
      urduName: editingProduct.urduName || '',
      category: editingProduct.category || 'General',
      sku: editingProduct.sku,
      barcode: editingProduct.barcode || editingProduct.sku,
      costPrice: Number(editingProduct.costPrice) || 0,
      sellingPrice: Number(editingProduct.sellingPrice) || 0,
      stock: Number(editingProduct.stock) || 0,
      minStockAlert: Number(editingProduct.minStockAlert) || 10,
      unit: (editingProduct.unit as UnitType) || 'piece',
      notes: editingProduct.notes || '',
      createdAt: editingProduct.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    OfflineDB.saveProduct(fullProduct, currentUser.email);
    setIsEditModalOpen(false);
    setEditingProduct(null);
    onRefreshProducts();
  };

  // Delete Product with custom in-app confirmation
  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDeleteProduct = () => {
    if (!productToDelete) return;
    OfflineDB.deleteProduct(productToDelete.id, currentUser?.email || 'admin');
    setSelectedProductIds((prev) => prev.filter((id) => id !== productToDelete.id));
    if (editingProduct && editingProduct.id === productToDelete.id) {
      setIsEditModalOpen(false);
      setEditingProduct(null);
    }
    setProductToDelete(null);
    onRefreshProducts();
  };

  // Multi-Select Handlers
  const handleToggleSelectProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleToggleSelectAll = () => {
    const pageIds = paginatedProducts.map((p) => p.id);
    const areAllPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedProductIds.includes(id));
    if (areAllPageSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredProducts.map((p) => p.id);
    setSelectedProductIds(allFilteredIds);
  };

  const handleOpenBatchDelete = () => {
    if (selectedProductIds.length === 0) return;
    setIsBatchDeleteModalOpen(true);
  };

  const confirmBatchDelete = async () => {
    if (selectedProductIds.length === 0) return;
    const count = selectedProductIds.length;
    setIsBatchDeleteModalOpen(false);

    setActionLoader({
      isOpen: true,
      title: 'Batch Deleting Products',
      description: `Purging ${count} selected records from database and updating indexes...`,
      currentCount: 0,
      totalCount: count,
      status: 'running',
      actionIcon: 'delete',
    });

    try {
      await OfflineDB.batchDeleteProductsAsync(
        selectedProductIds,
        currentUser?.email || 'admin',
        (processed, total) => {
          setActionLoader((prev) => ({
            ...prev,
            currentCount: processed,
            totalCount: total,
          }));
        }
      );

      setSelectedProductIds([]);
      setActionLoader((prev) => ({
        ...prev,
        status: 'completed',
        description: `Successfully deleted ${count} items without UI latency.`,
      }));

      onRefreshProducts();

      setTimeout(() => {
        setActionLoader((prev) => ({ ...prev, isOpen: false }));
      }, 1400);
    } catch (err: any) {
      setActionLoader((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err?.message || 'Failed to complete batch deletion.',
      }));
    }
  };

  // Export Low-Stock Report (.CSV)
  const handleExportLowStockReport = () => {
    const lowStockItems = products.filter((p) => p.stock <= p.minStockAlert);
    if (lowStockItems.length === 0) {
      alert('Great news! No inventory items are currently below minimum alert threshold.');
      return;
    }
    const headers = [
      'SKU',
      'Product Name',
      'Urdu Name',
      'Category',
      'Current Stock',
      'Min Alert Threshold',
      'Unit',
      'Shortage Qty',
      'Purchase Cost (Rs)',
      'Selling Price (Rs)',
      'Urgent Reorder Status',
    ];
    const rows = lowStockItems.map((p) => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.urduName || '').replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.stock,
      p.minStockAlert,
      `"${p.unit}"`,
      Math.max(0, p.minStockAlert - p.stock),
      p.costPrice,
      p.sellingPrice,
      `"${p.stock <= 0 ? 'OUT OF STOCK' : 'LOW STOCK'}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Sajjad_Zari_Low_Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export
  const handleExportCSV = () => {
    const csvContent = OfflineDB.exportProductsToCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Sajjad_Zari_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV File Reading
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  // Execute CSV Import
  const handleExecuteImport = () => {
    if (!csvText.trim()) return;
    const res = OfflineDB.importProductsFromCSV(csvText, currentUser.email);
    setCsvImportResult(res);
    onRefreshProducts();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-900">
      {/* Top Header & Valuation Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-amber-400" />
              Stock & Inventory Control
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Live valuation, SKU barcodes, unit pricing, and low-stock alerts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export Low-Stock Report Button */}
            <button
              onClick={handleExportLowStockReport}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                metrics.lowStockCount > 0 || metrics.outOfStockCount > 0
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Export low stock & out-of-stock items report"
            >
              <AlertTriangle className={`w-4 h-4 ${metrics.lowStockCount > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
              Export Low-Stock Report ({metrics.lowStockCount + metrics.outOfStockCount})
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Export Catalog CSV
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setCsvText('');
                  setCsvImportResult(null);
                  setIsCsvModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                Import CSV
              </button>
            )}

            <button
              onClick={openNewProductModal}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        </div>

        {/* Stock Valuation Summary Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Total Products */}
          <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1">
            <span className="text-xs font-medium text-slate-400">Total Catalog</span>
            <div className="text-xl sm:text-2xl font-black text-white">{metrics.totalProducts}</div>
            <div className="text-[11px] text-slate-400">{metrics.totalUnits} Units in Stock</div>
          </div>

          {/* Expected Retail Value */}
          <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1">
            <span className="text-xs font-medium text-slate-400">Retail Sales Value</span>
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              Rs {metrics.totalRetailValue.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">Expected gross revenue</div>
          </div>

          {/* Total Cost Value (Investment) - Admin Gated */}
          <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Inventory Cost</span>
              {!isAdmin && (
                <span title="Hidden from Staff">
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-200">
              {isAdmin ? `Rs ${metrics.totalCostValue.toLocaleString()}` : '••••••••'}
            </div>
            <div className="text-[11px] text-slate-400">Capital invested</div>
          </div>

          {/* Potential Gross Profit - Admin Gated */}
          <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Potential Profit</span>
              {!isAdmin && (
                <span title="Hidden from Staff">
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {isAdmin ? `Rs ${metrics.potentialProfit.toLocaleString()}` : '••••••••'}
            </div>
            <div className="text-[11px] text-slate-400">Margin spread</div>
          </div>

          {/* Stock Alerts Widget */}
          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-400">Stock Alerts</span>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  stockFilter === 'low'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                {metrics.lowStockCount} Low
              </button>
              <button
                onClick={() => {
                  setStockFilter(stockFilter === 'out' ? 'all' : 'out');
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  stockFilter === 'out'
                    ? 'bg-red-500 text-white'
                    : 'bg-red-500/10 text-red-300 hover:bg-red-500/20'
                }`}
              >
                {metrics.outOfStockCount} Out
              </button>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Click to filter table</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by product name, Urdu name, SKU, or barcode (matching rows will be highlighted)..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-24 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          {searchQuery.trim().length > 0 && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {filteredProducts.length} highlighted
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            aria-label="Filter Category"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 sm:flex-none bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          {stockFilter !== 'all' && (
            <button
              onClick={() => {
                setStockFilter('all');
                setCurrentPage(1);
              }}
              className="text-xs px-2.5 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Multi-Select Floating / Sticky Action Bar */}
      {selectedProductIds.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
              {selectedProductIds.length}
            </span>
            <span className="font-bold text-white">
              {selectedProductIds.length} product{selectedProductIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSelected}
              className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
              title="Export selected products to CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              Export Selected ({selectedProductIds.length})
            </button>
            <button
              onClick={() => setSelectedProductIds([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition cursor-pointer"
            >
              Deselect All
            </button>
            <button
              onClick={handleOpenBatchDelete}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/20 transition cursor-pointer"
              title="Delete all selected products from inventory"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedProductIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Inventory Products Table */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedProducts.length > 0 &&
                      paginatedProducts.every((p) => selectedProductIds.includes(p.id))
                    }
                    onChange={handleToggleSelectAll}
                    aria-label="Select Products on this page"
                    title={
                      paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedProductIds.includes(p.id))
                        ? 'Deselect all on this page'
                        : 'Select all on this page'
                    }
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 w-4 h-4 bg-slate-800 cursor-pointer"
                  />
                </th>
                <th className="p-3.5">Product / Urdu Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">SKU & Barcode</th>
                {isAdmin && <th className="p-3.5 text-right">Cost (Rs)</th>}
                <th className="p-3.5 text-right">Selling (Rs)</th>
                <th className="p-3.5 text-center">Stock Level</th>
                <th className="p-3.5 text-center">Quick Stock +/-</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="p-8 text-center text-slate-500">
                    No inventory products found matching your current filter.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                const isLow = p.stock > 0 && p.stock <= p.minStockAlert;
                const isSelected = selectedProductIds.includes(p.id);
                const isSearchActive = searchQuery.trim().length > 0;

                return (
                  <tr
                    key={p.id}
                    className={`transition group ${
                      isSelected
                        ? 'bg-amber-500/20 hover:bg-amber-500/25'
                        : isSearchActive
                        ? 'bg-amber-500/10 border-l-4 border-l-amber-400 hover:bg-amber-500/15 shadow-sm'
                        : 'hover:bg-slate-900/50'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectProduct(p.id)}
                        aria-label={`Select ${p.name}`}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 w-4 h-4 bg-slate-800 cursor-pointer"
                      />
                    </td>

                    {/* Name */}
                    <td className="p-3.5">
                      <div className="font-bold text-white text-sm">
                        {highlightMatch(p.name, searchQuery)}
                      </div>
                      {p.urduName && (
                        <div className="font-urdu text-amber-400/90 text-xs mt-0.5">
                          {highlightMatch(p.urduName, searchQuery)}
                        </div>
                      )}
                      {p.notes && <div className="text-[11px] text-slate-500 italic mt-0.5">{p.notes}</div>}
                    </td>

                    {/* Category */}
                    <td className="p-3.5 text-slate-300 font-medium">{p.category}</td>

                    {/* SKU & Barcode */}
                    <td className="p-3.5 font-mono">
                      <div className="text-amber-300/90 font-semibold">
                        {highlightMatch(p.sku, searchQuery)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {highlightMatch(p.barcode, searchQuery)}
                      </div>
                    </td>

                    {/* Cost (Admin Only) */}
                    {isAdmin && (
                      <td className="p-3.5 text-right text-slate-400 font-medium">
                        Rs {p.costPrice.toLocaleString()}
                      </td>
                    )}

                    {/* Selling Price */}
                    <td className="p-3.5 text-right font-bold text-white">
                      Rs {p.sellingPrice.toLocaleString()}
                      <span className="text-[10px] text-slate-500 font-normal"> /{p.unit}</span>
                    </td>

                    {/* Stock Level Badge */}
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          isOutOfStock
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : isLow
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {p.stock} {p.unit}
                      </span>
                    </td>

                    {/* Quick Stock Controls & Popover */}
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                        <button
                          onClick={() => handleQuickStock(p.id, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
                          title="Quick -1 unit"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleQuickStock(p.id, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
                          title="Quick +1 unit"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => {
                            setQuickAdjustProduct(p);
                            setCustomAdjustValue(p.stock.toString());
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-[11px] flex items-center gap-1 transition"
                          title="Open Quick Adjust stock dialog"
                        >
                          <Layers className="w-3 h-3" />
                          Adjust
                        </button>
                      </div>
                    </td>

                    {/* Edit & Delete Actions */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditProductModal(p)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition border border-transparent hover:border-red-500/20 cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Local Pagination Controls */}
        <PaginationControls
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[15, 25, 50, 100]}
          itemName="products"
        />
      </div>

      {/* ================= ADD / EDIT PRODUCT MODAL ================= */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 my-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {editingProduct.id?.startsWith('prod-') && !editingProduct.createdAt
                  ? 'Add New Zari Product'
                  : 'Edit Product Details'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Product Name (English) *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="e.g. Pure Gold Tilla Reel"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Product Urdu Title (اردو نام)</label>
                <input
                  type="text"
                  value={editingProduct.urduName || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, urduName: e.target.value })}
                  placeholder="مثال: خالص گولڈ تلہ ریل"
                  className="w-full font-urdu bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-amber-300 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Category</label>
                  <input
                    type="text"
                    value={editingProduct.category || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    placeholder="e.g. Zari & Tilla Threads"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unit of Measure</label>
                  <select
                    aria-label="Unit of Measure"
                    value={editingProduct.unit || 'piece'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value as UnitType })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="meter">Meter</option>
                    <option value="yard">Yard (Ghaz)</option>
                    <option value="roll">Roll / Reel</option>
                    <option value="piece">Piece (Thaan)</option>
                    <option value="packet">Packet</option>
                    <option value="dozen">Dozen</option>
                    <option value="box">Box</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">SKU / Item Code *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full font-mono bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Barcode</label>
                  <input
                    type="text"
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full font-mono bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Purchase Cost Price (Rs) {isAdmin ? '' : '(Hidden)'}
                  </label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={editingProduct.costPrice ?? 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, costPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Selling Price (Rs) *</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.sellingPrice ?? 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, sellingPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Current Stock Qty</label>
                  <input
                    type="number"
                    value={editingProduct.stock ?? 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stock: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Low-Stock Alert Level</label>
                  <input
                    type="number"
                    value={editingProduct.minStockAlert ?? 10}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, minStockAlert: parseFloat(e.target.value) || 10 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Notes / Specifications</label>
                <textarea
                  rows={2}
                  value={editingProduct.notes || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, notes: e.target.value })}
                  placeholder="Material specs, manufacturer, origin, etc."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-800">
                {editingProduct && editingProduct.id && (
                  <button
                    type="button"
                    onClick={() => {
                      const prod = products.find((p) => p.id === editingProduct.id);
                      if (prod) {
                        setProductToDelete(prod);
                      }
                    }}
                    className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Permanently remove this product from inventory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Product
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 text-xs cursor-pointer"
                  >
                    Save Product
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CSV BULK IMPORT MODAL WITH PRE-COMMIT VALIDATION ================= */}
      <CSVBulkImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        currentUser={currentUser}
        onSuccess={() => {
          onRefreshProducts();
        }}
      />

      {/* ================= QUICK ADJUST STOCK MODAL ================= */}
      {quickAdjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Quick Adjust Stock Level
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[220px]">
                  {quickAdjustProduct.name}
                </p>
              </div>
              <button
                onClick={() => setQuickAdjustProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400">Current In-Stock:</span>
                <span className="text-base font-black text-amber-300">
                  {quickAdjustProduct.stock} {quickAdjustProduct.unit}
                </span>
              </div>

              {/* Quick Step Buttons */}
              <div className="grid grid-cols-6 gap-1.5">
                {[-10, -5, -1, 1, 5, 10].map((delta) => (
                  <button
                    key={delta}
                    onClick={() => {
                      OfflineDB.adjustStock(quickAdjustProduct.id, delta);
                      onRefreshProducts();
                      const updated = OfflineDB.getProducts().find((p) => p.id === quickAdjustProduct.id);
                      if (updated) {
                        setQuickAdjustProduct(updated);
                        setCustomAdjustValue(updated.stock.toString());
                      }
                    }}
                    className={`py-2 rounded-lg font-bold text-xs transition ${
                      delta < 0
                        ? 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
                        : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </button>
                ))}
              </div>

              {/* Direct Stock Override Form */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Set Exact Physical Stock Count:
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={customAdjustValue}
                    onChange={(e) => setCustomAdjustValue(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                    placeholder="Enter stock count"
                  />
                  <button
                    onClick={() => {
                      const newStock = Number(customAdjustValue);
                      if (!isNaN(newStock) && newStock >= 0) {
                        OfflineDB.saveProduct(
                          { ...quickAdjustProduct, stock: newStock },
                          currentUser.email
                        );
                        onRefreshProducts();
                        setQuickAdjustProduct(null);
                      }
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setQuickAdjustProduct(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= IN-APP DELETE PRODUCT CONFIRMATION MODAL ================= */}
      {productToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Product from Inventory</h3>
                <p className="text-xs text-slate-400">This action will remove the item from local catalog</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-200 font-bold">{productToDelete.name}</div>
              {productToDelete.urduName && (
                <div className="text-amber-300 font-urdu">{productToDelete.urduName}</div>
              )}
              <div className="text-slate-400 font-mono text-[11px]">
                SKU: {productToDelete.sku} | Barcode: {productToDelete.barcode}
              </div>
              <div className="text-slate-400">
                Current Stock: <span className="font-bold text-white">{productToDelete.stock} {productToDelete.unit}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProduct}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20"
              >
                Confirm Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= IN-APP BATCH DELETE CONFIRMATION MODAL ================= */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Batch Delete Selected Products</h3>
                <p className="text-xs text-slate-400">Permanently remove selected catalog items</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="text-slate-200 font-bold">
                You are about to delete <span className="text-amber-400">{selectedProductIds.length}</span> selected product(s).
              </div>
              <p className="text-slate-400 text-[11px]">
                This will purge these records from the local inventory and write audit log entries.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmBatchDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20"
              >
                Delete Selected ({selectedProductIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Batch Action Progress Loader */}
      <ActionLoaderModal
        state={actionLoader}
        onClose={() => setActionLoader((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export const InventoryModule = React.memo(InventoryModuleComponent);
