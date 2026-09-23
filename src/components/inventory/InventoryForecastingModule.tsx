import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Package,
  ShoppingCart,
  ShieldCheck,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Sliders,
  X,
  Info,
  Layers,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Product, SaleInvoice } from '../../types';
import { OfflineDB } from '../../services/db';
import { exportToCSV } from '../../utils/csvExport';

interface InventoryForecastingModuleProps {
  products: Product[];
  sales?: SaleInvoice[];
}

export interface ForecastItem {
  product: Product;
  unitsSold30d: number;
  revenue30d: number;
  salesCount30d: number;
  dailyVelocity: number; // units / day
  leadTimeDemand: number;
  safetyStock: number;
  reorderPoint: number;
  daysRemaining: number;
  projectedStockOutDate: Date | null;
  projectedStockOutFormatted: string;
  isBreachedROP: boolean;
  suggestedReorderQty: number;
  estimatedReorderCost: number;
  urgency: 'OUT_OF_STOCK' | 'CRITICAL' | 'REORDER_DUE' | 'WATCHLIST' | 'HEALTHY' | 'OVERSTOCKED';
  urgencyLabel: string;
  urgencyColor: string;
  urgencyBg: string;
}

export const InventoryForecastingModule: React.FC<InventoryForecastingModuleProps> = ({
  products,
  sales: propsSales,
}) => {
  // Configurable Forecasting Parameters
  const [leadTimeDays, setLeadTimeDays] = useState<number>(7);
  const [safetyBufferDays, setSafetyBufferDays] = useState<number>(7);
  const [replenishmentHorizonDays, setReplenishmentHorizonDays] = useState<number>(30);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'reorder' | 'critical' | 'healthy' | 'overstocked'>('all');
  const [sortBy, setSortBy] = useState<'runway_asc' | 'velocity_desc' | 'rop_desc' | 'cost_desc' | 'stock_asc'>('runway_asc');

  // Selected Product for Burn-down Modal
  const [selectedForecastItem, setSelectedForecastItem] = useState<ForecastItem | null>(null);

  // Supplier PO Preview Modal
  const [isSupplierPOModalOpen, setIsSupplierPOModalOpen] = useState(false);

  // Extract / Cache Sales for 30-Day Period
  const salesData = useMemo(() => {
    return propsSales && propsSales.length > 0 ? propsSales : OfflineDB.getSales();
  }, [propsSales]);

  // Aggregate 30-day sales volume per product
  const sales30dMap = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const map = new Map<string, { units: number; revenue: number; transactions: number }>();

    for (let i = 0; i < salesData.length; i++) {
      const s = salesData[i];
      if (!s) continue;
      const ts = s.timestamp || (s.date ? new Date(s.date).getTime() : 0);
      if (ts < thirtyDaysAgo || !s.items || !Array.isArray(s.items)) continue;

      for (let j = 0; j < s.items.length; j++) {
        const item = s.items[j];
        if (!item?.product?.id) continue;
        const pid = item.product.id;
        const qty = Number(item.quantity) || 0;
        const rev = (item.unitPrice || 0) * qty - (item.itemDiscount || 0);

        const current = map.get(pid) || { units: 0, revenue: 0, transactions: 0 };
        current.units += qty;
        current.revenue += rev;
        current.transactions += 1;
        map.set(pid, current);
      }
    }

    return map;
  }, [salesData]);

  // Available Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [products]);

  // Compute Forecast Metrics for every product
  const forecastList = useMemo<ForecastItem[]>(() => {
    const now = Date.now();

    return products.map((p) => {
      const stats = sales30dMap.get(p.id) || { units: 0, revenue: 0, transactions: 0 };
      const unitsSold30d = stats.units;
      const revenue30d = stats.revenue;
      const salesCount30d = stats.transactions;

      // 30-Day Average Daily Sales (ADS / Velocity)
      const dailyVelocity = parseFloat((unitsSold30d / 30).toFixed(2));

      // Lead Time Demand = Velocity × Lead Time
      const leadTimeDemand = parseFloat((dailyVelocity * leadTimeDays).toFixed(2));

      // Safety Stock: buffer against demand volatility (uses configured safety days or product's minStockAlert if higher)
      const dynamicSafetyStock = Math.ceil(dailyVelocity * safetyBufferDays);
      const safetyStock = Math.max(p.minStockAlert || 0, dynamicSafetyStock, 2);

      // Reorder Point (ROP) = Lead Time Demand + Safety Stock
      const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);

      // Days of Inventory Remaining (Runway)
      let daysRemaining = 9999;
      let projectedStockOutDate: Date | null = null;
      let projectedStockOutFormatted = 'No Sales History';

      if (p.stock <= 0) {
        daysRemaining = 0;
        projectedStockOutDate = new Date(now);
        projectedStockOutFormatted = 'Already Depleted';
      } else if (dailyVelocity > 0) {
        daysRemaining = parseFloat((p.stock / dailyVelocity).toFixed(1));
        const outTs = now + daysRemaining * 24 * 60 * 60 * 1000;
        projectedStockOutDate = new Date(outTs);
        projectedStockOutFormatted = projectedStockOutDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      } else {
        daysRemaining = p.stock > 0 ? 9999 : 0;
        projectedStockOutFormatted = 'Stagnant (0 Velocity)';
      }

      // Reorder Point Status & Urgency Classification
      const isBreachedROP = p.stock <= reorderPoint;

      let urgency: ForecastItem['urgency'] = 'HEALTHY';
      let urgencyLabel = 'Healthy Buffer';
      let urgencyColor = 'text-emerald-400 border-emerald-500/30';
      let urgencyBg = 'bg-emerald-500/10';

      if (p.stock <= 0) {
        urgency = 'OUT_OF_STOCK';
        urgencyLabel = 'Out of Stock';
        urgencyColor = 'text-rose-400 border-rose-500/40';
        urgencyBg = 'bg-rose-500/10';
      } else if (daysRemaining <= 3 && dailyVelocity > 0) {
        urgency = 'CRITICAL';
        urgencyLabel = 'Stockout in ≤ 3d';
        urgencyColor = 'text-red-400 border-red-500/40';
        urgencyBg = 'bg-red-500/10';
      } else if (isBreachedROP || daysRemaining <= leadTimeDays + safetyBufferDays) {
        urgency = 'REORDER_DUE';
        urgencyLabel = 'Reorder Required';
        urgencyColor = 'text-amber-400 border-amber-500/40';
        urgencyBg = 'bg-amber-500/10';
      } else if (daysRemaining <= 30) {
        urgency = 'WATCHLIST';
        urgencyLabel = 'Monitor (≤ 30d)';
        urgencyColor = 'text-sky-400 border-sky-500/30';
        urgencyBg = 'bg-sky-500/10';
      } else if (daysRemaining > 90 || (p.stock > 50 && dailyVelocity === 0)) {
        urgency = 'OVERSTOCKED';
        urgencyLabel = 'Overstocked / Stagnant';
        urgencyColor = 'text-purple-400 border-purple-500/30';
        urgencyBg = 'bg-purple-500/10';
      }

      // Suggested Reorder Quantity to achieve target Replenishment Horizon
      let suggestedReorderQty = 0;
      if (isBreachedROP || p.stock <= (p.minStockAlert || 5)) {
        if (dailyVelocity > 0) {
          const targetStock = Math.ceil(dailyVelocity * (leadTimeDays + replenishmentHorizonDays));
          suggestedReorderQty = Math.max(0, targetStock - p.stock);
        } else {
          // If 0 velocity but below min stock alert, suggest default replenishment
          suggestedReorderQty = Math.max(10, (p.minStockAlert || 5) * 2 - p.stock);
        }
      }

      const estimatedReorderCost = Math.round(suggestedReorderQty * (p.costPrice || 0));

      return {
        product: p,
        unitsSold30d,
        revenue30d,
        salesCount30d,
        dailyVelocity,
        leadTimeDemand,
        safetyStock,
        reorderPoint,
        daysRemaining,
        projectedStockOutDate,
        projectedStockOutFormatted,
        isBreachedROP,
        suggestedReorderQty,
        estimatedReorderCost,
        urgency,
        urgencyLabel,
        urgencyColor,
        urgencyBg,
      };
    });
  }, [products, sales30dMap, leadTimeDays, safetyBufferDays, replenishmentHorizonDays]);

  // High-level KPI Summary
  const kpiSummary = useMemo(() => {
    let outOfStockCount = 0;
    let criticalStockoutCount = 0;
    let reorderNeededCount = 0;
    let healthyCount = 0;
    let totalSuggestedRestockCost = 0;
    let totalSuggestedRestockUnits = 0;
    let total30dUnitsSold = 0;
    let fastestItem: ForecastItem | null = null;

    forecastList.forEach((item) => {
      if (item.urgency === 'OUT_OF_STOCK') outOfStockCount++;
      if (item.urgency === 'CRITICAL') criticalStockoutCount++;
      if (item.isBreachedROP || item.suggestedReorderQty > 0) {
        reorderNeededCount++;
        totalSuggestedRestockCost += item.estimatedReorderCost;
        totalSuggestedRestockUnits += item.suggestedReorderQty;
      }
      if (item.urgency === 'HEALTHY') healthyCount++;
      total30dUnitsSold += item.unitsSold30d;

      if (!fastestItem || item.dailyVelocity > fastestItem.dailyVelocity) {
        fastestItem = item;
      }
    });

    return {
      outOfStockCount,
      criticalStockoutCount,
      reorderNeededCount,
      healthyCount,
      totalSuggestedRestockCost,
      totalSuggestedRestockUnits,
      total30dUnitsSold,
      fastestItem,
    };
  }, [forecastList]);

  // Filtered & Sorted Forecast List
  const filteredForecastList = useMemo(() => {
    return forecastList
      .filter((item) => {
        // Search Query filter (matches name, urdu name, sku, barcode, category)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const p = item.product;
          const matchName = p.name.toLowerCase().includes(q);
          const matchUrdu = p.urduName ? p.urduName.toLowerCase().includes(q) : false;
          const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
          const matchBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
          const matchCategory = p.category ? p.category.toLowerCase().includes(q) : false;
          if (!matchName && !matchUrdu && !matchSku && !matchBarcode && !matchCategory) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== 'All' && item.product.category !== selectedCategory) {
          return false;
        }

        // Urgency filter
        if (urgencyFilter === 'reorder') {
          return item.isBreachedROP || item.suggestedReorderQty > 0;
        }
        if (urgencyFilter === 'critical') {
          return item.urgency === 'OUT_OF_STOCK' || item.urgency === 'CRITICAL';
        }
        if (urgencyFilter === 'healthy') {
          return item.urgency === 'HEALTHY' || item.urgency === 'WATCHLIST';
        }
        if (urgencyFilter === 'overstocked') {
          return item.urgency === 'OVERSTOCKED';
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'runway_asc') {
          return a.daysRemaining - b.daysRemaining;
        }
        if (sortBy === 'velocity_desc') {
          return b.dailyVelocity - a.dailyVelocity;
        }
        if (sortBy === 'rop_desc') {
          return b.reorderPoint - a.reorderPoint;
        }
        if (sortBy === 'cost_desc') {
          return b.estimatedReorderCost - a.estimatedReorderCost;
        }
        if (sortBy === 'stock_asc') {
          return a.product.stock - b.product.stock;
        }
        return 0;
      });
  }, [forecastList, searchQuery, selectedCategory, urgencyFilter, sortBy]);

  // Export full forecast to CSV
  const handleExportCSV = () => {
    const headers = [
      'Product Name',
      'Urdu Name',
      'SKU',
      'Category',
      'Unit',
      'Current Stock',
      'Cost Price (Rs)',
      'Selling Price (Rs)',
      '30-Day Sales Volume',
      'Avg Daily Sales (ADS)',
      'Config Lead Time (Days)',
      'Lead Time Demand',
      'Safety Stock',
      'Reorder Point (ROP)',
      'Days Runway Left',
      'Projected Stockout Date',
      'Reorder Needed?',
      'Suggested Reorder Qty',
      'Est Reorder Cost (Rs)',
      'Urgency Status',
    ];

    const rows = filteredForecastList.map((item) => [
      item.product.name,
      item.product.urduName || '',
      item.product.sku,
      item.product.category,
      item.product.unit,
      item.product.stock,
      item.product.costPrice,
      item.product.sellingPrice,
      item.unitsSold30d,
      item.dailyVelocity,
      leadTimeDays,
      item.leadTimeDemand,
      item.safetyStock,
      item.reorderPoint,
      item.daysRemaining === 9999 ? 'No Projected Depletion' : item.daysRemaining,
      item.projectedStockOutFormatted,
      item.isBreachedROP ? 'YES (Below ROP)' : 'NO (Adequate)',
      item.suggestedReorderQty,
      item.estimatedReorderCost,
      item.urgencyLabel,
    ]);

    const dateStr = new Date().toISOString().split('T')[0];
    exportToCSV(`inventory_forecasting_rop_${dateStr}`, headers, rows);
  };

  // Generate Projected 30-Day Burn-down Chart Data for Modal
  const burnDownData = useMemo(() => {
    if (!selectedForecastItem) return [];
    const item = selectedForecastItem;
    const initialStock = item.product.stock;
    const velocity = Math.max(0.1, item.dailyVelocity > 0 ? item.dailyVelocity : 0.5);

    const points = [];
    const totalDays = Math.min(60, Math.max(15, Math.ceil(item.daysRemaining * 1.5)));

    for (let day = 0; day <= totalDays; day++) {
      const projectedStock = Math.max(0, parseFloat((initialStock - day * velocity).toFixed(1)));
      const d = new Date(Date.now() + day * 24 * 60 * 60 * 1000);
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      points.push({
        day: `Day ${day}`,
        dateLabel,
        stock: projectedStock,
        reorderPoint: item.reorderPoint,
        safetyStock: item.safetyStock,
      });
    }

    return points;
  }, [selectedForecastItem]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Inventory Forecasting & Stock-Out Projection
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  30-Day Historical Velocity
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Calculates Reorder Point (ROP = Lead Time Demand + Safety Stock) and predicts exact stock-out dates using rolling 30-day sales volume.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setIsSupplierPOModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Generate Supplier PO ({kpiSummary.reorderNeededCount})</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Forecast CSV</span>
            </button>
          </div>
        </div>

        {/* Dynamic Forecasting Parameter Sliders / Buttons */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Supplier Lead Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Supplier Lead Time:
              </span>
              <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {leadTimeDays} Days
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[3, 5, 7, 10, 14, 21].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setLeadTimeDays(d)}
                  className={`flex-1 py-1 rounded text-center font-bold transition cursor-pointer ${
                    leadTimeDays === d
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">Days from PO placement to delivery arrival</p>
          </div>

          {/* Safety Stock Buffer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Safety Buffer Days:
              </span>
              <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {safetyBufferDays} Days
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[3, 5, 7, 10, 14].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSafetyBufferDays(d)}
                  className={`flex-1 py-1 rounded text-center font-bold transition cursor-pointer ${
                    safetyBufferDays === d
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">Emergency buffer for sudden sales surges</p>
          </div>

          {/* Replenishment Target Horizon */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                Procurement Horizon:
              </span>
              <span className="font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                {replenishmentHorizonDays} Days
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[15, 30, 45, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setReplenishmentHorizonDays(d)}
                  className={`flex-1 py-1 rounded text-center font-bold transition cursor-pointer ${
                    replenishmentHorizonDays === d
                      ? 'bg-sky-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">Target stock coverage duration to order</p>
          </div>
        </div>

        {/* High-Impact Executive KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {/* Card 1: Critical Stockouts */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-500/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-rose-300 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Imminent Stock-Outs
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                  ≤ 3 Days
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
                {kpiSummary.criticalStockoutCount + kpiSummary.outOfStockCount}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {kpiSummary.outOfStockCount} out of stock, {kpiSummary.criticalStockoutCount} about to deplete
            </p>
          </div>

          {/* Card 2: Reorder Point Breached */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                  Below Reorder Point
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                  ROP Triggered
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
                {kpiSummary.reorderNeededCount}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Products where Current Stock ≤ ROP threshold
            </p>
          </div>

          {/* Card 3: Forecasted Restock Capital */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs text-slate-400 font-semibold">Forecasted PO Capital</span>
              <div className="text-lg sm:text-xl font-black text-emerald-400 mt-1">
                Rs {kpiSummary.totalSuggestedRestockCost.toLocaleString()}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {kpiSummary.totalSuggestedRestockUnits.toLocaleString()} units to restore 30-day stock
            </p>
          </div>

          {/* Card 4: Top Run-Rate Velocity Product */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs text-slate-400 font-semibold">Top Fast-Moving Mover</span>
              <div className="text-xs sm:text-sm font-bold text-white mt-1 truncate" title={kpiSummary.fastestItem?.product.name}>
                {kpiSummary.fastestItem?.product.name || 'N/A'}
              </div>
            </div>
            <p className="text-[10px] text-amber-400/90 font-mono mt-1">
              {kpiSummary.fastestItem ? `${kpiSummary.fastestItem.dailyVelocity} units/day` : '0 units'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product by name, Urdu title, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="runway_asc">Stockout Date (Soonest First)</option>
            <option value="velocity_desc">Daily Velocity (Highest First)</option>
            <option value="rop_desc">Reorder Point (Highest First)</option>
            <option value="cost_desc">Restock Cost (Highest First)</option>
            <option value="stock_asc">Current Stock (Lowest First)</option>
          </select>
        </div>

        {/* Urgency Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setUrgencyFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              urgencyFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Items ({forecastList.length})
          </button>
          <button
            type="button"
            onClick={() => setUrgencyFilter('critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              urgencyFilter === 'critical'
                ? 'bg-rose-500 text-white font-black'
                : 'bg-slate-900 text-rose-400 hover:bg-slate-800 border border-rose-500/30'
            }`}
          >
            Critical (≤ 3d)
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-950 border border-rose-500/40 text-rose-300">
              {kpiSummary.criticalStockoutCount + kpiSummary.outOfStockCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setUrgencyFilter('reorder')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              urgencyFilter === 'reorder'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-900 text-amber-400 hover:bg-slate-800 border border-amber-500/30'
            }`}
          >
            Below ROP
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 border border-amber-500/40 text-amber-300">
              {kpiSummary.reorderNeededCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setUrgencyFilter('healthy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              urgencyFilter === 'healthy'
                ? 'bg-emerald-500 text-slate-950 font-black'
                : 'bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-emerald-500/30'
            }`}
          >
            Healthy
          </button>
          <button
            type="button"
            onClick={() => setUrgencyFilter('overstocked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              urgencyFilter === 'overstocked'
                ? 'bg-purple-500 text-white font-black'
                : 'bg-slate-900 text-purple-400 hover:bg-slate-800 border border-purple-500/30'
            }`}
          >
            Overstocked
          </button>
        </div>
      </div>

      {/* Main Forecasting Table */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-3 text-center">Current Stock</th>
                <th className="py-3 px-3 text-center">30-Day Velocity (ADS)</th>
                <th className="py-3 px-3 text-center">Reorder Point (ROP)</th>
                <th className="py-3 px-4">Projected Stock-out</th>
                <th className="py-3 px-3 text-center">Inventory Runway</th>
                <th className="py-3 px-3 text-center">Suggested PO Qty</th>
                <th className="py-3 px-4 text-right">Est. Restock Cost</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredForecastList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-white">No products matched the forecasting criteria.</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting the search query or urgency filter.</p>
                  </td>
                </tr>
              ) : (
                filteredForecastList.map((item) => (
                  <tr
                    key={item.product.id}
                    className={`hover:bg-slate-900/60 transition ${
                      item.isBreachedROP ? 'bg-amber-500/[0.02]' : ''
                    }`}
                  >
                    {/* Product Name & SKU */}
                    <td className="py-3 px-4 max-w-[220px]">
                      <div className="font-bold text-white truncate" title={item.product.name}>
                        {item.product.name}
                      </div>
                      {item.product.urduName && (
                        <div className="text-[11px] text-amber-400 font-urdu truncate leading-tight">
                          {item.product.urduName}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-mono bg-slate-900 px-1 py-0.2 rounded border border-slate-800">
                          {item.product.sku}
                        </span>
                        <span>•</span>
                        <span className="truncate">{item.product.category}</span>
                      </div>
                    </td>

                    {/* Current Stock */}
                    <td className="py-3 px-3 text-center">
                      <div
                        className={`font-black text-sm font-mono ${
                          item.product.stock <= 0
                            ? 'text-rose-400'
                            : item.isBreachedROP
                            ? 'text-amber-400'
                            : 'text-white'
                        }`}
                      >
                        {item.product.stock}
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase">{item.product.unit}</span>
                    </td>

                    {/* 30-Day Velocity */}
                    <td className="py-3 px-3 text-center">
                      <div className="font-bold text-white font-mono flex items-center justify-center gap-1">
                        <span>{item.dailyVelocity}</span>
                        <span className="text-[10px] text-slate-500">/day</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{item.unitsSold30d} sold / 30d</span>
                    </td>

                    {/* Reorder Point (ROP) */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`font-bold font-mono px-2 py-0.5 rounded text-xs border ${
                            item.isBreachedROP
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-900 text-slate-300 border-slate-800'
                          }`}
                        >
                          {item.reorderPoint} {item.product.unit}
                        </span>
                        <span className="text-[9px] text-slate-500 mt-0.5">
                          LT:{Math.round(item.leadTimeDemand)} + SS:{item.safetyStock}
                        </span>
                      </div>
                    </td>

                    {/* Projected Stock-out Date */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.projectedStockOutFormatted}</span>
                      </div>
                      <div className="mt-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.urgencyBg} ${item.urgencyColor}`}
                        >
                          {item.urgencyLabel}
                        </span>
                      </div>
                    </td>

                    {/* Inventory Runway */}
                    <td className="py-3 px-3 text-center">
                      {item.daysRemaining === 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          0 Days (Empty)
                        </span>
                      ) : item.daysRemaining === 9999 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-slate-400 border border-slate-800">
                          90+ Days
                        </span>
                      ) : (
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-mono font-bold text-xs ${
                              item.daysRemaining <= 3
                                ? 'text-rose-400'
                                : item.daysRemaining <= 7
                                ? 'text-amber-400'
                                : 'text-slate-200'
                            }`}
                          >
                            {item.daysRemaining} Days
                          </span>
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.daysRemaining <= 3
                                  ? 'bg-rose-500'
                                  : item.daysRemaining <= 7
                                  ? 'bg-amber-500'
                                  : item.daysRemaining <= 30
                                  ? 'bg-sky-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{
                                width: `${Math.min(100, Math.max(5, (item.daysRemaining / 30) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Suggested PO Qty */}
                    <td className="py-3 px-3 text-center">
                      {item.suggestedReorderQty > 0 ? (
                        <span className="font-black text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                          +{item.suggestedReorderQty} {item.product.unit}
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-400/80 font-medium">Sufficient</span>
                      )}
                    </td>

                    {/* Est. Restock Cost */}
                    <td className="py-3 px-4 text-right">
                      {item.estimatedReorderCost > 0 ? (
                        <div>
                          <div className="font-bold text-white font-mono">
                            Rs {item.estimatedReorderCost.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            @ Rs {item.product.costPrice || 0}/unit
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">-</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedForecastItem(item)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer"
                        title="Simulate 30-Day Burn-down Curve"
                      >
                        Burn-Down
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Burn-Down Curve Simulation Modal */}
      {selectedForecastItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-5 p-6 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <TrendingDown className="w-4 h-4" />
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Stock Burn-Down Projection Simulation
                  </h3>
                </div>
                <div className="text-sm font-bold text-amber-300 mt-1">
                  {selectedForecastItem.product.name}
                  {selectedForecastItem.product.urduName && (
                    <span className="ml-2 font-urdu text-amber-400">
                      ({selectedForecastItem.product.urduName})
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  SKU: <span className="font-mono text-slate-300">{selectedForecastItem.product.sku}</span> • Category:{' '}
                  <span className="text-slate-300">{selectedForecastItem.product.category}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedForecastItem(null)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Metric Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium">Current Stock</span>
                  <div className="text-lg font-black text-white mt-0.5 font-mono">
                    {selectedForecastItem.product.stock} {selectedForecastItem.product.unit}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium">Daily Velocity</span>
                  <div className="text-lg font-black text-amber-400 mt-0.5 font-mono">
                    {selectedForecastItem.dailyVelocity} /day
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {selectedForecastItem.unitsSold30d} sold past 30d
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium">Reorder Point (ROP)</span>
                  <div className="text-lg font-black text-sky-400 mt-0.5 font-mono">
                    {selectedForecastItem.reorderPoint} {selectedForecastItem.product.unit}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Lead:{Math.round(selectedForecastItem.leadTimeDemand)} + Safety:{selectedForecastItem.safetyStock}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-medium">Projected Depletion</span>
                  <div className="text-sm font-bold text-rose-400 mt-1">
                    {selectedForecastItem.projectedStockOutFormatted}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {selectedForecastItem.daysRemaining === 9999
                      ? 'No depletion'
                      : `In ~${selectedForecastItem.daysRemaining} days`}
                  </span>
                </div>
              </div>

              {/* Burn-down Area Chart */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                    Projected Daily Inventory Depletion Trajectory
                  </span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-sky-400">
                      <span className="w-2.5 h-0.5 bg-sky-400 inline-block" /> Reorder Point (ROP)
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Safety Stock
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={burnDownData}
                      margin={{ top: 10, right: 15, left: 0, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickMargin={5} />
                      <YAxis stroke="#64748b" fontSize={11} unit={` ${selectedForecastItem.product.unit}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                        formatter={(val: any) => [
                          `${val} ${selectedForecastItem.product.unit}`,
                          'Projected Stock',
                        ]}
                        labelFormatter={(label, payload) => {
                          const item = payload?.[0]?.payload;
                          return `${label} (${item?.dateLabel || ''})`;
                        }}
                      />
                      <ReferenceLine
                        y={selectedForecastItem.reorderPoint}
                        stroke="#38bdf8"
                        strokeDasharray="4 4"
                        label={{
                          value: `ROP: ${selectedForecastItem.reorderPoint}`,
                          fill: '#38bdf8',
                          fontSize: 10,
                          position: 'top',
                        }}
                      />
                      <ReferenceLine
                        y={selectedForecastItem.safetyStock}
                        stroke="#10b981"
                        strokeDasharray="2 2"
                        label={{
                          value: `Safety: ${selectedForecastItem.safetyStock}`,
                          fill: '#10b981',
                          fontSize: 10,
                          position: 'top',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="stock"
                        stroke="#fbbf24"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#stockGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Replenishment Recommendation Banner */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-amber-300">
                    Suggested Procurement Order:
                  </div>
                  <div className="text-base font-black text-white mt-0.5">
                    Order {selectedForecastItem.suggestedReorderQty} {selectedForecastItem.product.unit} to cover{' '}
                    {leadTimeDays + replenishmentHorizonDays} days of expected demand
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Estimated Cost: Rs {selectedForecastItem.estimatedReorderCost.toLocaleString()} (@ Rs{' '}
                    {selectedForecastItem.product.costPrice}/unit)
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedForecastItem(null)}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition cursor-pointer shrink-0"
                >
                  Close Simulation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Purchase Order (PO) Sheet Modal */}
      {isSupplierPOModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl space-y-5 p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Supplier Purchase Order (PO) Draft Sheet
                  </h3>
                  <p className="text-xs text-slate-400">
                    Itemized replenishment order for products currently at or below their calculated Reorder Point (ROP).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSupplierPOModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PO Summary Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400">Total Items to Reorder</span>
                <div className="text-xl font-black text-amber-400 mt-0.5">
                  {kpiSummary.reorderNeededCount} Products
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400">Total Units to Order</span>
                <div className="text-xl font-black text-white mt-0.5">
                  {kpiSummary.totalSuggestedRestockUnits.toLocaleString()} Units
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400">Estimated Total Procurement Cost</span>
                <div className="text-xl font-black text-emerald-400 mt-0.5">
                  Rs {kpiSummary.totalSuggestedRestockCost.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Table of PO Items */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-bold sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-center">Current Stock</th>
                    <th className="py-2.5 px-3 text-center">ROP</th>
                    <th className="py-2.5 px-3 text-center">Suggested Order</th>
                    <th className="py-2.5 px-3 text-right">Cost/Unit</th>
                    <th className="py-2.5 px-3 text-right">Total Est. (Rs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {forecastList
                    .filter((i) => i.isBreachedROP || i.suggestedReorderQty > 0)
                    .map((item) => (
                      <tr key={item.product.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{item.product.name}</div>
                          {item.product.urduName && (
                            <div className="text-[11px] text-amber-400 font-urdu">{item.product.urduName}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{item.product.sku}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-200">
                          {item.product.stock} {item.product.unit}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-amber-400">
                          {item.reorderPoint}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400 bg-emerald-500/10">
                          {item.suggestedReorderQty} {item.product.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          Rs {item.product.costPrice || 0}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                          Rs {item.estimatedReorderCost.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <span className="text-xs text-slate-500">
                Ready to export as procurement requisition order.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierPOModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const headers = [
                      'Product Name',
                      'Urdu Name',
                      'SKU',
                      'Category',
                      'Current Stock',
                      'Unit',
                      'Reorder Point (ROP)',
                      'Suggested Order Quantity',
                      'Purchase Cost / Unit (Rs)',
                      'Line Total Estimate (Rs)',
                    ];
                    const rows = forecastList
                      .filter((i) => i.isBreachedROP || i.suggestedReorderQty > 0)
                      .map((item) => [
                        item.product.name,
                        item.product.urduName || '',
                        item.product.sku,
                        item.product.category,
                        item.product.stock,
                        item.product.unit,
                        item.reorderPoint,
                        item.suggestedReorderQty,
                        item.product.costPrice,
                        item.estimatedReorderCost,
                      ]);
                    const dateStr = new Date().toISOString().split('T')[0];
                    exportToCSV(`supplier_purchase_order_${dateStr}`, headers, rows);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Supplier PO (CSV)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
