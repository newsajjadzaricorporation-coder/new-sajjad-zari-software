import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Building,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Target,
  Sparkles,
  DollarSign,
  Package,
  Layers,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  HelpCircle,
  BarChart2,
  Filter,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Supplier, Product, PurchaseOrder } from '../../types';

interface SupplierPriceHistoryViewProps {
  suppliers: Supplier[];
  products: Product[];
  purchases: PurchaseOrder[];
  onSelectSupplier?: (supplierId: string) => void;
}

interface ProductPurchaseRecord {
  purchaseId: string;
  purchaseNo: string;
  date: string;
  timestamp: number;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

interface ProductPriceAnalysis {
  productId: string;
  productName: string;
  urduName?: string;
  sku: string;
  category: string;
  unit: string;
  currentCatalogCost: number;
  currentCatalogSelling: number;
  purchaseCount: number;
  totalQuantityPurchased: number;
  totalAmountSpent: number;
  records: ProductPurchaseRecord[]; // sorted chronologically (oldest to newest)
  latestRecord: ProductPurchaseRecord | null;
  previousRecord: ProductPurchaseRecord | null;
  latestCost: number;
  previousCost: number;
  priceDelta: number;
  priceDeltaPct: number;
  trend: 'up' | 'down' | 'flat' | 'none';
  lowestCost: number;
  lowestRecord: ProductPurchaseRecord | null;
  highestCost: number;
  highestRecord: ProductPurchaseRecord | null;
  averageCost: number;
  distinctSuppliersCount: number;
  supplierCostMap: {
    [supplierId: string]: {
      supplierName: string;
      latestCost: number;
      lowestCost: number;
      highestCost: number;
      totalQty: number;
      purchaseCount: number;
      latestDate: string;
    };
  };
  recommendedNegotiationTarget: number;
  negotiationTip: string;
}

export const SupplierPriceHistoryView: React.FC<SupplierPriceHistoryViewProps> = ({
  suppliers,
  products,
  purchases,
}) => {
  // Filters & State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [trendFilter, setTrendFilter] = useState<'all' | 'increased' | 'decreased' | 'multi_vendor'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'price_hike' | 'price_drop' | 'highest_spend' | 'name'>('recent');
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
  const [selectedChartProductId, setSelectedChartProductId] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Extract all categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Aggregate and analyze purchase records per product
  const analyses: ProductPriceAnalysis[] = useMemo(() => {
    const map: { [productId: string]: ProductPurchaseRecord[] } = {};

    // Flatten all purchase items with purchase metadata
    (purchases || []).forEach((po) => {
      (po.items || []).forEach((item) => {
        const prodId = item.productId;
        if (!map[prodId]) map[prodId] = [];

        const cost = Number(item.costPrice ?? item.unitCost ?? 0);
        const qty = Number(item.quantity || 1);
        const total = Number(item.total ?? item.subtotal ?? cost * qty);

        map[prodId].push({
          purchaseId: po.id,
          purchaseNo: po.purchaseNo || po.invoiceNo || 'PUR-ORD',
          date: po.date,
          timestamp: po.timestamp || new Date(po.date).getTime() || 0,
          supplierId: po.supplierId,
          supplierName: po.supplierName,
          quantity: qty,
          unitCost: cost,
          totalCost: total,
          notes: po.notes,
        });
      });
    });

    // Compute analysis for each product
    const result: ProductPriceAnalysis[] = [];

    products.forEach((prod) => {
      const records = (map[prod.id] || []).sort((a, b) => a.timestamp - b.timestamp);

      if (records.length === 0) {
        // Product has no recorded inward purchases yet, but catalog exists
        return;
      }

      const purchaseCount = records.length;
      const totalQuantityPurchased = records.reduce((acc, r) => acc + r.quantity, 0);
      const totalAmountSpent = records.reduce((acc, r) => acc + r.totalCost, 0);

      const latestRecord = records[records.length - 1];
      const previousRecord = records.length > 1 ? records[records.length - 2] : null;

      const latestCost = latestRecord ? latestRecord.unitCost : prod.costPrice || 0;
      const previousCost = previousRecord ? previousRecord.unitCost : latestCost;

      const priceDelta = previousRecord ? latestCost - previousCost : 0;
      const priceDeltaPct = previousRecord && previousCost > 0 ? (priceDelta / previousCost) * 100 : 0;

      let trend: 'up' | 'down' | 'flat' | 'none' = 'none';
      if (previousRecord) {
        if (priceDelta > 0.01) trend = 'up';
        else if (priceDelta < -0.01) trend = 'down';
        else trend = 'flat';
      }

      let lowestCost = Infinity;
      let lowestRecord: ProductPurchaseRecord | null = null;
      let highestCost = -Infinity;
      let highestRecord: ProductPurchaseRecord | null = null;

      const supplierCostMap: ProductPriceAnalysis['supplierCostMap'] = {};

      records.forEach((r) => {
        if (r.unitCost < lowestCost) {
          lowestCost = r.unitCost;
          lowestRecord = r;
        }
        if (r.unitCost > highestCost) {
          highestCost = r.unitCost;
          highestRecord = r;
        }

        if (!supplierCostMap[r.supplierId]) {
          supplierCostMap[r.supplierId] = {
            supplierName: r.supplierName,
            latestCost: r.unitCost,
            lowestCost: r.unitCost,
            highestCost: r.unitCost,
            totalQty: 0,
            purchaseCount: 0,
            latestDate: r.date,
          };
        }

        const sEntry = supplierCostMap[r.supplierId];
        sEntry.latestCost = r.unitCost; // since records are chronological, last written is latest
        sEntry.latestDate = r.date;
        sEntry.totalQty += r.quantity;
        sEntry.purchaseCount += 1;
        if (r.unitCost < sEntry.lowestCost) sEntry.lowestCost = r.unitCost;
        if (r.unitCost > sEntry.highestCost) sEntry.highestCost = r.unitCost;
      });

      const averageCost = totalQuantityPurchased > 0 ? totalAmountSpent / totalQuantityPurchased : latestCost;
      const distinctSuppliersCount = Object.keys(supplierCostMap).length;

      // Calculate realistic negotiation target recommendation
      // If lowest cost is significantly below latest, target is between lowest and average
      let recommendedNegotiationTarget = latestCost;
      let negotiationTip = '';

      if (lowestCost < latestCost) {
        // Recommend bargaining down to lowest + 25% of the difference
        recommendedNegotiationTarget = Math.round(lowestCost + (latestCost - lowestCost) * 0.25);
        negotiationTip = `Reference previous rate of Rs ${lowestCost.toLocaleString()} (${lowestRecord?.date}) to resist the current Rs ${latestCost.toLocaleString()} rate. Target: Rs ${recommendedNegotiationTarget.toLocaleString()}`;
      } else if (distinctSuppliersCount > 1) {
        const lowestSupplier = Object.values(supplierCostMap).sort((a, b) => a.latestCost - b.latestCost)[0];
        negotiationTip = `Competitor ${lowestSupplier.supplierName} offered Rs ${lowestSupplier.latestCost.toLocaleString()}. Use as leverage.`;
      } else {
        negotiationTip = `Steady price history. Ask for a 3-5% seasonal volume discount on bulk orders above ${Math.round(totalQuantityPurchased / purchaseCount * 1.5)} ${prod.unit}s.`;
      }

      result.push({
        productId: prod.id,
        productName: prod.name,
        urduName: prod.urduName,
        sku: prod.sku,
        category: prod.category,
        unit: prod.unit || 'piece',
        currentCatalogCost: prod.costPrice || latestCost,
        currentCatalogSelling: prod.sellingPrice || 0,
        purchaseCount,
        totalQuantityPurchased,
        totalAmountSpent,
        records,
        latestRecord,
        previousRecord,
        latestCost,
        previousCost,
        priceDelta,
        priceDeltaPct,
        trend,
        lowestCost: isFinite(lowestCost) ? lowestCost : latestCost,
        lowestRecord,
        highestCost: isFinite(highestCost) ? highestCost : latestCost,
        highestRecord,
        averageCost: Math.round(averageCost * 10) / 10,
        distinctSuppliersCount,
        supplierCostMap,
        recommendedNegotiationTarget,
        negotiationTip,
      });
    });

    return result;
  }, [purchases, products]);

  // Filtered analyses
  const filteredAnalyses = useMemo(() => {
    return analyses.filter((item) => {
      // Supplier filter
      if (selectedSupplierId !== 'all') {
        const hasSupplier = item.records.some((r) => r.supplierId === selectedSupplierId);
        if (!hasSupplier) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Trend filter
      if (trendFilter === 'increased' && item.trend !== 'up') return false;
      if (trendFilter === 'decreased' && item.trend !== 'down') return false;
      if (trendFilter === 'multi_vendor' && item.distinctSuppliersCount < 2) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.productName.toLowerCase().includes(q);
        const matchUrdu = item.urduName?.toLowerCase().includes(q);
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchSupplier = item.records.some((r) => r.supplierName.toLowerCase().includes(q));
        if (!matchName && !matchUrdu && !matchSku && !matchSupplier) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'recent') {
        const timeA = a.latestRecord?.timestamp || 0;
        const timeB = b.latestRecord?.timestamp || 0;
        return timeB - timeA;
      }
      if (sortBy === 'price_hike') {
        return b.priceDeltaPct - a.priceDeltaPct;
      }
      if (sortBy === 'price_drop') {
        return a.priceDeltaPct - b.priceDeltaPct;
      }
      if (sortBy === 'highest_spend') {
        return b.totalAmountSpent - a.totalAmountSpent;
      }
      if (sortBy === 'name') {
        return a.productName.localeCompare(b.productName);
      }
      return 0;
    });
  }, [analyses, selectedSupplierId, selectedCategory, trendFilter, searchQuery, sortBy]);

  // High-level aggregate KPIs
  const kpis = useMemo(() => {
    const totalItemsTracked = analyses.length;
    const priceHikes = analyses.filter((a) => a.trend === 'up');
    const priceDrops = analyses.filter((a) => a.trend === 'down');
    const multiVendorItems = analyses.filter((a) => a.distinctSuppliersCount > 1);

    const totalSpend = analyses.reduce((acc, a) => acc + a.totalAmountSpent, 0);

    // Potential savings identified (difference between latest price and lowest price on recent batch sizes)
    const potentialSavings = analyses.reduce((acc, a) => {
      if (a.latestCost > a.lowestCost && a.latestRecord) {
        return acc + (a.latestCost - a.lowestCost) * a.latestRecord.quantity;
      }
      return acc;
    }, 0);

    return {
      totalItemsTracked,
      priceHikeCount: priceHikes.length,
      priceDropCount: priceDrops.length,
      multiVendorCount: multiVendorItems.length,
      totalSpend,
      potentialSavings,
    };
  }, [analyses]);

  // Toggle expansion of a product's batch history
  const toggleExpand = (productId: string) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // Selected item for large chart inspection
  const activeChartAnalysis = useMemo(() => {
    if (!selectedChartProductId) {
      return filteredAnalyses[0] || analyses[0] || null;
    }
    return analyses.find((a) => a.productId === selectedChartProductId) || null;
  }, [selectedChartProductId, filteredAnalyses, analyses]);

  // Chart data formatted for Recharts
  const chartData = useMemo(() => {
    if (!activeChartAnalysis) return [];
    return activeChartAnalysis.records.map((r, idx) => ({
      index: idx + 1,
      batch: `#${r.purchaseNo}`,
      date: r.date,
      unitCost: r.unitCost,
      quantity: r.quantity,
      supplier: r.supplierName,
      total: r.totalCost,
      notes: r.notes || 'Inward Batch',
    }));
  }, [activeChartAnalysis]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Intelligence Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Supplier Procurement & Negotiation Intelligence
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white mt-1">
            Item Purchase Price History & Cost Trend Matrix
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Track historical batch purchase costs across mills and vendors. Detect unannounced rate hikes, verify all-time lowest bargain rates, and negotiate optimal prices with verifiable transaction proof.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            title="Generate Printable Negotiation Rate Sheet"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            Negotiation Cheat Sheet
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Tracked Sourced Items</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5">{kpis.totalItemsTracked}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Across {purchases.length} Inward Purchase Orders</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Rate Hike Alerts</span>
            <TrendingUp className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 mt-1.5 flex items-center gap-1.5">
            {kpis.priceHikeCount}
            <span className="text-xs font-normal text-red-400/80">items increased</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Latest cost higher than previous batch</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Favorable Rate Drops</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1.5 flex items-center gap-1.5">
            {kpis.priceDropCount}
            <span className="text-xs font-normal text-emerald-400/80">items discounted</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Bought below prior batch price</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Bargain Opportunity Gap</span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1.5">
            Rs {kpis.potentialSavings.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Spread vs all-time best rates</p>
        </div>
      </div>

      {/* Interactive Visual Price Trajectory Chart Section */}
      {activeChartAnalysis && chartData.length > 0 && (
        <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 uppercase font-mono">
                  {activeChartAnalysis.sku}
                </span>
                <h4 className="text-base font-bold text-white">
                  {activeChartAnalysis.productName}
                </h4>
                {activeChartAnalysis.urduName && (
                  <span className="text-xs text-slate-400 font-serif">
                    ({activeChartAnalysis.urduName})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cost Trajectory Timeline across {activeChartAnalysis.purchaseCount} purchase batches
              </p>
            </div>

            {/* Product Chart Switcher */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-semibold hidden sm:inline">Compare Item:</label>
              <select
                aria-label="Select Product to Graph"
                value={activeChartAnalysis.productId}
                onChange={(e) => setSelectedChartProductId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                {analyses.map((a) => (
                  <option key={a.productId} value={a.productId}>
                    {a.productName} ({a.sku}) - Rs {a.latestCost}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Key Metrics Quick Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[11px] text-slate-400">Latest Purchase Cost</span>
              <div className="text-base font-black text-white mt-0.5 flex items-center gap-1.5 font-mono">
                Rs {activeChartAnalysis.latestCost.toLocaleString()}
                <span className="text-[11px] font-normal text-slate-400">/{activeChartAnalysis.unit}</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">{activeChartAnalysis.latestRecord?.supplierName}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[11px] text-slate-400">All-Time Lowest Rate</span>
              <div className="text-base font-black text-emerald-400 mt-0.5 flex items-center gap-1.5 font-mono">
                Rs {activeChartAnalysis.lowestCost.toLocaleString()}
                <span className="text-[10px] text-emerald-400/70 font-sans font-semibold">Best Bargain</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">{activeChartAnalysis.lowestRecord?.date} ({activeChartAnalysis.lowestRecord?.supplierName})</div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[11px] text-slate-400">Weighted Average Cost</span>
              <div className="text-base font-black text-amber-300 mt-0.5 font-mono">
                Rs {activeChartAnalysis.averageCost.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500">Total {activeChartAnalysis.totalQuantityPurchased} {activeChartAnalysis.unit}s bought</div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                <Target className="w-3 h-3" /> Target Negotiation Rate
              </span>
              <div className="text-base font-black text-amber-300 mt-0.5 font-mono">
                Rs {activeChartAnalysis.recommendedNegotiationTarget.toLocaleString()}
              </div>
              <div className="text-[10px] text-amber-400/80 truncate">Recommended bargaining price</div>
            </div>
          </div>

          {/* Recharts Line Chart */}
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `Rs ${v}`}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1">
                          <div className="font-bold text-white flex items-center justify-between gap-3">
                            <span>{data.batch}</span>
                            <span className="text-slate-400">{data.date}</span>
                          </div>
                          <div className="text-amber-400 font-mono font-bold text-sm">
                            Unit Cost: Rs {data.unitCost.toLocaleString()}
                          </div>
                          <div className="text-slate-300">
                            Vendor: <span className="text-white font-semibold">{data.supplier}</span>
                          </div>
                          <div className="text-slate-300">
                            Batch Qty: <span className="text-white font-semibold">{data.quantity} units</span> (Total: Rs {data.total.toLocaleString()})
                          </div>
                          {data.notes && (
                            <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                              Note: {data.notes}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={activeChartAnalysis.lowestCost}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{
                    value: `Min: Rs ${activeChartAnalysis.lowestCost}`,
                    fill: '#10b981',
                    fontSize: 10,
                    position: 'insideBottomRight',
                  }}
                />
                <ReferenceLine
                  y={activeChartAnalysis.highestCost}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{
                    value: `Max: Rs ${activeChartAnalysis.highestCost}`,
                    fill: '#ef4444',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="unitCost"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', r: 5, strokeWidth: 2, stroke: '#0f172a' }}
                  activeDot={{ r: 7, fill: '#fbbf24' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Actionable Negotiation Tip Banner */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Negotiation Strategy Ammunition: </span>
              <span className="text-slate-300">{activeChartAnalysis.negotiationTip}</span>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Supplier Price Comparison Matrix (if any items sourced from >1 vendor) */}
      {analyses.some((a) => a.distinctSuppliersCount > 1) && (
        <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="text-sm font-bold text-white">
                  Multi-Vendor Price Comparison Matrix
                </h4>
                <p className="text-xs text-slate-400">
                  Direct price spread on products sourced from multiple suppliers
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">
              {analyses.filter((a) => a.distinctSuppliersCount > 1).length} Multi-Sourced Items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                  <th className="p-3">Product Name & SKU</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Supplier Breakdown & Rates</th>
                  <th className="p-3 text-right">Price Spread / Delta</th>
                  <th className="p-3 text-center">Best Vendor Leverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analyses
                  .filter((a) => a.distinctSuppliersCount > 1)
                  .map((item) => {
                    const sortedSuppliers = Object.entries(item.supplierCostMap).sort(
                      (a, b) => a[1].latestCost - b[1].latestCost
                    );
                    const cheapest = sortedSuppliers[0];
                    const mostExpensive = sortedSuppliers[sortedSuppliers.length - 1];
                    const spread = mostExpensive[1].latestCost - cheapest[1].latestCost;
                    const spreadPct = mostExpensive[1].latestCost > 0 ? (spread / mostExpensive[1].latestCost) * 100 : 0;

                    return (
                      <tr key={item.productId} className="hover:bg-slate-900/40 transition">
                        <td className="p-3">
                          <div className="font-bold text-white">{item.productName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{item.sku}</div>
                        </td>
                        <td className="p-3 text-slate-400">{item.category}</td>
                        <td className="p-3">
                          <div className="space-y-1">
                            {sortedSuppliers.map(([supId, sData], idx) => (
                              <div key={supId} className="flex items-center gap-2 text-[11px]">
                                <span className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                                <span className="text-slate-300 font-medium">{sData.supplierName}:</span>
                                <span className={`font-mono font-bold ${idx === 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                                  Rs {sData.latestCost.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-500">({sData.latestDate})</span>
                                {idx === 0 && (
                                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[9px] font-bold uppercase">
                                    Cheapest
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="font-mono font-bold text-amber-400">
                            Rs {spread.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {spreadPct.toFixed(1)}% variance
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedChartProductId(item.productId)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                          >
                            Inspect Trend
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Filters Bar */}
      <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name, Urdu title, SKU, or supplier..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Supplier Filter */}
            <select
              aria-label="Filter by Supplier"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 text-xs"
            >
              <option value="all">All Suppliers ({suppliers.length})</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.companyName || s.name || 'Supplier'}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              aria-label="Filter by Category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 text-xs"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Trend Filter */}
            <select
              aria-label="Filter by Price Trend"
              value={trendFilter}
              onChange={(e) => setTrendFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 text-xs"
            >
              <option value="all">All Price Trends</option>
              <option value="increased">Price Increased (🔺 Hikes)</option>
              <option value="decreased">Price Dropped (🔻 Bargains)</option>
              <option value="multi_vendor">Multi-Supplier Sourced</option>
            </select>

            {/* Sort Filter */}
            <select
              aria-label="Sort Order"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 text-xs"
            >
              <option value="recent">Sort: Most Recently Purchased</option>
              <option value="price_hike">Sort: Highest Price % Hike</option>
              <option value="price_drop">Sort: Largest Price % Drop</option>
              <option value="highest_spend">Sort: Highest Total Spend</option>
              <option value="name">Sort: Product Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Price History Cards List */}
      <div className="space-y-3">
        {filteredAnalyses.length === 0 ? (
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-12 text-center text-slate-400">
            <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <div className="font-bold text-white text-base">No Matching Purchase History Records Found</div>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Try changing your search terms or filter selections, or record new stock inward purchases using the "New Stock Inward" button above.
            </p>
          </div>
        ) : (
          filteredAnalyses.map((item) => {
            const isExpanded = !!expandedProductIds[item.productId];
            const isChartSelected = activeChartAnalysis?.productId === item.productId;

            return (
              <div
                key={item.productId}
                className={`bg-slate-950/80 rounded-2xl border transition-all shadow-md ${
                  isChartSelected
                    ? 'border-amber-400/50 bg-slate-950/95 ring-1 ring-amber-400/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Main Product Price Summary Header */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Product Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                        {item.sku}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                        {item.category}
                      </span>
                      {item.distinctSuppliersCount > 1 && (
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-bold">
                          {item.distinctSuppliersCount} Suppliers
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-white">
                        {item.productName}
                      </h4>
                      {item.urduName && (
                        <span className="text-xs text-slate-400 font-serif">
                          {item.urduName}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>Latest Vendor: <strong className="text-slate-200">{item.latestRecord?.supplierName}</strong></span>
                      <span>•</span>
                      <span>Last Inward: {item.latestRecord?.date}</span>
                    </div>
                  </div>

                  {/* Middle: Comparative Price Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-xs">
                    {/* Latest Cost + Trend Delta */}
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Latest Price</span>
                      <div className="text-sm font-bold text-white font-mono mt-0.5">
                        Rs {item.latestCost.toLocaleString()}
                      </div>
                      <div className="text-[10px] mt-0.5 font-bold">
                        {item.trend === 'up' && (
                          <span className="text-red-400 flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3 inline" /> +Rs {item.priceDelta} (+{item.priceDeltaPct.toFixed(1)}%)
                          </span>
                        )}
                        {item.trend === 'down' && (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3 inline" /> -Rs {Math.abs(item.priceDelta)} ({item.priceDeltaPct.toFixed(1)}%)
                          </span>
                        )}
                        {item.trend === 'flat' && (
                          <span className="text-slate-400 flex items-center gap-0.5">
                            <Minus className="w-3 h-3 inline" /> Same as prior
                          </span>
                        )}
                        {item.trend === 'none' && (
                          <span className="text-slate-500">First batch recorded</span>
                        )}
                      </div>
                    </div>

                    {/* Lowest Ever Paid */}
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Best Bargain</span>
                      <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                        Rs {item.lowestCost.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate" title={item.lowestRecord?.date}>
                        {item.lowestRecord?.date}
                      </div>
                    </div>

                    {/* Average Cost */}
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Avg Unit Cost</span>
                      <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
                        Rs {item.averageCost.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.totalQuantityPurchased} {item.unit}s total
                      </div>
                    </div>

                    {/* Target Negotiation Price */}
                    <div>
                      <span className="text-[10px] text-amber-400 uppercase font-semibold flex items-center gap-1">
                        <Target className="w-3 h-3" /> Target Rate
                      </span>
                      <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                        Rs {item.recommendedNegotiationTarget.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-amber-400/70">
                        Negotiation goal
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                    <button
                      onClick={() => setSelectedChartProductId(item.productId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        isChartSelected
                          ? 'bg-amber-500 text-slate-950 font-bold shadow'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                      title="Plot on Price Trajectory Graph"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      {isChartSelected ? 'Graph Active' : 'View Graph'}
                    </button>

                    <button
                      onClick={() => toggleExpand(item.productId)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>{item.purchaseCount} Batches</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Purchase Inward Batches Breakdown Table */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-900/40 p-4 rounded-b-2xl space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        Chronological Inward Batch History ({item.records.length} orders)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Total Value Sourced: Rs {item.totalAmountSpent.toLocaleString()}
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Order / Inward #</th>
                            <th className="p-2.5">Supplier / Mill</th>
                            <th className="p-2.5 text-center">Batch Qty</th>
                            <th className="p-2.5 text-right">Unit Cost Paid (Rs)</th>
                            <th className="p-2.5 text-right">Total Amount (Rs)</th>
                            <th className="p-2.5 text-center">Trend vs Prior</th>
                            <th className="p-2.5">Batch Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {item.records.map((r, rIdx) => {
                            const prev = rIdx > 0 ? item.records[rIdx - 1] : null;
                            const diff = prev ? r.unitCost - prev.unitCost : 0;
                            const diffPct = prev && prev.unitCost > 0 ? (diff / prev.unitCost) * 100 : 0;

                            const isLowest = r.unitCost === item.lowestCost;
                            const isHighest = r.unitCost === item.highestCost;

                            return (
                              <tr key={r.purchaseId + '-' + rIdx} className="hover:bg-slate-900/50">
                                <td className="p-2.5 text-slate-300 font-medium whitespace-nowrap">
                                  {r.date}
                                </td>
                                <td className="p-2.5 font-mono text-amber-300 font-bold">
                                  {r.purchaseNo}
                                </td>
                                <td className="p-2.5 text-white font-semibold flex items-center gap-1.5">
                                  <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span>{r.supplierName}</span>
                                </td>
                                <td className="p-2.5 text-center font-mono font-bold text-slate-200">
                                  {r.quantity} {item.unit}
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-white">
                                  Rs {r.unitCost.toLocaleString()}
                                  {isLowest && (
                                    <span className="ml-1.5 px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                                      MIN
                                    </span>
                                  )}
                                  {isHighest && item.records.length > 1 && (
                                    <span className="ml-1.5 px-1 py-0.2 rounded bg-red-500/20 text-red-300 text-[9px] font-bold">
                                      MAX
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-right font-mono text-slate-300">
                                  Rs {r.totalCost.toLocaleString()}
                                </td>
                                <td className="p-2.5 text-center">
                                  {!prev ? (
                                    <span className="text-slate-500 text-[10px]">Initial</span>
                                  ) : diff > 0 ? (
                                    <span className="text-red-400 font-bold text-[10px]">
                                      +{diff} (+{diffPct.toFixed(1)}%) 🔺
                                    </span>
                                  ) : diff < 0 ? (
                                    <span className="text-emerald-400 font-bold text-[10px]">
                                      {diff} ({diffPct.toFixed(1)}%) 🔻
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">0.0% ➖</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-slate-400 text-[11px] italic max-w-xs truncate">
                                  {r.notes || '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ================= PRINT / EXPORT NEGOTIATION RATE SHEET MODAL ================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 my-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Supplier Price Negotiation Cheat Sheet
                </h3>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              This summary provides target negotiation rates, historical lowest costs, and current purchase prices to carry into vendor meetings or wholesale supplier calls.
            </p>

            <div className="p-4 bg-white text-slate-900 rounded-xl overflow-x-auto shadow space-y-3 font-sans">
              <div className="border-b border-slate-300 pb-2 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    New Sajjad Zari Corporation — Procurement Rate Sheet
                  </h2>
                  <p className="text-[11px] text-slate-600">
                    Generated on: {new Date().toLocaleDateString()} | Negotiation Benchmarks
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  Strictly Confidential • Internal Wholesale Use
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold uppercase text-[10px]">
                    <th className="p-2">Item / Sku</th>
                    <th className="p-2">Category</th>
                    <th className="p-2 text-right">Latest Cost</th>
                    <th className="p-2 text-right">All-Time Min</th>
                    <th className="p-2 text-right">Target Rate</th>
                    <th className="p-2">Recommended Leverage Strategy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {analyses.map((a) => (
                    <tr key={a.productId}>
                      <td className="p-2">
                        <div className="font-bold text-slate-900">{a.productName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{a.sku}</div>
                      </td>
                      <td className="p-2 text-slate-600">{a.category}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">
                        Rs {a.latestCost.toLocaleString()}
                      </td>
                      <td className="p-2 text-right font-mono text-emerald-700 font-bold">
                        Rs {a.lowestCost.toLocaleString()}
                      </td>
                      <td className="p-2 text-right font-mono font-black text-amber-700">
                        Rs {a.recommendedNegotiationTarget.toLocaleString()}
                      </td>
                      <td className="p-2 text-slate-600 text-[10px]">
                        {a.negotiationTip}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
