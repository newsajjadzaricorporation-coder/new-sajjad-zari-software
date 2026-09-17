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
} from 'lucide-react';
import { Product, UserProfile, UnitType } from '../../types';
import { OfflineDB } from '../../services/db';

interface InventoryModuleProps {
  products: Product[];
  currentUser: UserProfile;
  onRefreshProducts: () => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  products,
  currentUser,
  onRefreshProducts,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

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

  // Delete Product
  const handleDeleteProduct = (productId: string) => {
    if (!isAdmin) {
      alert('Only administrators can delete inventory products.');
      return;
    }
    if (confirm('Are you sure you want to permanently delete this product?')) {
      OfflineDB.deleteProduct(productId, currentUser.email);
      onRefreshProducts();
    }
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
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Export CSV
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
                onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
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
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, or barcode..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            aria-label="Filter Category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          {stockFilter !== 'all' && (
            <button
              onClick={() => setStockFilter('all')}
              className="text-xs px-2.5 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Inventory Products Table */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
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
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                const isLow = p.stock > 0 && p.stock <= p.minStockAlert;

                return (
                  <tr key={p.id} className="hover:bg-slate-900/50 transition group">
                    {/* Name */}
                    <td className="p-3.5">
                      <div className="font-bold text-white text-sm">{p.name}</div>
                      {p.urduName && (
                        <div className="font-urdu text-amber-400/90 text-xs mt-0.5">{p.urduName}</div>
                      )}
                      {p.notes && <div className="text-[11px] text-slate-500 italic mt-0.5">{p.notes}</div>}
                    </td>

                    {/* Category */}
                    <td className="p-3.5 text-slate-300 font-medium">{p.category}</td>

                    {/* SKU & Barcode */}
                    <td className="p-3.5 font-mono">
                      <div className="text-amber-300/90 font-semibold">{p.sku}</div>
                      <div className="text-[11px] text-slate-500">{p.barcode}</div>
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

                    {/* Quick Stock Controls */}
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                        <button
                          onClick={() => handleQuickStock(p.id, -1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                          title="-1"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleQuickStock(p.id, 1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                          title="+1"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleQuickStock(p.id, 5)}
                          className="w-6 h-6 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-[10px]"
                          title="+5"
                        >
                          +5
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
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CSV BULK IMPORT MODAL ================= */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 my-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Bulk CSV Inventory Import
              </h3>
              <button onClick={() => setIsCsvModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Upload or paste a CSV spreadsheet to import multiple products into the inventory database.
              Existing SKUs will update; new ones will be created.
            </p>

            {/* File Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-xl p-6 text-center cursor-pointer bg-slate-950/40 transition"
            >
              <Upload className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-white">Click or drag & drop CSV file</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Supports .csv exported from Excel or Google Sheets</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* CSV Raw Text Editor */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">CSV Data Content:</label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="ID,Name,Urdu Name,Category,SKU,Barcode,Purchase Cost,Selling Price,Stock Qty,Unit,Min Alert,Notes..."
                className="w-full font-mono text-[11px] bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Result Report */}
            {csvImportResult && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  csvImportResult.successCount > 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Successfully processed {csvImportResult.successCount} products!
                </div>
                {csvImportResult.errors.length > 0 && (
                  <ul className="mt-1.5 list-disc list-inside text-[11px] text-slate-400">
                    {csvImportResult.errors.slice(0, 3).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
              >
                Close
              </button>
              <button
                disabled={!csvText.trim()}
                onClick={handleExecuteImport}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs shadow"
              >
                Process Bulk Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
