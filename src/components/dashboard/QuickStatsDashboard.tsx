import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Award,
  DollarSign,
  Receipt,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  BookOpen,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Layers,
  Clock,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { Product, SaleInvoice, ShopSettings, UserProfile } from '../../types';

interface QuickStatsDashboardProps {
  products: Product[];
  sales: SaleInvoice[];
  settings: ShopSettings;
  currentUser: UserProfile;
  onNavigateToInventoryLowStock?: () => void;
  onNavigateToPOS?: () => void;
  onNavigateToClosing?: () => void;
  onNavigateToAnalytics?: () => void;
}

export const QuickStatsDashboard: React.FC<QuickStatsDashboardProps> = ({
  products,
  sales,
  settings,
  currentUser,
  onNavigateToInventoryLowStock,
  onNavigateToPOS,
  onNavigateToClosing,
  onNavigateToAnalytics,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showLowStockModal, setShowLowStockModal] = useState<boolean>(false);

  // Today's Date String (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter Sales for Today
  const todaySales = useMemo(() => {
    return sales.filter((s) => {
      if (!s.date) return false;
      // Date can be "YYYY-MM-DD" or formatted "YYYY-MM-DD, HH:mm"
      return s.date.startsWith(todayStr);
    });
  }, [sales, todayStr]);

  // Metric 1: Daily Total Sales & Tender Breakdown
  const dailyMetrics = useMemo(() => {
    let grossSales = 0;
    let netSales = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    let creditTotal = 0;
    let totalDiscount = 0;

    for (const sale of todaySales) {
      grossSales += sale.subtotal || 0;
      netSales += sale.netTotal || 0;
      totalDiscount += sale.discountAmount || 0;

      if (sale.paymentMethod === 'cash') {
        cashTotal += sale.netTotal || 0;
      } else if (sale.paymentMethod === 'card') {
        cardTotal += sale.netTotal || 0;
      } else if (sale.paymentMethod === 'credit') {
        creditTotal += sale.netTotal || 0;
      }
    }

    const invoiceCount = todaySales.length;
    const avgBasket = invoiceCount > 0 ? Math.round(netSales / invoiceCount) : 0;
    const dailyGoal = settings.dailySalesGoal || 50000;
    const goalProgress = Math.min(100, Math.round((netSales / dailyGoal) * 100));

    return {
      grossSales,
      netSales,
      cashTotal,
      cardTotal,
      creditTotal,
      totalDiscount,
      invoiceCount,
      avgBasket,
      dailyGoal,
      goalProgress,
    };
  }, [todaySales, settings.dailySalesGoal]);

  // Metric 2: Top Selling Product (Today first, falling back to all-time if no sales today)
  const topSellingStats = useMemo(() => {
    const productSalesMap = new Map<
      string,
      {
        product: Product;
        quantitySold: number;
        revenue: number;
        orderCount: number;
      }
    >();

    // Index existing products for quick metadata lookup
    const prodMap = new Map<string, Product>();
    products.forEach((p) => prodMap.set(p.id, p));

    // Calculate from today's sales first
    const sourceSales = todaySales.length > 0 ? todaySales : sales;
    const isTodayScope = todaySales.length > 0;

    for (const sale of sourceSales) {
      if (!sale.items) continue;
      for (const item of sale.items) {
        if (!item.product) continue;
        const pid = item.product.id;
        const liveProd = prodMap.get(pid) || item.product;
        const existing = productSalesMap.get(pid) || {
          product: liveProd,
          quantitySold: 0,
          revenue: 0,
          orderCount: 0,
        };

        existing.quantitySold += Number(item.quantity) || 0;
        existing.revenue += Number(item.subtotal) || 0;
        existing.orderCount += 1;
        productSalesMap.set(pid, existing);
      }
    }

    const sorted = Array.from(productSalesMap.values()).sort(
      (a, b) => b.quantitySold - a.quantitySold || b.revenue - a.revenue
    );

    const topProduct = sorted[0] || null;
    const runnerUps = sorted.slice(1, 4);

    return {
      topProduct,
      runnerUps,
      isTodayScope,
      totalUniqueItemsSold: sorted.length,
    };
  }, [todaySales, sales, products]);

  // Metric 3: Low-Stock and Out-of-Stock Items
  const stockStats = useMemo(() => {
    const lowStockItems: Product[] = [];
    const outOfStockItems: Product[] = [];

    for (const prod of products) {
      const minAlert = prod.minStockAlert ?? 5;
      if (prod.stock <= 0) {
        outOfStockItems.push(prod);
        lowStockItems.push(prod);
      } else if (prod.stock <= minAlert) {
        lowStockItems.push(prod);
      }
    }

    return {
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      items: lowStockItems.sort((a, b) => a.stock - b.stock),
    };
  }, [products]);

  // Metric 4: Daily Profit Report (Sales Revenue minus COGS for Today)
  const dailyProfitMetrics = useMemo(() => {
    const prodMap = new Map<string, Product>();
    products.forEach((p) => prodMap.set(p.id, p));

    let totalRevenue = 0;
    let totalCogs = 0;

    for (const sale of todaySales) {
      totalRevenue += sale.netTotal || 0;
      if (sale.items) {
        for (const item of sale.items) {
          const qty = Number(item.quantity) || 0;
          const liveProd = prodMap.get(item.product?.id) || item.product;
          const unitCost = liveProd?.costPrice ?? item.product?.costPrice ?? 0;
          totalCogs += qty * unitCost;
        }
      }
    }

    const netProfit = totalRevenue - totalCogs;
    const marginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
    const isProfitPositive = netProfit >= 0;

    return {
      totalRevenue,
      totalCogs,
      netProfit,
      marginPct,
      isProfitPositive,
    };
  }, [todaySales, products]);

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Header Bar with Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  Quick Stats Overview
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {new Date().toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick action buttons */}
            {onNavigateToPOS && (
              <button
                type="button"
                onClick={onNavigateToPOS}
                className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
                title="Open Point of Sale"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>New Bill</span>
              </button>
            )}

            {onNavigateToClosing && (
              <button
                type="button"
                onClick={onNavigateToClosing}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                title="Open Daily Cash Closing (Z-Report)"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Z-Closing</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-xs font-medium transition cursor-pointer"
              title={isExpanded ? 'Collapse Overview' : 'Expand Overview'}
            >
              <span>{isExpanded ? 'Hide' : 'Show Stats'}</span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-3 pb-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                {/* 1. DAILY TOTAL SALES CARD */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between hover:border-slate-700 transition">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        Daily Total Sales (آج کی کل فروخت)
                      </p>
                      <h4 className="text-xl sm:text-2xl font-black text-white">
                        Rs {dailyMetrics.netSales.toLocaleString()}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                      {dailyMetrics.invoiceCount} {dailyMetrics.invoiceCount === 1 ? 'Bill' : 'Bills'}
                    </span>
                  </div>

                  {/* Payment Methods Breakdown */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/50">
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <Banknote className="w-3 h-3 text-emerald-400" /> Cash
                      </div>
                      <div className="text-xs font-bold text-slate-200 mt-0.5">
                        Rs {dailyMetrics.cashTotal.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/50">
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <CreditCard className="w-3 h-3 text-blue-400" /> Card
                      </div>
                      <div className="text-xs font-bold text-slate-200 mt-0.5">
                        Rs {dailyMetrics.cardTotal.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/50">
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <BookOpen className="w-3 h-3 text-amber-400" /> Khata
                      </div>
                      <div className="text-xs font-bold text-slate-200 mt-0.5">
                        Rs {dailyMetrics.creditTotal.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Daily Target Progress */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Avg Bill: <strong className="text-white">Rs {dailyMetrics.avgBasket.toLocaleString()}</strong>
                    </span>
                    <span>
                      Goal: <strong className="text-amber-400">{dailyMetrics.goalProgress}%</strong> of Rs {dailyMetrics.dailyGoal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 2. TOP SELLING PRODUCT CARD */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between hover:border-slate-700 transition">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        Top Selling Product (سب سے زیادہ بکنے والا)
                      </p>
                      {topSellingStats.topProduct ? (
                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                            {topSellingStats.topProduct.product.name}
                          </h4>
                          {topSellingStats.topProduct.product.urduName && (
                            <p className="font-urdu text-xs text-amber-300 line-clamp-1">
                              {topSellingStats.topProduct.product.urduName}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No sales recorded yet</p>
                      )}
                    </div>

                    {topSellingStats.topProduct && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold">
                        {topSellingStats.isTodayScope ? 'Today' : 'Overall'}
                      </span>
                    )}
                  </div>

                  {topSellingStats.topProduct ? (
                    <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Quantity Sold:</span>
                        <span className="font-extrabold text-amber-400">
                          {topSellingStats.topProduct.quantitySold}{' '}
                          <span className="text-[11px] text-slate-400 font-normal">
                            {topSellingStats.topProduct.product.unit || 'units'}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Generated Revenue:</span>
                        <span className="font-bold text-white">
                          Rs {topSellingStats.topProduct.revenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Remaining Stock:</span>
                        <span
                          className={`font-semibold ${
                            topSellingStats.topProduct.product.stock <= 5
                              ? 'text-red-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {topSellingStats.topProduct.product.stock}{' '}
                          {topSellingStats.topProduct.product.unit || 'in stock'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-slate-500 text-center py-2">
                      Start billing in POS to rank top sellers.
                    </div>
                  )}

                  {onNavigateToAnalytics && (
                    <button
                      type="button"
                      onClick={onNavigateToAnalytics}
                      className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-end gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition cursor-pointer"
                    >
                      <span>Full Profit Heatmap</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 3. LOW-STOCK ALERT COUNT CARD */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between hover:border-slate-700 transition">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle
                          className={`w-3.5 h-3.5 ${
                            stockStats.lowStockCount > 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        />
                        Low-Stock Count (کم اسٹاک کی تفصیل)
                      </p>
                      <div className="flex items-baseline gap-2">
                        <h4
                          className={`text-xl sm:text-2xl font-black ${
                            stockStats.lowStockCount > 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {stockStats.lowStockCount}
                        </h4>
                        <span className="text-xs text-slate-400">
                          {stockStats.lowStockCount === 1 ? 'item requires restock' : 'items require restock'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        stockStats.outOfStockCount > 0
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : stockStats.lowStockCount > 0
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {stockStats.outOfStockCount > 0
                        ? `${stockStats.outOfStockCount} Out of Stock`
                        : stockStats.lowStockCount > 0
                        ? 'Low Threshold'
                        : 'Stock Healthy'}
                    </span>
                  </div>

                  {/* Preview of Top Low Stock Items */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                    {stockStats.items.length > 0 ? (
                      <div className="space-y-1">
                        {stockStats.items.slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs py-0.5 px-2 bg-slate-950/60 rounded border border-slate-800/40"
                          >
                            <span className="text-slate-300 font-medium truncate max-w-[170px]">
                              {item.name}
                            </span>
                            <span className="text-red-400 font-bold shrink-0">
                              {item.stock} {item.unit} (min {item.minStockAlert ?? 5})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 py-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>All products are above minimum safety stock.</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                    {stockStats.lowStockCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowLowStockModal(true)}
                        className="text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View List ({stockStats.lowStockCount})</span>
                      </button>
                    )}

                    {onNavigateToInventoryLowStock && (
                      <button
                        type="button"
                        onClick={onNavigateToInventoryLowStock}
                        className="ml-auto flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                      >
                        <span>Restock in Inventory</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. DAILY PROFIT REPORT SUMMARY CARD */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between hover:border-slate-700 transition">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        Daily Profit Report (روزانہ منافع)
                      </p>
                      <h4
                        className={`text-xl sm:text-2xl font-black ${
                          dailyProfitMetrics.isProfitPositive ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        Rs {dailyProfitMetrics.netProfit.toLocaleString()}
                      </h4>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                        dailyProfitMetrics.marginPct >= 20
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : dailyProfitMetrics.marginPct > 0
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}
                    >
                      {dailyProfitMetrics.marginPct}% Margin
                    </span>
                  </div>

                  {/* COGS and Sales breakdown */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Today's Sales:</span>
                      <span className="font-bold text-white">
                        Rs {dailyProfitMetrics.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Total COGS (Cost):</span>
                      <span className="font-semibold text-slate-300">
                        Rs {dailyProfitMetrics.totalCogs.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Profit Status:</span>
                      <span
                        className={`font-semibold ${
                          dailyProfitMetrics.isProfitPositive ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {dailyProfitMetrics.totalRevenue === 0
                          ? 'No sales today'
                          : dailyProfitMetrics.marginPct >= 25
                          ? 'High Profitability'
                          : dailyProfitMetrics.marginPct >= 10
                          ? 'Healthy Margins'
                          : 'Low / Thin Margin'}
                      </span>
                    </div>
                  </div>

                  {onNavigateToAnalytics && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={onNavigateToAnalytics}
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                      >
                        <span>View Profit Trends</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Low Stock Items Quick View Modal */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Low Stock Items ({stockStats.lowStockCount})</h3>
                  <p className="text-xs text-slate-400">Items below minimum stock threshold</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLowStockModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {stockStats.items.map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-100">{prod.name}</div>
                    {prod.urduName && (
                      <div className="font-urdu text-[11px] text-amber-300">{prod.urduName}</div>
                    )}
                    <div className="text-[10px] text-slate-400">
                      SKU: {prod.sku} • Category: {prod.category}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-black ${
                        prod.stock <= 0 ? 'text-red-500' : 'text-amber-400'
                      }`}
                    >
                      {prod.stock} {prod.unit}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Min Alert: {prod.minStockAlert ?? 5}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowLowStockModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              {onNavigateToInventoryLowStock && (
                <button
                  type="button"
                  onClick={() => {
                    setShowLowStockModal(false);
                    onNavigateToInventoryLowStock();
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Manage & Restock in Inventory
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
