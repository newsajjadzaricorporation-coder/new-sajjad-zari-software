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
  Sliders,
  RotateCcw,
  FolderInput,
  ShieldAlert,
  Tag,
  AlertCircle,
  FileDown,
  Sparkles,
} from 'lucide-react';
import { Product, UserProfile, UnitType } from '../../types';
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
import { OfflineDB } from '../../services/db';
import { CSVBulkImportModal } from './CSVBulkImportModal';
import { BulkUpdateModal } from './BulkUpdateModal';
import { SuggestCategoriesModal } from './SuggestCategoriesModal';
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

// Fuzzy search helper supporting substring, multi-token, sub-sequence, and category/SKU/name matching
function fuzzySearchMatch(target: string, query: string): boolean {
  if (!target || !query) return false;
  const t = target.toLowerCase();
  const q = query.toLowerCase();

  // 1. Direct Substring Match
  if (t.includes(q)) return true;

  // 2. Multi-token match: all space-separated terms in query exist in target
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((tok) => t.includes(tok))) {
    return true;
  }

  // 3. Sub-sequence Fuzzy Match (characters appear in sequence)
  let qIdx = 0;
  for (let tIdx = 0; tIdx < t.length && qIdx < q.length; tIdx++) {
    if (t[tIdx] === q[qIdx]) {
      qIdx++;
    }
  }
  if (qIdx === q.length) return true;

  // 4. Token-level sub-sequence match
  const tWords = t.split(/\s+/).filter(Boolean);
  for (const word of tWords) {
    let wIdx = 0;
    for (let cIdx = 0; cIdx < word.length && wIdx < q.length; cIdx++) {
      if (word[cIdx] === q[wIdx]) {
        wIdx++;
      }
    }
    if (wIdx === q.length) return true;
  }

  return false;
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
  const [categoryChartMetric, setCategoryChartMetric] = useState<'units' | 'valuation' | 'count'>('units');

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
  const [batchDeleteSafetyConfirmed, setBatchDeleteSafetyConfirmed] = useState(false);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);

  // Bulk Reset Stock State
  const [isBulkResetStockModalOpen, setIsBulkResetStockModalOpen] = useState(false);
  const [bulkResetStockValue, setBulkResetStockValue] = useState<string>('0');
  const [bulkResetSafetyConfirmed, setBulkResetSafetyConfirmed] = useState(false);

  // Move to Category State
  const [isMoveCategoryModalOpen, setIsMoveCategoryModalOpen] = useState(false);
  const [targetMoveCategory, setTargetMoveCategory] = useState<string>('');
  const [customMoveCategory, setCustomMoveCategory] = useState<string>('');
  const [moveCategorySafetyConfirmed, setMoveCategorySafetyConfirmed] = useState(false);

  // AI Suggest Categories State
  const [isSuggestCategoriesModalOpen, setIsSuggestCategoriesModalOpen] = useState(false);

  // Selected Product Objects for Bulk Actions
  const selectedProducts = useMemo(
    () => products.filter((p) => selectedProductIds.includes(p.id)),
    [products, selectedProductIds]
  );

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
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

  // Category Stock Distribution Bar Chart Data & Segment Analysis
  const categoryChartData = useMemo(() => {
    const map = new Map<string, { category: string; units: number; valuation: number; count: number }>();

    products.forEach((p) => {
      const cat = p.category?.trim() || 'Uncategorized';
      const existing = map.get(cat) || { category: cat, units: 0, valuation: 0, count: 0 };
      existing.units += Number(p.stock) || 0;
      existing.valuation += (Number(p.stock) || 0) * (Number(p.sellingPrice) || 0);
      existing.count += 1;
      map.set(cat, existing);
    });

    const arr = Array.from(map.values());

    if (categoryChartMetric === 'units') {
      arr.sort((a, b) => b.units - a.units);
    } else if (categoryChartMetric === 'valuation') {
      arr.sort((a, b) => b.valuation - a.valuation);
    } else {
      arr.sort((a, b) => b.count - a.count);
    }

    return arr;
  }, [products, categoryChartMetric]);

  // Filtered products with real-time fuzzy search & natural language query parser
  const filteredProducts = useMemo(() => {
    const rawQuery = searchQuery.toLowerCase().trim();

    // Natural Language Query Parsing (e.g., "show gold items under 5000", "below 1000", "over 2000")
    let maxPrice: number | null = null;
    let minPrice: number | null = null;
    let keywordQuery = rawQuery;

    const underMatch = rawQuery.match(/(?:under|below|less than|max)\s+(\d+)/i);
    if (underMatch) {
      maxPrice = parseInt(underMatch[1], 10);
      keywordQuery = keywordQuery.replace(underMatch[0], '').trim();
    }

    const overMatch = rawQuery.match(/(?:over|above|more than|min)\s+(\d+)/i);
    if (overMatch) {
      minPrice = parseInt(overMatch[1], 10);
      keywordQuery = keywordQuery.replace(overMatch[0], '').trim();
    }

    // Clean conversational filler words
    keywordQuery = keywordQuery
      .replace(/^(show|find|list|search|get)\s*(me)?\s*/i, '')
      .replace(/\s+(items|products|goods)\b/gi, '')
      .trim();

    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;

      let matchSearch = true;
      if (keywordQuery) {
        matchSearch =
          fuzzySearchMatch(p.name, keywordQuery) ||
          fuzzySearchMatch(p.sku, keywordQuery) ||
          fuzzySearchMatch(p.category, keywordQuery) ||
          (p.urduName ? p.urduName.toLowerCase().includes(keywordQuery) || fuzzySearchMatch(p.urduName, keywordQuery) : false) ||
          p.barcode.toLowerCase().includes(keywordQuery);
      }

      let matchPrice = true;
      if (maxPrice !== null && p.sellingPrice > maxPrice) matchPrice = false;
      if (minPrice !== null && p.sellingPrice < minPrice) matchPrice = false;

      let matchStock = true;
      if (stockFilter === 'low') matchStock = p.stock > 0 && p.stock <= p.minStockAlert;
      if (stockFilter === 'out') matchStock = p.stock <= 0;

      return matchCat && matchSearch && matchPrice && matchStock;
    });
  }, [products, selectedCategory, searchQuery, stockFilter]);

  // Paginated products slice for instantaneous UI rendering
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Export Selected Products to Clean CSV Audit Report
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
      'Total Cost Valuation (Rs)',
      'Total Retail Valuation (Rs)',
      'Gross Profit Margin (Rs)',
      'Margin Percentage (%)',
      'Notes / Details',
    ];

    const rows = selectedItems.map((p) => {
      const cost = p.costPrice || 0;
      const retail = p.sellingPrice || 0;
      const stock = p.stock || 0;
      const totalCost = cost * stock;
      const totalRetail = retail * stock;
      const profit = totalRetail - totalCost;
      const marginPct = retail > 0 ? (((retail - cost) / retail) * 100).toFixed(1) : '0.0';

      return [
        p.sku,
        p.name,
        p.urduName || '',
        p.category,
        cost,
        retail,
        stock,
        p.unit,
        p.barcode,
        p.minStockAlert,
        totalCost,
        totalRetail,
        profit,
        `${marginPct}%`,
        p.notes || '',
      ];
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    exportToCSV(`inventory_selected_audit_report_${timestamp}`, headers, rows);
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
    setBatchDeleteSafetyConfirmed(false);
    setIsBatchDeleteModalOpen(true);
  };

  const handleOpenBulkUpdate = () => {
    if (selectedProductIds.length === 0) return;
    setIsBulkUpdateModalOpen(true);
  };

  // Bulk Reset Stock Handlers
  const handleOpenBulkResetStock = () => {
    if (selectedProductIds.length === 0) return;
    setBulkResetStockValue('0');
    setBulkResetSafetyConfirmed(false);
    setIsBulkResetStockModalOpen(true);
  };

  const handleConfirmBulkResetStock = async () => {
    const targetStock = parseFloat(bulkResetStockValue);
    if (isNaN(targetStock) || targetStock < 0 || selectedProductIds.length === 0) return;

    setIsBulkResetStockModalOpen(false);
    const count = selectedProductIds.length;

    const updates = selectedProductIds.map((id) => ({
      id,
      stock: targetStock,
    }));

    setActionLoader({
      isOpen: true,
      title: 'Resetting Physical Stock',
      description: `Setting stock to ${targetStock} units across ${count} selected product(s)...`,
      currentCount: 0,
      totalCount: count,
      status: 'running',
      actionIcon: 'database',
    });

    try {
      await OfflineDB.batchUpdateProductsAsync(
        updates,
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
        description: `Successfully reset physical stock count for ${count} product(s) to ${targetStock} units.`,
      }));

      onRefreshProducts();

      setTimeout(() => {
        setActionLoader((prev) => ({ ...prev, isOpen: false }));
      }, 1400);
    } catch (err: any) {
      setActionLoader((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err?.message || 'Failed to complete physical stock reset.',
      }));
    }
  };

  // Move to Category Handlers
  const handleOpenMoveCategory = (initialCategory?: string) => {
    if (selectedProductIds.length === 0) return;
    const catList = categories.filter((c) => c !== 'All');
    setTargetMoveCategory(initialCategory || (catList.length > 0 ? catList[0] : 'General'));
    setCustomMoveCategory('');
    setMoveCategorySafetyConfirmed(false);
    setIsMoveCategoryModalOpen(true);
  };

  const handleConfirmMoveCategory = async () => {
    const finalCategory = (
      targetMoveCategory === '__NEW__' ? customMoveCategory : targetMoveCategory
    ).trim();

    if (!finalCategory || selectedProductIds.length === 0) return;

    setIsMoveCategoryModalOpen(false);
    const count = selectedProductIds.length;

    const updates = selectedProductIds.map((id) => ({
      id,
      category: finalCategory,
    }));

    setActionLoader({
      isOpen: true,
      title: 'Reclassifying Products',
      description: `Moving ${count} product(s) into category "${finalCategory}"...`,
      currentCount: 0,
      totalCount: count,
      status: 'running',
      actionIcon: 'database',
    });

    try {
      await OfflineDB.batchUpdateProductsAsync(
        updates,
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
        description: `Successfully reclassified ${count} product(s) to category "${finalCategory}".`,
      }));

      onRefreshProducts();

      setTimeout(() => {
        setActionLoader((prev) => ({ ...prev, isOpen: false }));
      }, 1400);
    } catch (err: any) {
      setActionLoader((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err?.message || 'Failed to reclassify products.',
      }));
    }
  };

  const handleApplyBulkUpdate = async (updates: Array<Partial<Product> & { id: string }>) => {
    const count = updates.length;
    setIsBulkUpdateModalOpen(false);

    setActionLoader({
      isOpen: true,
      title: 'Bulk Updating Products',
      description: `Applying stock adjustments and price updates across ${count} selected product(s)...`,
      currentCount: 0,
      totalCount: count,
      status: 'running',
      actionIcon: 'database',
    });

    try {
      await OfflineDB.batchUpdateProductsAsync(
        updates,
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
        description: `Successfully updated stock & pricing for ${count} product(s) in catalog.`,
      }));

      onRefreshProducts();

      setTimeout(() => {
        setActionLoader((prev) => ({ ...prev, isOpen: false }));
      }, 1400);
    } catch (err: any) {
      setActionLoader((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err?.message || 'Failed to complete bulk product update.',
      }));
    }
  };

  const handleRemoveFromBulkSelection = (productId: string) => {
    setSelectedProductIds((prev) => prev.filter((id) => id !== productId));
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
                onClick={() => setIsBulkImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                title="Bulk import products from CSV with validation preview and mapping"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Bulk CSV Import
              </button>
            )}

            {/* AI Suggest Categories Button in Header */}
            <button
              onClick={() => setIsSuggestCategoriesModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-500/20 to-amber-500/20 hover:from-purple-500/30 hover:to-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition shadow-sm hover:shadow-amber-500/10 cursor-pointer"
              title="Use Gemini AI to analyze product names & descriptions and suggest categories for batch updates"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Suggest Categories (AI)</span>
            </button>

            {selectedProductIds.length > 0 && (
              <button
                onClick={handleOpenBulkUpdate}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 transition animate-in fade-in cursor-pointer"
                title="Bulk update stock levels or prices for selected products"
              >
                <Sliders className="w-4 h-4" />
                Bulk Update ({selectedProductIds.length})
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

        {/* Category Stock Distribution & Segment Performance Bar Chart */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Stock Distribution & Category Segments</span>
                  <span className="text-xs text-amber-400 font-urdu font-normal">(کیٹیگری وائز اسٹاک ڈسٹریبیوشن)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Analyze inventory concentration across categories. Click any bar to filter product table.
                </p>
              </div>
            </div>

            {/* Metric Toggle Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setCategoryChartMetric('units')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  categoryChartMetric === 'units'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Stock Units
              </button>
              <button
                type="button"
                onClick={() => setCategoryChartMetric('valuation')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  categoryChartMetric === 'valuation'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Retail Value (Rs)
              </button>
              <button
                type="button"
                onClick={() => setCategoryChartMetric('count')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  categoryChartMetric === 'count'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Product SKUs
              </button>
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="category"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) =>
                    categoryChartMetric === 'valuation' && val >= 1000
                      ? `${Math.round(val / 1000)}k`
                      : `${val}`
                  }
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl text-xs shadow-2xl space-y-1.5 z-50">
                          <div className="flex items-center justify-between gap-4 font-bold text-white border-b border-slate-800 pb-1.5">
                            <span>Category: {item.category}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {item.count} SKUs
                            </span>
                          </div>
                          <div className="space-y-1 text-slate-300">
                            <div className="flex justify-between gap-6">
                              <span>Total Stock Units:</span>
                              <span className="font-bold text-amber-400">{item.units.toLocaleString()} units</span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span>Estimated Retail Value:</span>
                              <span className="font-bold text-emerald-400">Rs {item.valuation.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey={categoryChartMetric}
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  onClick={(entry: any) => {
                    if (entry && entry.category) {
                      setSelectedCategory(entry.category);
                      setCurrentPage(1);
                    }
                  }}
                >
                  {categoryChartData.map((_, index) => {
                    const colors = ['#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#a855f7', '#f43f5e', '#eab308'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
            placeholder="Fuzzy search products by name, SKU, or category in real-time (highlighted rows)..."
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

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Update Stock & Price */}
            <button
              onClick={handleOpenBulkUpdate}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
              title="Bulk update stock levels or prices for all selected products"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Bulk Update Stock & Price</span>
            </button>

            {/* Suggest Categories with AI */}
            <button
              onClick={() => setIsSuggestCategoriesModalOpen(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600/30 to-amber-600/30 hover:from-purple-600/40 hover:to-amber-600/40 text-amber-300 border border-amber-500/40 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
              title="Use Gemini AI to analyze and suggest categories for selected products"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Suggest Categories (AI)</span>
            </button>

            {/* Move to Category Dropdown / Button */}
            <div className="flex items-center">
              <button
                onClick={() => handleOpenMoveCategory()}
                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
                title="Reclassify all selected products into a category"
              >
                <FolderInput className="w-3.5 h-3.5 text-blue-400" />
                <span>Move to Category...</span>
              </button>
            </div>

            {/* Bulk Reset Stock (Admin Feature) */}
            {isAdmin && (
              <button
                onClick={handleOpenBulkResetStock}
                className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
                title="Set physical stock count for periodic inventory audit verification"
              >
                <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                <span>Bulk Reset Stock</span>
              </button>
            )}

            {/* Export Selected to CSV */}
            <button
              onClick={handleExportSelected}
              className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
              title="Export selected inventory items as a clean CSV report for external audit"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Selected to CSV ({selectedProductIds.length})</span>
            </button>

            {/* Delete Selected */}
            <button
              onClick={handleOpenBatchDelete}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/20 transition cursor-pointer"
              title="Delete all selected products from inventory"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>

            {/* Deselect All */}
            <button
              onClick={() => setSelectedProductIds([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition cursor-pointer"
            >
              Deselect All
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-red-500/50 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Mass Deletion Safety Confirmation</h3>
                <p className="text-xs text-slate-400">Permanently remove selected catalog items</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs">
              <div className="text-slate-200 font-bold flex items-center justify-between">
                <span>Items Selected for Deletion:</span>
                <span className="text-red-400 font-mono text-sm">{selectedProductIds.length} products</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                ⚠️ <strong className="text-slate-200">Warning:</strong> Deleting these products will purge them from POS catalog search and barcode lookup. Historical sales logs will retain their line items.
              </p>

              {/* Scrollable list preview */}
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/80 p-2 divide-y divide-slate-800/60 custom-scrollbar">
                {selectedProducts.slice(0, 15).map((p) => (
                  <div key={p.id} className="py-1.5 flex items-center justify-between text-[11px]">
                    <div className="truncate mr-2">
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-slate-500 font-mono ml-1.5">({p.sku})</span>
                    </div>
                    <span className="text-slate-400 shrink-0 font-mono">
                      {p.stock} {p.unit}
                    </span>
                  </div>
                ))}
                {selectedProducts.length > 15 && (
                  <div className="py-1 text-center text-[10px] text-slate-500 italic">
                    ...and {selectedProducts.length - 15} more items
                  </div>
                )}
              </div>
            </div>

            {/* Safety Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={batchDeleteSafetyConfirmed}
                onChange={(e) => setBatchDeleteSafetyConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-red-500/50 bg-slate-900 text-red-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-red-200/90 leading-snug">
                I understand that deleting {selectedProductIds.length} product(s) is irreversible and removes them from active inventory.
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBatchDelete}
                disabled={!batchDeleteSafetyConfirmed}
                className={`px-5 py-2 rounded-xl text-xs font-bold shadow-lg transition ${
                  batchDeleteSafetyConfirmed
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Confirm Mass Deletion ({selectedProductIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BULK RESET STOCK SAFETY CONFIRMATION MODAL ================= */}
      {isBulkResetStockModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-purple-500/50 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Bulk Reset Physical Stock</h3>
                <p className="text-xs text-slate-400">
                  Periodic physical inventory count verification & stock override
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold">Target Physical Stock Count:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={bulkResetStockValue}
                    onChange={(e) => setBulkResetStockValue(e.target.value)}
                    className="w-24 px-3 py-1.5 bg-slate-900 border border-purple-500/50 rounded-lg text-white font-mono font-bold text-center focus:outline-none focus:border-purple-400 text-sm"
                  />
                  <span className="text-slate-400 text-xs">units</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200">
                ⚠️ <strong>Audit Notice:</strong> Setting physical stock will override the current stock quantity for all <strong className="text-white">{selectedProductIds.length}</strong> selected products to exactly <strong className="text-white">{bulkResetStockValue || 0} units</strong>. Discrepancies are recorded in audit logs.
              </div>

              {/* Scrollable Preview List */}
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/80 p-2 divide-y divide-slate-800/60 custom-scrollbar">
                {selectedProducts.slice(0, 15).map((p) => {
                  const targetNum = parseFloat(bulkResetStockValue) || 0;
                  const diff = targetNum - p.stock;
                  return (
                    <div key={p.id} className="py-1.5 flex items-center justify-between text-[11px]">
                      <div className="truncate mr-2">
                        <span className="font-semibold text-white">{p.name}</span>
                        <span className="text-slate-500 font-mono ml-1.5">({p.sku})</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono shrink-0">
                        <span className="text-slate-400">{p.stock}</span>
                        <span className="text-slate-600">→</span>
                        <span className="font-bold text-purple-300">{targetNum}</span>
                        <span className={`text-[10px] font-bold ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                          ({diff > 0 ? `+${diff}` : diff})
                        </span>
                      </div>
                    </div>
                  );
                })}
                {selectedProducts.length > 15 && (
                  <div className="py-1 text-center text-[10px] text-slate-500 italic">
                    ...and {selectedProducts.length - 15} more items
                  </div>
                )}
              </div>
            </div>

            {/* Safety Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bulkResetSafetyConfirmed}
                onChange={(e) => setBulkResetSafetyConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-purple-500/50 bg-slate-900 text-purple-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-purple-200/90 leading-snug">
                I confirm that physical stock verification was conducted and I approve setting stock to {bulkResetStockValue || 0} units across {selectedProductIds.length} products.
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsBulkResetStockModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkResetStock}
                disabled={!bulkResetSafetyConfirmed || isNaN(parseFloat(bulkResetStockValue))}
                className={`px-5 py-2 rounded-xl text-xs font-bold shadow-lg transition ${
                  bulkResetSafetyConfirmed && !isNaN(parseFloat(bulkResetStockValue))
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Confirm Physical Stock Reset ({selectedProductIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MOVE TO CATEGORY SAFETY CONFIRMATION MODAL ================= */}
      {isMoveCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-blue-500/50 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                <FolderInput className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Move to Category (Reclassify)</h3>
                <p className="text-xs text-slate-400">
                  Bulk assign selected products to a new or existing category
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Select Target Category:</label>
                <select
                  value={targetMoveCategory}
                  onChange={(e) => setTargetMoveCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium text-xs focus:outline-none focus:border-blue-400"
                >
                  {categories
                    .filter((c) => c !== 'All')
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  <option value="__NEW__">+ Create New Category...</option>
                </select>
              </div>

              {targetMoveCategory === '__NEW__' && (
                <div className="space-y-1 animate-in fade-in">
                  <label className="text-slate-400 text-[11px]">Enter New Category Name:</label>
                  <input
                    type="text"
                    placeholder="e.g. Bridal Zari Laces, Velvet Patches..."
                    value={customMoveCategory}
                    onChange={(e) => setCustomMoveCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-blue-500/60 rounded-xl text-white text-xs focus:outline-none focus:border-blue-400"
                    autoFocus
                  />
                </div>
              )}

              {/* Scrollable Preview List */}
              <div className="space-y-1">
                <div className="text-slate-400 text-[11px] font-medium">Selected Products Preview:</div>
                <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/80 p-2 divide-y divide-slate-800/60 custom-scrollbar">
                  {selectedProducts.slice(0, 15).map((p) => (
                    <div key={p.id} className="py-1 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-white truncate mr-2">{p.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                          {p.category}
                        </span>
                        <span className="text-slate-500">→</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px]">
                          {targetMoveCategory === '__NEW__'
                            ? customMoveCategory || 'New Category'
                            : targetMoveCategory}
                        </span>
                      </div>
                    </div>
                  ))}
                  {selectedProducts.length > 15 && (
                    <div className="py-1 text-center text-[10px] text-slate-500 italic">
                      ...and {selectedProducts.length - 15} more items
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Safety Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={moveCategorySafetyConfirmed}
                onChange={(e) => setMoveCategorySafetyConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-blue-500/50 bg-slate-900 text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-blue-200/90 leading-snug">
                I confirm reclassifying {selectedProductIds.length} product(s) into category "
                {targetMoveCategory === '__NEW__' ? customMoveCategory || '...' : targetMoveCategory}".
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsMoveCategoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMoveCategory}
                disabled={
                  !moveCategorySafetyConfirmed ||
                  (targetMoveCategory === '__NEW__' && !customMoveCategory.trim())
                }
                className={`px-5 py-2 rounded-xl text-xs font-bold shadow-lg transition ${
                  moveCategorySafetyConfirmed &&
                  (targetMoveCategory !== '__NEW__' || !!customMoveCategory.trim())
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Confirm Move Category ({selectedProductIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BULK STOCK & PRICE UPDATE MODAL ================= */}
      <BulkUpdateModal
        isOpen={isBulkUpdateModalOpen}
        onClose={() => setIsBulkUpdateModalOpen(false)}
        selectedProducts={selectedProducts}
        currentUser={currentUser}
        onApply={handleApplyBulkUpdate}
        onRemoveFromSelection={handleRemoveFromBulkSelection}
      />

      {/* ================= CSV BULK IMPORT MODAL ================= */}
      <CSVBulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        currentUser={currentUser}
        onSuccess={onRefreshProducts}
      />

      {/* ================= AI SUGGEST CATEGORIES MODAL ================= */}
      <SuggestCategoriesModal
        isOpen={isSuggestCategoriesModalOpen}
        onClose={() => setIsSuggestCategoriesModalOpen(false)}
        products={products}
        selectedProductIds={selectedProductIds}
        currentUser={currentUser}
        onApplied={() => {
          setSelectedProductIds([]);
          onRefreshProducts();
        }}
      />

      {/* Global Batch Action Progress Loader */}
      <ActionLoaderModal
        state={actionLoader}
        onClose={() => setActionLoader((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export const InventoryModule = React.memo(InventoryModuleComponent);
