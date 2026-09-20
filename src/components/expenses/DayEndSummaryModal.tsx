import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  RotateCcw,
  Coins,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Building2,
  Clock,
} from 'lucide-react';
import { SaleInvoice, ExpenseItem, DailyClosingReport, ShopSettings, UserProfile } from '../../types';
import { OfflineDB } from '../../services/db';

interface DayEndSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD or readable string
  sales: SaleInvoice[];
  expenses: ExpenseItem[];
  closingReport?: DailyClosingReport | null;
  settings: ShopSettings;
  currentUser: UserProfile;
}

export const DayEndSummaryModal: React.FC<DayEndSummaryModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  sales,
  expenses,
  closingReport,
  settings,
  currentUser,
}) => {
  const [printLayout, setPrintLayout] = useState<'thermal80' | 'a4'>('thermal80');

  // Filter sales for the chosen day
  const daySales = useMemo(() => {
    const targetDateStr = new Date(selectedDate).toISOString().slice(0, 10);
    return sales.filter((s) => {
      const saleDate = new Date(s.timestamp).toISOString().slice(0, 10);
      return saleDate === targetDateStr && s.status === 'completed';
    });
  }, [sales, selectedDate]);

  // Filter expenses for the chosen day
  const dayExpenses = useMemo(() => {
    const targetDateStr = new Date(selectedDate).toISOString().slice(0, 10);
    return expenses.filter((e) => {
      const expDate = new Date(e.timestamp || e.date).toISOString().slice(0, 10);
      return expDate === targetDateStr;
    });
  }, [expenses, selectedDate]);

  // Udhaar payments received today
  const dayCustomerPayments = useMemo(() => {
    const payments = OfflineDB.getCustomerPaymentsToday();
    return payments;
  }, []);

  // Financial Metrics Calculation
  const totalInvoices = daySales.length;
  const grossSales = daySales.reduce((acc, s) => acc + (s.subtotal || 0), 0);
  const totalDiscounts = daySales.reduce((acc, s) => acc + (s.discountAmount || 0), 0);
  const netSales = daySales.reduce((acc, s) => acc + (s.netTotal || 0), 0);
  const avgBasketSize = totalInvoices > 0 ? Math.round(netSales / totalInvoices) : 0;

  // Payment Breakdown
  const cashSales = daySales
    .filter((s) => s.paymentMethod === 'cash')
    .reduce((acc, s) => acc + s.netTotal, 0);

  const cardSales = daySales
    .filter((s) => s.paymentMethod === 'card')
    .reduce((acc, s) => acc + s.netTotal, 0);

  const creditSales = daySales
    .filter((s) => s.paymentMethod === 'credit')
    .reduce((acc, s) => acc + s.netTotal, 0);

  // Udhaar Wasooli (Cash payments from credit customers)
  const udhaarCashWasooli = dayCustomerPayments
    .filter((p) => p.paymentMethod?.toLowerCase() === 'cash' || !p.paymentMethod)
    .reduce((acc, p) => acc + (p.credit || 0), 0);

  const udhaarBankWasooli = dayCustomerPayments
    .filter((p) => p.paymentMethod?.toLowerCase() === 'bank transfer' || p.paymentMethod?.toLowerCase() === 'card')
    .reduce((acc, p) => acc + (p.credit || 0), 0);

  // Expenses Breakdown
  const cashExpenses = dayExpenses
    .filter((e) => e.paymentMethod === 'cash')
    .reduce((acc, e) => acc + e.amount, 0);

  const bankExpenses = dayExpenses
    .filter((e) => e.paymentMethod === 'bank')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalExpenses = cashExpenses + bankExpenses;

  // Expenses grouped by category
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    dayExpenses.forEach((e) => {
      const curr = map.get(e.category) || 0;
      map.set(e.category, curr + e.amount);
    });
    return Array.from(map.entries()).map(([category, amount]) => ({ category, amount }));
  }, [dayExpenses]);

  // COGS & Profit
  const totalCOGS = daySales.reduce((acc, s) => {
    const saleCost = s.items.reduce((sum, item) => sum + (item.product.costPrice || 0) * item.quantity, 0);
    return acc + saleCost;
  }, 0);

  const grossProfit = Math.max(0, netSales - totalCOGS);
  const grossMarginPercent = netSales > 0 ? Math.round((grossProfit / netSales) * 100) : 0;
  const netDayProfit = grossProfit - totalExpenses;

  // Cash Drawer Expected Balance
  const openingFloat = 15000;
  const expectedDrawerCash = openingFloat + cashSales + udhaarCashWasooli - cashExpenses;

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-6 duration-300">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Day End Summary Report
                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-normal">
                  روزانہ اختتامی رپورٹ
                </span>
              </h3>
              <p className="text-xs text-slate-400">{formattedDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Toggle */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPrintLayout('thermal80')}
                className={`px-3 py-1 font-semibold rounded-lg transition ${
                  printLayout === 'thermal80'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                80mm Slip
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout('a4')}
                className={`px-3 py-1 font-semibold rounded-lg transition ${
                  printLayout === 'a4'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                A4 Sheet
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50 flex justify-center items-start">
          {printLayout === 'thermal80' ? (
            /* 80mm POS Thermal Slip Layout */
            <div
              id="printable-day-end-slip"
              className="w-[80mm] min-h-[500px] bg-white text-black p-4 font-mono text-xs shadow-2xl rounded-sm print:shadow-none print:w-full print:p-0"
            >
              {/* Slip Header */}
              <div className="text-center border-b border-dashed border-black pb-3 mb-3">
                <h1 className="text-sm font-black uppercase tracking-wider">{settings.shopName}</h1>
                <p className="text-[10px] text-gray-700 leading-tight mt-0.5">{settings.address}</p>
                <p className="text-[10px] text-gray-700">Phone: {settings.phone}</p>
                <div className="my-2 border-t border-b border-black py-1 font-bold text-[11px] uppercase tracking-wide">
                  DAY END Z-SUMMARY REPORT
                </div>
                <div className="text-[10px] text-gray-600 space-y-0.5 text-left">
                  <div><span className="font-bold">Date:</span> {new Date().toLocaleDateString()}</div>
                  <div><span className="font-bold">Time:</span> {new Date().toLocaleTimeString()}</div>
                  <div><span className="font-bold">Cashier / Staff:</span> {currentUser.displayName}</div>
                  <div><span className="font-bold">Register ID:</span> POS-TERM-01</div>
                </div>
              </div>

              {/* Sales Key Metrics */}
              <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1">
                <div className="font-bold text-[11px] underline uppercase">1. Sales Performance</div>
                <div className="flex justify-between">
                  <span>Gross Sales:</span>
                  <span className="font-bold">Rs {grossSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discounts Given:</span>
                  <span>- Rs {totalDiscounts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-[11px] pt-1 border-t border-dotted border-gray-400">
                  <span>NET SALES:</span>
                  <span>Rs {netSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>Total Invoices:</span>
                  <span>{totalInvoices} bills</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>Avg Ticket:</span>
                  <span>Rs {avgBasketSize.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1">
                <div className="font-bold text-[11px] underline uppercase">2. Tender Breakdown</div>
                <div className="flex justify-between">
                  <span>Cash Sales:</span>
                  <span>Rs {cashSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Card / POS:</span>
                  <span>Rs {cardSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Credit (Udhaar):</span>
                  <span>Rs {creditSales.toLocaleString()}</span>
                </div>
              </div>

              {/* Udhaar Wasooli */}
              <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1">
                <div className="font-bold text-[11px] underline uppercase">3. Udhaar Wasooli (Recovery)</div>
                <div className="flex justify-between">
                  <span>Cash Collected:</span>
                  <span className="font-bold">Rs {udhaarCashWasooli.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bank Transferred:</span>
                  <span>Rs {udhaarBankWasooli.toLocaleString()}</span>
                </div>
              </div>

              {/* Expenses Breakdown */}
              <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1">
                <div className="font-bold text-[11px] underline uppercase">4. Daily Expenses</div>
                {expensesByCategory.map((exp, i) => (
                  <div key={i} className="flex justify-between text-[10px]">
                    <span className="truncate pr-2">{exp.category}:</span>
                    <span>Rs {exp.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-1 border-t border-dotted border-gray-400">
                  <span>Total Expenses:</span>
                  <span>Rs {totalExpenses.toLocaleString()}</span>
                </div>
              </div>

              {/* Cash Drawer Position */}
              <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1">
                <div className="font-bold text-[11px] underline uppercase">5. Cash Drawer Reconciliation</div>
                <div className="flex justify-between text-[10px]">
                  <span>Opening Float:</span>
                  <span>Rs {openingFloat.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>+ Cash Sales:</span>
                  <span>Rs {cashSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>+ Cash Wasooli:</span>
                  <span>Rs {udhaarCashWasooli.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>- Cash Expenses:</span>
                  <span>Rs {cashExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-[11px] pt-1 border-t border-black">
                  <span>EXPECTED CASH:</span>
                  <span>Rs {expectedDrawerCash.toLocaleString()}</span>
                </div>
                {closingReport && (
                  <div className="flex justify-between font-bold text-[11px] text-gray-800">
                    <span>COUNTED CASH:</span>
                    <span>Rs {(closingReport.actualCash || 0).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Profitability */}
              <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1">
                <div className="font-bold text-[11px] underline uppercase">6. Estimated Daily Margin</div>
                <div className="flex justify-between text-[10px]">
                  <span>COGS:</span>
                  <span>Rs {totalCOGS.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Gross Margin ({grossMarginPercent}%):</span>
                  <span>Rs {grossProfit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-[11px] pt-1 border-t border-black">
                  <span>EST. NET PROFIT:</span>
                  <span>Rs {netDayProfit.toLocaleString()}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-4 text-center space-y-4">
                <div className="flex justify-between text-[9px] pt-6">
                  <div className="text-center">
                    <div className="w-20 border-t border-black mx-auto"></div>
                    <div>Cashier Signature</div>
                  </div>
                  <div className="text-center">
                    <div className="w-20 border-t border-black mx-auto"></div>
                    <div>Manager Signature</div>
                  </div>
                </div>
                <p className="text-[8px] text-gray-500">
                  New Sajjad Zari Corporation ERP • Automated Day End Closing
                </p>
              </div>
            </div>
          ) : (
            /* A4 Full Sheet Layout */
            <div
              id="printable-day-end-a4"
              className="w-full max-w-2xl bg-white text-slate-900 p-8 rounded-lg shadow-xl font-sans text-sm print:shadow-none print:max-w-none print:p-0"
            >
              <div className="flex justify-between items-start border-b border-slate-300 pb-4 mb-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{settings.shopName}</h1>
                  <p className="text-xs text-slate-600 mt-1">{settings.address}</p>
                  <p className="text-xs text-slate-600">Phone: {settings.phone}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 rounded font-bold text-xs uppercase tracking-wider">
                    Daily Closing Statement
                  </span>
                  <p className="text-xs text-slate-500 mt-2 font-mono">Date: {formattedDate}</p>
                  <p className="text-xs text-slate-500 font-mono">Staff: {currentUser.displayName}</p>
                </div>
              </div>

              {/* Executive Summary Cards */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Net Sales</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">Rs {netSales.toLocaleString()}</div>
                  <div className="text-[10px] text-emerald-600">{totalInvoices} Invoices</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Wasooli (Recovery)</div>
                  <div className="text-lg font-bold text-emerald-700 mt-1">Rs {(udhaarCashWasooli + udhaarBankWasooli).toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500">Credit Collections</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Expenses</div>
                  <div className="text-lg font-bold text-red-600 mt-1">Rs {totalExpenses.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500">{dayExpenses.length} entries</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Drawer Cash</div>
                  <div className="text-lg font-bold text-amber-700 mt-1">Rs {expectedDrawerCash.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500">Expected Total</div>
                </div>
              </div>

              {/* Two Column Detailed Breakdown */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Left Column: Sales & Tender */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b pb-1.5">
                    Sales & Tender Summary
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Gross Sales Value</span>
                      <span className="font-medium">Rs {grossSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Discounts & Loyalty</span>
                      <span className="text-red-600 font-medium">- Rs {totalDiscounts.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 font-bold text-slate-900">
                      <span>Net Sales Total</span>
                      <span>Rs {netSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                      <span>• Cash Collected (Counter)</span>
                      <span>Rs {cashSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                      <span>• Card / POS Terminal</span>
                      <span>Rs {cardSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 text-slate-600">
                      <span>• Credit (Customer Khata)</span>
                      <span>Rs {creditSales.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Operating Expenses */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b pb-1.5">
                    Expense Breakdown
                  </h4>
                  <div className="space-y-2 text-xs">
                    {expensesByCategory.map((exp, i) => (
                      <div key={i} className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">{exp.category}</span>
                        <span className="font-medium">Rs {exp.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {expensesByCategory.length === 0 && (
                      <div className="text-xs text-slate-400 italic py-2">No expenses recorded today.</div>
                    )}
                    <div className="flex justify-between py-1 border-t border-slate-200 font-bold text-red-600 pt-2">
                      <span>Total Operating Expenses</span>
                      <span>Rs {totalExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures Footer */}
              <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-600">
                <div>
                  <p>Verified By: ___________________________</p>
                  <p className="text-[10px] text-slate-400 mt-1">Authorized Cashier / Floor In-Charge</p>
                </div>
                <div className="text-right">
                  <p>Approved By: ___________________________</p>
                  <p className="text-[10px] text-slate-400 mt-1">Store Owner / General Manager</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/70 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Official Z-Report Record • Indexed in Local Audit Database</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition shadow-lg shadow-amber-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>Print Day End Summary</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
