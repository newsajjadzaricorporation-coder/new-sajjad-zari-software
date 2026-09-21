import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertOctagon,
  Percent,
  DollarSign,
  Flame,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  BarChart3,
  Filter,
  Download,
  FileText,
} from 'lucide-react';
import { generateProfitReportPDF } from '../../utils/pdfReport';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { Product, SaleInvoice } from '../../types';
import { PaginationControls } from '../common/PaginationControls';

interface ProfitMarginHeatmapModuleProps {
  products: Product[];
  sales: SaleInvoice[];
}

const ProfitMarginHeatmapModuleComponent: React.FC<ProfitMarginHeatmapModuleProps> = ({
  products,
  sales,
}) => {
  const [marginFilter, setMarginFilter] = useState<'all' | 'high' | 'moderate' | 'loss'>('all');
  const [sortBy, setSortBy] = useState<'marginPct' | 'profitRs' | 'stock'>('marginPct');

  // Heatmap Table Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadReport = () => {
    setIsGeneratingPDF(true);
    try {
      generateProfitReportPDF({
        products,
        sales,
        productMargins,
        analyticsSummary,
        shopName: 'New Sajjad Zari Corporation',
      });
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
      alert('Could not generate PDF report. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Compute margins for all products with O(M + N) optimized lookup
  const productMargins = useMemo(() => {
    const salesUnitsMap = new Map<string, number>();
    for (let i = 0; i < sales.length; i++) {
      const s = sales[i];
      if (!s.items) continue;
      for (let j = 0; j < s.items.length; j++) {
        const item = s.items[j];
        if (item && item.product) {
          const pId = item.product.id;
          salesUnitsMap.set(pId, (salesUnitsMap.get(pId) || 0) + (item.quantity || 0));
        }
      }
    }

    return products.map((p) => {
      const cost = p.costPrice || 0;
      const selling = p.sellingPrice;
      const profitRs = selling - cost;
      const marginPct = selling > 0 ? Math.round((profitRs / selling) * 100) : 0;
      const isLoss = selling < cost;

      const totalUnitsSold = salesUnitsMap.get(p.id) || 0;
      const dailyVelocity = Math.max(0.1, totalUnitsSold / 30);
      const daysUntilStockout = Math.round(p.stock / dailyVelocity);

      return {
        ...p,
        cost,
        selling,
        profitRs,
        marginPct,
        isLoss,
        totalUnitsSold,
        dailyVelocity,
        daysUntilStockout,
      };
    });
  }, [products, sales]);

  // Overall analytics metrics
  const analyticsSummary = useMemo(() => {
    const highCount = productMargins.filter((p) => p.marginPct >= 25 && !p.isLoss).length;
    const moderateCount = productMargins.filter((p) => p.marginPct >= 5 && p.marginPct < 25 && !p.isLoss).length;
    const lossCount = productMargins.filter((p) => p.isLoss).length;

    const avgMargin =
      productMargins.length > 0
        ? Math.round(productMargins.reduce((acc, p) => acc + p.marginPct, 0) / productMargins.length)
        : 0;

    // 30-Day projections based on historic sales
    const totalSalesRev = sales.reduce((acc, s) => acc + s.netTotal, 0);
    const estimatedMonthlyRunRate = totalSalesRev > 0 ? Math.round(totalSalesRev * 1.2) : 250000;
    const projectedProfit = Math.round((estimatedMonthlyRunRate * avgMargin) / 100);

    return {
      highCount,
      moderateCount,
      lossCount,
      avgMargin,
      estimatedMonthlyRunRate,
      projectedProfit,
    };
  }, [productMargins, sales]);

  // Filter and sort items
  const displayItems = useMemo(() => {
    return productMargins
      .filter((p) => {
        if (marginFilter === 'high') return p.marginPct >= 25 && !p.isLoss;
        if (marginFilter === 'moderate') return p.marginPct >= 5 && p.marginPct < 25 && !p.isLoss;
        if (marginFilter === 'loss') return p.isLoss;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'marginPct') return b.marginPct - a.marginPct;
        if (sortBy === 'profitRs') return b.profitRs - a.profitRs;
        if (sortBy === 'stock') return b.stock - a.stock;
        return 0;
      });
  }, [productMargins, marginFilter, sortBy]);

  const paginatedDisplayItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayItems.slice(start, start + pageSize);
  }, [displayItems, page, pageSize]);

  // Chart data for top 10 items by profit margin
  const top10ChartData = useMemo(() => {
    return displayItems.slice(0, 10).map((p) => ({
      name: p.name.length > 16 ? p.name.slice(0, 14) + '...' : p.name,
      margin: p.marginPct,
      profit: p.profitRs,
      isLoss: p.isLoss,
    }));
  }, [displayItems]);

  const pieData = useMemo(() => [
    { name: 'High Margin (≥25%)', value: analyticsSummary.highCount, color: '#10b981' },
    { name: 'Moderate (5-24%)', value: analyticsSummary.moderateCount, color: '#f59e0b' },
    { name: 'Loss / Below Cost', value: analyticsSummary.lossCount, color: '#ef4444' },
  ].filter((d) => d.value > 0), [analyticsSummary.highCount, analyticsSummary.moderateCount, analyticsSummary.lossCount]);

  // 7-day sales and revenue performance trend line chart data
  const weeklyRevenueTrend = useMemo(() => {
    const days: { day: string; date: string; revenue: number; profit: number; salesCount: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const shortDay = d.toLocaleDateString('en-US', { weekday: 'short' });

      const daySales = sales.filter((s) => {
        const sDate = new Date(s.timestamp || s.date);
        return sDate.toDateString() === d.toDateString();
      });

      const revenue = daySales.reduce((acc, s) => acc + (s.netTotal || 0), 0);
      const profit = daySales.reduce((acc, s) => {
        const cost = s.items.reduce((cAcc, it) => cAcc + ((it.product?.costPrice || 0) * it.quantity), 0);
        return acc + Math.max(0, (s.netTotal || 0) - cost);
      }, 0);

      days.push({
        day: shortDay,
        date: dateStr,
        revenue,
        profit,
        salesCount: daySales.length,
      });
    }
    return days;
  }, [sales]);

  // Daily total sales for current month bar chart data
  const monthlyDailySales = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyMap: { [day: number]: { sales: number; count: number } } = {};

    sales.forEach((s) => {
      const sDate = new Date(s.timestamp || s.date);
      if (sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear) {
        const day = sDate.getDate();
        if (!dailyMap[day]) dailyMap[day] = { sales: 0, count: 0 };
        dailyMap[day].sales += s.netTotal || 0;
        dailyMap[day].count += 1;
      }
    });

    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({
        day: `${d}`,
        sales: dailyMap[d]?.sales || 0,
        count: dailyMap[d]?.count || 0,
      });
    }
    return result;
  }, [sales]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-900">
      {/* Title & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-400" />
            Intelligence Center & Profit Margin Heatmap
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Identify high-margin profit drivers, pricing discrepancies, and 30-day inventory velocity
          </p>
        </div>

        {/* Actions & Heatmap Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
            title="Generate and download a PDF summary of the current inventory and profit trends"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>{isGeneratingPDF ? 'Generating PDF...' : 'Download Report'}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setMarginFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                marginFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({productMargins.length})
            </button>
            <button
              onClick={() => setMarginFilter('high')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
                marginFilter === 'high'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-emerald-400 hover:bg-slate-800'
              }`}
            >
              High Margin ({analyticsSummary.highCount})
            </button>
            <button
              onClick={() => setMarginFilter('moderate')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
                marginFilter === 'moderate'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-amber-400 hover:bg-slate-800'
              }`}
            >
              Moderate ({analyticsSummary.moderateCount})
            </button>
            <button
              onClick={() => setMarginFilter('loss')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
                marginFilter === 'loss'
                  ? 'bg-red-500 text-white shadow'
                  : 'text-red-400 hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Below Cost ({analyticsSummary.lossCount})
            </button>
          </div>
        </div>
      </div>

      {/* Critical Loss Alert Banner if any items selling below purchase cost */}
      {analyticsSummary.lossCount > 0 && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertOctagon className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="text-sm font-bold text-red-300">
              Pricing Discrepancy Alert: {analyticsSummary.lossCount} Item(s) Selling Below Cost!
            </h4>
            <p className="text-slate-300 mt-1">
              Certain products have retail selling prices lower than their recorded purchase cost.
              Review your purchase invoices or adjust selling prices to avoid operating at a loss.
            </p>
          </div>
          <button
            onClick={() => setMarginFilter('loss')}
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold shrink-0 transition"
          >
            View Loss Items
          </button>
        </div>
      )}

      {/* Intelligence Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Profit Margin */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Average Store Margin</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-white">{analyticsSummary.avgMargin}%</div>
            <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" /> Healthy margin across inventory
            </p>
          </div>
        </div>

        {/* 30-Day Sales Velocity Forecast */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">30-Day Revenue Forecast</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-amber-400">
              Rs {analyticsSummary.estimatedMonthlyRunRate.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">Based on current sales run-rate</p>
          </div>
        </div>

        {/* Projected Monthly Profit */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Projected Monthly Profit</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-emerald-400">
              Rs {analyticsSummary.projectedProfit.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">Gross profit after COGS</p>
          </div>
        </div>

        {/* Catalog Health Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400">Margin Breakdown</span>
          <div className="space-y-1.5 mt-3 text-xs">
            <div className="flex justify-between items-center text-emerald-400">
              <span>High Margin (≥25%):</span>
              <span className="font-bold">{analyticsSummary.highCount} items</span>
            </div>
            <div className="flex justify-between items-center text-amber-400">
              <span>Moderate (5-24%):</span>
              <span className="font-bold">{analyticsSummary.moderateCount} items</span>
            </div>
            <div className="flex justify-between items-center text-red-400">
              <span>Below Cost:</span>
              <span className="font-bold">{analyticsSummary.lossCount} items</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Chart: Profit Margin Spread */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Revenue Trend Line Chart */}
        <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              7-Day Weekly Revenue & Profit Trend
            </h3>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Last 7 Days
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyRevenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `Rs ${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any, name: string) => [
                    `Rs ${Number(val).toLocaleString()}`,
                    name === 'revenue' ? 'Revenue' : 'Gross Profit',
                  ]}
                  labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.date || label}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  formatter={(value) => (value === 'revenue' ? 'Revenue (Rs)' : 'Gross Profit (Rs)')}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#fbbf24"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#fbbf24' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Month Daily Total Sales Bar Graph */}
        <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              Daily Sales Volume (Current Month)
            </h3>
            <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyDailySales} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} interval="preserveStartEnd" />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `Rs ${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`Rs ${Number(val).toLocaleString()}`, 'Daily Total Sales']}
                  labelFormatter={(label) => `Day ${label} of ${new Date().toLocaleDateString('en-US', { month: 'short' })}`}
                />
                <Bar dataKey="sales" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products by Profit Margin (%) */}
      <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            Top Products by Profit Margin (%)
          </h3>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Sort By:</span>
            <select
              aria-label="Sort By"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-400"
            >
              <option value="marginPct">Margin Percentage (%)</option>
              <option value="profitRs">Absolute Profit (Rs)</option>
              <option value="stock">Current Stock</option>
            </select>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top10ChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} angle={-25} textAnchor="end" />
              <YAxis stroke="#64748b" fontSize={11} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [`${val}%`, 'Profit Margin']}
              />
              <Bar dataKey="margin" radius={[6, 6, 0, 0]}>
                {top10ChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isLoss ? '#ef4444' : entry.margin >= 25 ? '#10b981' : '#f59e0b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap Data Table */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">
            Product Margin & Stock Burn-out Velocity Table
          </h3>
          <span className="text-xs text-slate-400">Showing {displayItems.length} products</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <th className="p-3.5">Product Title</th>
                <th className="p-3.5 text-right">Cost Price (Rs)</th>
                <th className="p-3.5 text-right">Selling Price (Rs)</th>
                <th className="p-3.5 text-right">Profit / Unit (Rs)</th>
                <th className="p-3.5 text-center">Margin % Heatmap</th>
                <th className="p-3.5 text-center">In Stock</th>
                <th className="p-3.5 text-right">Burn Velocity / Run-out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedDisplayItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No products matching current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedDisplayItems.map((item) => {
                  let badgeClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                  if (item.isLoss) {
                    badgeClass = 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse';
                  } else if (item.marginPct >= 25) {
                    badgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-900/50 transition">
                      <td className="p-3.5 font-bold text-white">
                        <div>{item.name}</div>
                        <div className="text-[11px] text-slate-500 font-normal">
                          SKU: {item.sku} | {item.category}
                        </div>
                      </td>
                      <td className="p-3.5 text-right text-slate-400">
                        Rs {item.cost.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-200">
                        Rs {item.selling.toLocaleString()}
                      </td>
                      <td
                        className={`p-3.5 text-right font-bold ${
                          item.profitRs < 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {item.profitRs >= 0 ? '+' : ''}Rs {item.profitRs.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-black border ${badgeClass}`}
                        >
                          {item.marginPct}% {item.isLoss ? 'LOSS' : ''}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-semibold text-slate-300">
                        {item.stock} {item.unit}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="text-slate-300 font-medium">
                          ~{item.daysUntilStockout} days remaining
                        </div>
                        <div className="text-[10px] text-slate-500">
                          ({item.dailyVelocity.toFixed(1)} {item.unit}/day)
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {displayItems.length > 10 && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/40">
            <PaginationControls
              currentPage={page}
              totalItems={displayItems.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 15, 25, 50]}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const ProfitMarginHeatmapModule = React.memo(ProfitMarginHeatmapModuleComponent);
