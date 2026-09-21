import React, { useState, useMemo } from 'react';
import {
  Layers,
  DollarSign,
  TrendingUp,
  Percent,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2,
  X,
  Sliders,
  Sparkles,
  Package,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Product, UserProfile } from '../../types';

export type StockUpdateMode = 'no_change' | 'set_exact' | 'add_stock' | 'subtract_stock';
export type PriceUpdateMode =
  | 'no_change'
  | 'set_exact'
  | 'percent_increase'
  | 'percent_decrease'
  | 'flat_increase'
  | 'flat_decrease';

export interface BulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: Product[];
  currentUser: UserProfile;
  onApply: (updates: Array<Partial<Product> & { id: string }>) => Promise<void>;
  onRemoveFromSelection?: (productId: string) => void;
}

export const BulkUpdateModal: React.FC<BulkUpdateModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedProducts,
  currentUser,
  onApply,
  onRemoveFromSelection,
}) => {
  const isAdmin = currentUser.role === 'admin';

  // Stock Form State
  const [stockMode, setStockMode] = useState<StockUpdateMode>('no_change');
  const [stockValue, setStockValue] = useState<string>('10');

  // Selling Price Form State
  const [sellingPriceMode, setSellingPriceMode] = useState<PriceUpdateMode>('no_change');
  const [sellingPriceValue, setSellingPriceValue] = useState<string>('10');
  const [roundToTen, setRoundToTen] = useState<boolean>(false);

  // Cost Price Form State (Admin Only)
  const [costPriceMode, setCostPriceMode] = useState<PriceUpdateMode>('no_change');
  const [costPriceValue, setCostPriceValue] = useState<string>('10');

  // Min Stock Alert Threshold
  const [minAlertMode, setMinAlertMode] = useState<'no_change' | 'set_exact'>('no_change');
  const [minAlertValue, setMinAlertValue] = useState<string>('10');

  // Submitting and Safety Confirmation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [isSafetyConfirmOpen, setIsSafetyConfirmOpen] = useState(false);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);

  // Calculate new values for each product
  const previewData = useMemo(() => {
    const sVal = parseFloat(stockValue) || 0;
    const spVal = parseFloat(sellingPriceValue) || 0;
    const cpVal = parseFloat(costPriceValue) || 0;
    const maVal = parseInt(minAlertValue, 10) || 0;

    return selectedProducts.map((p) => {
      // 1. Calculate New Stock
      let newStock = p.stock;
      if (stockMode === 'set_exact') {
        newStock = Math.max(0, sVal);
      } else if (stockMode === 'add_stock') {
        newStock = Math.max(0, p.stock + sVal);
      } else if (stockMode === 'subtract_stock') {
        newStock = Math.max(0, p.stock - sVal);
      }

      // 2. Calculate New Selling Price
      let newSellingPrice = p.sellingPrice;
      if (sellingPriceMode === 'set_exact') {
        newSellingPrice = Math.max(0, spVal);
      } else if (sellingPriceMode === 'percent_increase') {
        newSellingPrice = p.sellingPrice * (1 + spVal / 100);
      } else if (sellingPriceMode === 'percent_decrease') {
        newSellingPrice = Math.max(0, p.sellingPrice * (1 - spVal / 100));
      } else if (sellingPriceMode === 'flat_increase') {
        newSellingPrice = p.sellingPrice + spVal;
      } else if (sellingPriceMode === 'flat_decrease') {
        newSellingPrice = Math.max(0, p.sellingPrice - spVal);
      }

      if (roundToTen && sellingPriceMode !== 'no_change') {
        newSellingPrice = Math.round(newSellingPrice / 10) * 10;
      } else {
        newSellingPrice = Math.round(newSellingPrice * 100) / 100;
      }

      // 3. Calculate New Cost Price (if admin)
      let newCostPrice = p.costPrice || 0;
      if (isAdmin) {
        if (costPriceMode === 'set_exact') {
          newCostPrice = Math.max(0, cpVal);
        } else if (costPriceMode === 'percent_increase') {
          newCostPrice = (p.costPrice || 0) * (1 + cpVal / 100);
        } else if (costPriceMode === 'percent_decrease') {
          newCostPrice = Math.max(0, (p.costPrice || 0) * (1 - cpVal / 100));
        } else if (costPriceMode === 'flat_increase') {
          newCostPrice = (p.costPrice || 0) + cpVal;
        } else if (costPriceMode === 'flat_decrease') {
          newCostPrice = Math.max(0, (p.costPrice || 0) - cpVal);
        }
        newCostPrice = Math.round(newCostPrice * 100) / 100;
      }

      // 4. Calculate New Min Alert
      let newMinAlert = p.minStockAlert;
      if (minAlertMode === 'set_exact') {
        newMinAlert = Math.max(1, maVal);
      }

      const hasStockChange = stockMode !== 'no_change' && newStock !== p.stock;
      const hasPriceChange = sellingPriceMode !== 'no_change' && newSellingPrice !== p.sellingPrice;
      const hasCostChange = isAdmin && costPriceMode !== 'no_change' && newCostPrice !== p.costPrice;
      const hasAlertChange = minAlertMode !== 'no_change' && newMinAlert !== p.minStockAlert;

      return {
        product: p,
        newStock,
        newSellingPrice,
        newCostPrice,
        newMinAlert,
        hasStockChange,
        hasPriceChange,
        hasCostChange,
        hasAlertChange,
        isModified: hasStockChange || hasPriceChange || hasCostChange || hasAlertChange,
      };
    });
  }, [
    selectedProducts,
    stockMode,
    stockValue,
    sellingPriceMode,
    sellingPriceValue,
    roundToTen,
    costPriceMode,
    costPriceValue,
    minAlertMode,
    minAlertValue,
    isAdmin,
  ]);

  // Aggregate Metrics Comparison
  const aggregateMetrics = useMemo(() => {
    let currentTotalUnits = 0;
    let newTotalUnits = 0;
    let currentRetailValue = 0;
    let newRetailValue = 0;
    let currentCostValue = 0;
    let newCostValue = 0;

    previewData.forEach((item) => {
      currentTotalUnits += item.product.stock;
      newTotalUnits += item.newStock;

      currentRetailValue += item.product.stock * item.product.sellingPrice;
      newRetailValue += item.newStock * item.newSellingPrice;

      if (isAdmin) {
        currentCostValue += item.product.stock * (item.product.costPrice || 0);
        newCostValue += item.newStock * item.newCostPrice;
      }
    });

    const stockDiff = newTotalUnits - currentTotalUnits;
    const retailDiff = newRetailValue - currentRetailValue;
    const costDiff = newCostValue - currentCostValue;

    return {
      currentTotalUnits,
      newTotalUnits,
      stockDiff,
      currentRetailValue,
      newRetailValue,
      retailDiff,
      currentCostValue,
      newCostValue,
      costDiff,
    };
  }, [previewData, isAdmin]);

  // Is at least one action selected
  const hasConfiguredChanges =
    stockMode !== 'no_change' ||
    sellingPriceMode !== 'no_change' ||
    (isAdmin && costPriceMode !== 'no_change') ||
    minAlertMode !== 'no_change';

  // Filtered preview items for table
  const filteredPreview = useMemo(() => {
    if (!searchFilter.trim()) return previewData;
    const q = searchFilter.toLowerCase().trim();
    return previewData.filter(
      (item) =>
        item.product.name.toLowerCase().includes(q) ||
        item.product.sku.toLowerCase().includes(q) ||
        (item.product.urduName && item.product.urduName.toLowerCase().includes(q))
    );
  }, [previewData, searchFilter]);

  if (!isOpen) return null;

  const handleOpenSafetyCheck = () => {
    if (!hasConfiguredChanges || isSubmitting) return;

    // Check if any product actually changed
    const modifiedCount = previewData.filter((i) => i.isModified).length;
    if (modifiedCount === 0) {
      return;
    }

    setSafetyAcknowledged(false);
    setIsSafetyConfirmOpen(true);
  };

  const executeConfirmedUpdates = async () => {
    if (!hasConfiguredChanges || isSubmitting) return;

    // Build updates payload
    const updates: Array<Partial<Product> & { id: string }> = [];

    previewData.forEach((item) => {
      if (item.isModified) {
        const updateObj: Partial<Product> & { id: string } = {
          id: item.product.id,
        };
        if (item.hasStockChange) updateObj.stock = item.newStock;
        if (item.hasPriceChange) updateObj.sellingPrice = item.newSellingPrice;
        if (item.hasCostChange) updateObj.costPrice = item.newCostPrice;
        if (item.hasAlertChange) updateObj.minStockAlert = item.newMinAlert;

        updates.push(updateObj);
      }
    });

    if (updates.length === 0) {
      setIsSafetyConfirmOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await onApply(updates);
      setIsSafetyConfirmOpen(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to apply bulk updates:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Bulk Update Products</span>
                  <span className="text-amber-400 font-urdu text-sm font-normal">
                    (بلک اپڈیٹ اسٹاک اور قیمت)
                  </span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {selectedProducts.length} Selected
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Apply batch stock increments, direct overrides, or price markups across multiple items simultaneously
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar text-xs">
          {/* SECTION 1: ACTION CONFIGURATION GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. STOCK ACTION CARD */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                stockMode !== 'no_change'
                  ? 'bg-slate-950 border-amber-500/50 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/20'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">Stock Level Adjustment</h3>
                    <p className="text-[11px] text-slate-400">Modify available inventory units</p>
                  </div>
                </div>
                {stockMode !== 'no_change' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-bold border border-blue-500/30">
                    Active
                  </span>
                )}
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Select Stock Action:
                  </label>
                  <select
                    value={stockMode}
                    onChange={(e) => setStockMode(e.target.value as StockUpdateMode)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="no_change">No Change (Keep Current Stock)</option>
                    <option value="add_stock">Add Quantity to Current Stock (+ Increase)</option>
                    <option value="subtract_stock">Subtract Quantity from Stock (- Decrease)</option>
                    <option value="set_exact">Set Exact Physical Stock Count (Override)</option>
                  </select>
                </div>

                {stockMode !== 'no_change' && (
                  <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-300">
                        {stockMode === 'set_exact'
                          ? 'New Physical Quantity:'
                          : stockMode === 'add_stock'
                          ? 'Units to Add to Each Product:'
                          : 'Units to Deduct from Each Product:'}
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {stockMode === 'subtract_stock' ? 'Clamped to min 0' : 'Whole units'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={stockValue}
                          onChange={(e) => setStockValue(e.target.value)}
                          placeholder="0"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      {/* Quick preset buttons */}
                      <div className="flex items-center gap-1">
                        {[5, 10, 25, 50].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setStockValue(num.toString())}
                            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition cursor-pointer border border-slate-700"
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. SELLING PRICE ACTION CARD */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                sellingPriceMode !== 'no_change'
                  ? 'bg-slate-950 border-emerald-500/50 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">Selling Price Adjustment</h3>
                    <p className="text-[11px] text-slate-400">Update retail customer rate (PKR)</p>
                  </div>
                </div>
                {sellingPriceMode !== 'no_change' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                    Active
                  </span>
                )}
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Select Price Action:
                  </label>
                  <select
                    value={sellingPriceMode}
                    onChange={(e) => setSellingPriceMode(e.target.value as PriceUpdateMode)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="no_change">No Change (Keep Current Selling Price)</option>
                    <option value="percent_increase">Increase by Percentage (+% Markup)</option>
                    <option value="percent_decrease">Decrease by Percentage (-% Discount)</option>
                    <option value="flat_increase">Increase by Flat Amount (+Rs X)</option>
                    <option value="flat_decrease">Decrease by Flat Amount (-Rs X)</option>
                    <option value="set_exact">Set Fixed Selling Price (e.g. Rs 250 for all)</option>
                  </select>
                </div>

                {sellingPriceMode !== 'no_change' && (
                  <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-300">
                        {sellingPriceMode.includes('percent') ? 'Percentage Rate (%):' : 'Amount in PKR (Rs):'}
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] text-slate-400 hover:text-white">
                        <input
                          type="checkbox"
                          checked={roundToTen}
                          onChange={(e) => setRoundToTen(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 w-3.5 h-3.5"
                        />
                        <span>Round to nearest Rs 10</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          step={sellingPriceMode.includes('percent') ? '0.5' : '1'}
                          value={sellingPriceValue}
                          onChange={(e) => setSellingPriceValue(e.target.value)}
                          placeholder="0"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">
                          {sellingPriceMode.includes('percent') ? '%' : 'Rs'}
                        </span>
                      </div>

                      {/* Quick preset buttons */}
                      <div className="flex items-center gap-1">
                        {sellingPriceMode.includes('percent')
                          ? [5, 10, 15, 20].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setSellingPriceValue(num.toString())}
                                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition cursor-pointer border border-slate-700"
                              >
                                {num}%
                              </button>
                            ))
                          : [20, 50, 100, 200].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setSellingPriceValue(num.toString())}
                                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition cursor-pointer border border-slate-700"
                              >
                                +{num}
                              </button>
                            ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: ADMIN & OPTIONAL ATTRIBUTES (COST & MIN ALERT) */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Additional Parameters (Optional)
              </span>
              {!isAdmin && (
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  Cost updates restricted to Admin
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cost Price Option (Admin Only) */}
              {isAdmin && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Cost / Wholesale Purchase Price:
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={costPriceMode}
                      onChange={(e) => setCostPriceMode(e.target.value as PriceUpdateMode)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 flex-1"
                    >
                      <option value="no_change">No Change in Cost</option>
                      <option value="percent_increase">Increase Cost by %</option>
                      <option value="percent_decrease">Decrease Cost by %</option>
                      <option value="flat_increase">Increase Cost by Flat Amount</option>
                      <option value="set_exact">Set Fixed Cost Price</option>
                    </select>
                    {costPriceMode !== 'no_change' && (
                      <input
                        type="number"
                        min="0"
                        value={costPriceValue}
                        onChange={(e) => setCostPriceValue(e.target.value)}
                        placeholder="Value"
                        className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Min Stock Alert Option */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Minimum Stock Warning Threshold:
                </label>
                <div className="flex gap-2">
                  <select
                    value={minAlertMode}
                    onChange={(e) => setMinAlertMode(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 flex-1"
                  >
                    <option value="no_change">No Change in Alert Threshold</option>
                    <option value="set_exact">Set Universal Min Alert Qty</option>
                  </select>
                  {minAlertMode !== 'no_change' && (
                    <input
                      type="number"
                      min="1"
                      value={minAlertValue}
                      onChange={(e) => setMinAlertValue(e.target.value)}
                      placeholder="Qty"
                      className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: PROJECTED IMPACT SUMMARY STATS */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Projected Batch Impact (مجموعی تخمینہ)</span>
              <span>{previewData.filter((i) => i.isModified).length} of {previewData.length} items will update</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              {/* Total Stock Units Metric */}
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Total In-Stock Units:</div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <span>{aggregateMetrics.currentTotalUnits}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="text-amber-300 font-black">{aggregateMetrics.newTotalUnits}</span>
                </div>
                <div className="text-[10px] font-semibold mt-0.5">
                  {aggregateMetrics.stockDiff > 0 ? (
                    <span className="text-emerald-400">+{aggregateMetrics.stockDiff} units</span>
                  ) : aggregateMetrics.stockDiff < 0 ? (
                    <span className="text-rose-400">{aggregateMetrics.stockDiff} units</span>
                  ) : (
                    <span className="text-slate-500">No unit change</span>
                  )}
                </div>
              </div>

              {/* Total Retail Valuation Metric */}
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Total Retail Valuation:</div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <span>Rs {Math.round(aggregateMetrics.currentRetailValue).toLocaleString()}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="text-emerald-400 font-black">
                    Rs {Math.round(aggregateMetrics.newRetailValue).toLocaleString()}
                  </span>
                </div>
                <div className="text-[10px] font-semibold mt-0.5">
                  {aggregateMetrics.retailDiff > 0 ? (
                    <span className="text-emerald-400">
                      +Rs {Math.round(aggregateMetrics.retailDiff).toLocaleString()}
                    </span>
                  ) : aggregateMetrics.retailDiff < 0 ? (
                    <span className="text-rose-400">
                      -Rs {Math.round(Math.abs(aggregateMetrics.retailDiff)).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-slate-500">No valuation change</span>
                  )}
                </div>
              </div>

              {/* Items Impacted */}
              <div className="col-span-2 sm:col-span-1 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Batch Modification Status:</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {hasConfiguredChanges ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ready to Apply
                    </span>
                  ) : (
                    <span className="text-amber-400 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Select Action Above
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Applied atomically via async queue
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: PREVIEW TABLE */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Product Preview ({filteredPreview.length})
                </h4>
                <span className="text-[10px] text-slate-400">
                  Review calculated changes before updating database
                </span>
              </div>

              {/* Search in preview */}
              <input
                type="text"
                placeholder="Search selected products..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-full sm:w-48"
              />
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80 custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800 text-[11px] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Product / SKU</th>
                    <th className="py-2.5 px-3 text-center">Stock Change</th>
                    <th className="py-2.5 px-3 text-right">Selling Price Change</th>
                    {isAdmin && <th className="py-2.5 px-3 text-right">Cost Price</th>}
                    {onRemoveFromSelection && <th className="py-2.5 px-2 text-center w-8"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPreview.map((item) => (
                    <tr
                      key={item.product.id}
                      className={`hover:bg-slate-800/40 transition ${
                        item.isModified ? 'bg-amber-500/[0.02]' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{item.product.name}</span>
                          {item.product.urduName && (
                            <span className="text-amber-400/90 font-urdu text-[11px]">
                              ({item.product.urduName})
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          SKU: {item.product.sku} • {item.product.category}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-slate-400 font-mono text-[11px]">
                            {item.product.stock} {item.product.unit}
                          </span>
                          {item.hasStockChange ? (
                            <>
                              <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="px-1.5 py-0.5 rounded font-black text-amber-300 bg-amber-500/10 border border-amber-500/20 text-[11px]">
                                {item.newStock} {item.product.unit}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-600 text-[10px] italic">Unchanged</span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-slate-400 font-mono text-[11px]">
                            Rs {item.product.sellingPrice}
                          </span>
                          {item.hasPriceChange ? (
                            <>
                              <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="px-1.5 py-0.5 rounded font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 text-[11px]">
                                Rs {item.newSellingPrice}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-600 text-[10px] italic">Unchanged</span>
                          )}
                        </div>
                      </td>

                      {isAdmin && (
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-slate-400 font-mono text-[11px]">
                              Rs {item.product.costPrice || 0}
                            </span>
                            {item.hasCostChange ? (
                              <>
                                <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="px-1.5 py-0.5 rounded font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 text-[11px]">
                                  Rs {item.newCostPrice}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-600 text-[10px] italic">Unchanged</span>
                            )}
                          </div>
                        </td>
                      )}

                      {onRemoveFromSelection && (
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => onRemoveFromSelection(item.product.id)}
                            className="text-slate-500 hover:text-red-400 p-1 rounded transition"
                            title="Exclude this item from bulk update"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400">
            {hasConfiguredChanges ? (
              <span className="text-emerald-400 font-semibold">
                ✓ Ready to modify {previewData.filter((i) => i.isModified).length} products
              </span>
            ) : (
              <span className="text-amber-400">
                Configure Stock or Selling Price above to enable submission
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleOpenSafetyCheck}
              disabled={!hasConfiguredChanges || isSubmitting || selectedProducts.length === 0}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer ${
                hasConfiguredChanges && selectedProducts.length > 0 && !isSubmitting
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Review & Apply Updates ({selectedProducts.length})</span>
            </button>
          </div>
        </div>

        {/* SAFETY CONFIRMATION MODAL OVERLAY */}
        {isSafetyConfirmOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-slate-900 border border-amber-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Mass Update Safety Confirmation</h3>
                  <p className="text-xs text-slate-400">
                    Review and verify bulk modifications before committing to database
                  </p>
                </div>
              </div>

              {/* Summary Stats Box */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="text-slate-200 font-bold flex items-center justify-between">
                  <span>Target Products:</span>
                  <span className="text-amber-400 font-mono text-sm">{previewData.filter((i) => i.isModified).length} items to be updated</span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-300">
                  {stockMode !== 'no_change' && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Stock Modification:</span>
                      <span className="font-semibold text-amber-300">
                        {stockMode === 'set_exact' && `Set exact to ${stockValue} units`}
                        {stockMode === 'add_stock' && `Increment +${stockValue} units`}
                        {stockMode === 'subtract_stock' && `Decrement -${stockValue} units`}
                      </span>
                    </div>
                  )}

                  {sellingPriceMode !== 'no_change' && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Selling Price Modification:</span>
                      <span className="font-semibold text-emerald-300">
                        {sellingPriceMode === 'percent_increase' && `+${sellingPriceValue}% Markup`}
                        {sellingPriceMode === 'percent_decrease' && `-${sellingPriceValue}% Discount`}
                        {sellingPriceMode === 'flat_increase' && `+Rs ${sellingPriceValue} flat increase`}
                        {sellingPriceMode === 'flat_decrease' && `-Rs ${sellingPriceValue} flat decrease`}
                        {sellingPriceMode === 'set_exact' && `Fixed price Rs ${sellingPriceValue}`}
                      </span>
                    </div>
                  )}

                  {isAdmin && costPriceMode !== 'no_change' && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Cost Price Modification:</span>
                      <span className="font-semibold text-blue-300">
                        {costPriceMode} ({costPriceValue})
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 font-semibold">
                    <span className="text-slate-400">New Total Valuation:</span>
                    <span className="text-emerald-400 font-mono">
                      Rs {Math.round(aggregateMetrics.newRetailValue).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Safety Acknowledgment Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={safetyAcknowledged}
                  onChange={(e) => setSafetyAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded border-amber-500/50 bg-slate-900 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-amber-200/90 leading-snug">
                  I understand that these mass adjustments will take effect immediately and modify live POS sale prices and stock records.
                </span>
              </label>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSafetyConfirmOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={executeConfirmedUpdates}
                  disabled={!safetyAcknowledged || isSubmitting}
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                    safetyAcknowledged && !isSubmitting
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Applying...' : 'Confirm & Apply Updates'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
