import React, { useState, useMemo } from 'react';
import {
  Coins,
  Receipt,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Printer,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  Clock,
  DollarSign,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { ExpenseItem, DailyClosingReport, UserProfile, ShopSettings, SaleInvoice } from '../../types';
import { OfflineDB } from '../../services/db';
import { ESCPOSPrinter } from '../../utils/escpos';
import { PaginationControls } from '../common/PaginationControls';
import { DayEndSummaryModal } from './DayEndSummaryModal';

interface ExpensesClosingModuleProps {
  currentUser: UserProfile;
  settings: ShopSettings;
  sales: SaleInvoice[];
  onRefreshData: () => void;
}

const ExpensesClosingModuleComponent: React.FC<ExpensesClosingModuleProps> = ({
  currentUser,
  settings,
  sales,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'closing'>('expenses');
  const [expenses, setExpenses] = useState<ExpenseItem[]>(OfflineDB.getExpenses());
  const [closings, setClosings] = useState<DailyClosingReport[]>(OfflineDB.getClosingReports());
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(null);

  // Day End Summary Modal State
  const [isDayEndModalOpen, setIsDayEndModalOpen] = useState(false);
  const [selectedSummaryDate, setSelectedSummaryDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Pagination for expenses
  const [expensesPage, setExpensesPage] = useState(1);
  const [expensesPageSize, setExpensesPageSize] = useState(10);

  const paginatedExpenses = useMemo(() => {
    const start = (expensesPage - 1) * expensesPageSize;
    return expenses.slice(start, start + expensesPageSize);
  }, [expenses, expensesPage, expensesPageSize]);

  // Pagination for Z-Report closings
  const [closingsPage, setClosingsPage] = useState(1);
  const [closingsPageSize, setClosingsPageSize] = useState(10);

  const paginatedClosings = useMemo(() => {
    const start = (closingsPage - 1) * closingsPageSize;
    return closings.slice(start, start + closingsPageSize);
  }, [closings, closingsPage, closingsPageSize]);

  // New Expense Form
  const [expenseCategory, setExpenseCategory] = useState<string>('Tea & Staff Food');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [expenseDescription, setExpenseDescription] = useState('');

  // Daily Closing Calculation
  const todayStr = new Date().toLocaleDateString();

  // Cash sales today
  const cashSalesToday = useMemo(() => {
    return sales
      .filter((s) => s.paymentMethod === 'cash')
      .reduce((acc, s) => acc + s.netTotal, 0);
  }, [sales]);

  // Cash expenses today
  const cashExpensesToday = useMemo(() => {
    return expenses
      .filter((e) => e.paymentMethod === 'cash')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  // Cash payments collected from customers today
  const udhaarCashToday = useMemo(() => {
    const payments = OfflineDB.getCustomerPaymentsToday();
    return payments
      .filter((p) => p.paymentMethod?.toLowerCase() === 'cash' || !p.paymentMethod)
      .reduce((acc, p) => acc + (p.credit || 0), 0);
  }, []);

  const openingCash = 15000; // Default or configured opening float
  const expectedCash = openingCash + cashSalesToday + udhaarCashToday - cashExpensesToday;

  // Currency Denomination Counter
  const [denom5000, setDenom5000] = useState(0);
  const [denom1000, setDenom1000] = useState(0);
  const [denom500, setDenom500] = useState(0);
  const [denom100, setDenom100] = useState(0);
  const [denom50, setDenom50] = useState(0);
  const [denom20, setDenom20] = useState(0);
  const [denom10, setDenom10] = useState(0);
  const [closingNotes, setClosingNotes] = useState('');

  const actualCountedCash = useMemo(() => {
    return (
      denom5000 * 5000 +
      denom1000 * 1000 +
      denom500 * 500 +
      denom100 * 100 +
      denom50 * 50 +
      denom20 * 20 +
      denom10 * 10
    );
  }, [denom5000, denom1000, denom500, denom100, denom50, denom20, denom10]);

  const discrepancy = actualCountedCash - expectedCash;

  // Submit Expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0) return;

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      category: expenseCategory as any,
      amount: expenseAmount,
      description: expenseDescription,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      paidBy: currentUser.displayName,
      paymentMethod: expensePaymentMethod,
    };

    OfflineDB.saveExpense(newExpense, currentUser.email);
    setExpenses(OfflineDB.getExpenses());
    setExpenseAmount(0);
    setExpenseDescription('');
    onRefreshData();
  };

  // Submit Z-Report Cash Closing
  const handleCloseRegister = () => {
    const report: DailyClosingReport = {
      id: `close-${Date.now()}`,
      date: todayStr,
      closedAt: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      closedByEmail: currentUser.email,
      openingCash,
      cashSalesTotal: cashSalesToday,
      udhaarCollectedCash: udhaarCashToday,
      cashExpensesTotal: cashExpensesToday,
      expectedCash,
      actualCash: actualCountedCash,
      discrepancy,
      notes: closingNotes,
    };

    OfflineDB.saveDailyClosing(report);
    setClosings(OfflineDB.getClosingReports());
    alert('Daily Cash Register Closed successfully! Z-Report is ready for thermal printing.');
  };

  const handlePrintZReport = (report: DailyClosingReport) => {
    const text = ESCPOSPrinter.formatZReportText(report, settings);
    window.print();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-900">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-400" />
            Expenses & Daily Cash Closing (Z-Report)
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Record shop overheads, audit cashier drawer cash, and generate Z-closing reports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-4 py-2 rounded-lg font-bold transition ${
                activeTab === 'expenses' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Shop Expenses
            </button>
            <button
              onClick={() => setActiveTab('closing')}
              className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'closing' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Z-Report Closing
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedSummaryDate(new Date().toISOString().slice(0, 10));
              setIsDayEndModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            title="Open printable Day End Financial Summary Report"
          >
            <Printer className="w-4 h-4" />
            <span>Print Day End Summary (روزانہ رپورٹ)</span>
          </button>
        </div>
      </div>

      {activeTab === 'expenses' ? (
        /* ================= EXPENSES SECTION ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* New Expense Form */}
          <div className="lg:col-span-1 p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              Record Shop Expense
            </h3>

            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Expense Category *</label>
                <select
                  aria-label="Expense Category"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Rent">Shop Rent</option>
                  <option value="Electricity & Utilities">Electricity & WAPDA Bill</option>
                  <option value="Salaries & Wages">Staff Wages & Salaries</option>
                  <option value="Tea & Staff Food">Tea, Food & Refreshments</option>
                  <option value="Packaging & Bags">Shopping Bags & Packaging</option>
                  <option value="Transport & Freight">Transport & Cargo Fare</option>
                  <option value="Maintenance">Shop Maintenance & Cleaning</option>
                  <option value="Miscellaneous">Miscellaneous Overhead</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Amount (Rs) *</label>
                <input
                  autoFocus
                  type="number"
                  required
                  min="1"
                  value={expenseAmount || ''}
                  onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 1500"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-base font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Payment Method</label>
                <select
                  aria-label="Payment Method"
                  value={expensePaymentMethod}
                  onChange={(e) => setExpensePaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="cash">Cash from Register Drawer</option>
                  <option value="bank">Bank Transfer / Online</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description / Voucher Ref</label>
                <textarea
                  rows={3}
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="Details of expense..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow"
              >
                Log Expense
              </button>
            </form>
          </div>

          {/* Expenses Table */}
          <div className="lg:col-span-2 bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Expense Log History
              </h3>
              <span className="text-xs text-amber-400 font-bold">
                Total: Rs {expenses.reduce((acc, e) => acc + e.amount, 0).toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                    <th className="p-3">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Paid By</th>
                    <th className="p-3 text-center">Source</th>
                    <th className="p-3 text-right">Amount (Rs)</th>
                    <th className="p-3 text-right w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {paginatedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No expenses logged yet.
                      </td>
                    </tr>
                  ) : (
                    paginatedExpenses.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/40">
                        <td className="p-3 text-slate-400 whitespace-nowrap">{item.date}</td>
                        <td className="p-3 font-semibold text-white">{item.category}</td>
                        <td className="p-3 text-slate-300">{item.description || '-'}</td>
                        <td className="p-3 text-slate-400">{item.paidBy}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-300">
                            {item.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-red-400">
                          -Rs {item.amount.toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setExpenseToDelete(item)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition cursor-pointer"
                            title="Delete Expense Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {expenses.length > 5 && (
              <div className="p-4 border-t border-slate-800 bg-slate-900/40">
                <PaginationControls
                  currentPage={expensesPage}
                  totalItems={expenses.length}
                  pageSize={expensesPageSize}
                  onPageChange={setExpensesPage}
                  onPageSizeChange={setExpensesPageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= DAILY CASH CLOSING (Z-REPORT) SECTION ================= */
        <div className="space-y-6">
          {/* Register Audit Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">Opening Float</span>
              <div className="text-xl font-bold text-white mt-1">
                Rs {openingCash.toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs text-emerald-400 font-semibold">(+) Cash Sales</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                Rs {cashSalesToday.toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs text-red-400 font-semibold">(-) Cash Expenses</span>
              <div className="text-xl font-bold text-red-400 mt-1">
                Rs {cashExpensesToday.toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs text-amber-400 font-semibold">Expected Cash in Drawer</span>
              <div className="text-xl font-black text-amber-400 mt-1">
                Rs {expectedCash.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Cash Denomination Counter Calculator */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Physical Cash Drawer Denomination Count
                </h3>
                <p className="text-xs text-slate-400">
                  Count paper currency notes in the cash drawer at end of day
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Total Counted:</span>
                <div className="text-2xl font-black text-white">
                  Rs {actualCountedCash.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Note Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400">Rs 5,000 Note</span>
                <input
                  type="number"
                  min="0"
                  value={denom5000 || ''}
                  onChange={(e) => setDenom5000(parseInt(e.target.value, 10) || 0)}
                  placeholder="Qty"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-center text-white"
                />
                <div className="text-[11px] text-slate-400 text-right">
                  Rs {(denom5000 * 5000).toLocaleString()}
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400">Rs 1,000 Note</span>
                <input
                  type="number"
                  min="0"
                  value={denom1000 || ''}
                  onChange={(e) => setDenom1000(parseInt(e.target.value, 10) || 0)}
                  placeholder="Qty"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-center text-white"
                />
                <div className="text-[11px] text-slate-400 text-right">
                  Rs {(denom1000 * 1000).toLocaleString()}
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400">Rs 500 Note</span>
                <input
                  type="number"
                  min="0"
                  value={denom500 || ''}
                  onChange={(e) => setDenom500(parseInt(e.target.value, 10) || 0)}
                  placeholder="Qty"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-center text-white"
                />
                <div className="text-[11px] text-slate-400 text-right">
                  Rs {(denom500 * 500).toLocaleString()}
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400">Rs 100 Note</span>
                <input
                  type="number"
                  min="0"
                  value={denom100 || ''}
                  onChange={(e) => setDenom100(parseInt(e.target.value, 10) || 0)}
                  placeholder="Qty"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-center text-white"
                />
                <div className="text-[11px] text-slate-400 text-right">
                  Rs {(denom100 * 100).toLocaleString()}
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400">Rs 50 Note</span>
                <input
                  type="number"
                  min="0"
                  value={denom50 || ''}
                  onChange={(e) => setDenom50(parseInt(e.target.value, 10) || 0)}
                  placeholder="Qty"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-center text-white"
                />
                <div className="text-[11px] text-slate-400 text-right">
                  Rs {(denom50 * 50).toLocaleString()}
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400">Rs 20 Note</span>
                <input
                  type="number"
                  min="0"
                  value={denom20 || ''}
                  onChange={(e) => setDenom20(parseInt(e.target.value, 10) || 0)}
                  placeholder="Qty"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-center text-white"
                />
                <div className="text-[11px] text-slate-400 text-right">
                  Rs {(denom20 * 20).toLocaleString()}
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400">Rs 10 / Coins</span>
                <input
                  type="number"
                  min="0"
                  value={denom10 || ''}
                  onChange={(e) => setDenom10(parseInt(e.target.value, 10) || 0)}
                  placeholder="Qty"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-center text-white"
                />
                <div className="text-[11px] text-slate-400 text-right">
                  Rs {(denom10 * 10).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Reconciliation Discrepancy Status */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                discrepancy === 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : discrepancy > 0
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              <div>
                <div className="font-bold text-sm">
                  {discrepancy === 0
                    ? 'Drawer Perfectly Balanced (0 Discrepancy)'
                    : discrepancy > 0
                    ? `Drawer Cash Surplus: +Rs ${discrepancy.toLocaleString()}`
                    : `Drawer Cash Shortage: -Rs ${Math.abs(discrepancy).toLocaleString()}`}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Expected: Rs {expectedCash.toLocaleString()} | Actual Counted: Rs {actualCountedCash.toLocaleString()}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseRegister}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition"
              >
                Close Drawer & Generate Z-Report
              </button>
            </div>
          </div>

          {/* Past Z-Report Closings Table */}
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Historic Z-Report Closings
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Closed By</th>
                    <th className="p-3 text-right">Expected (Rs)</th>
                    <th className="p-3 text-right">Actual Counted (Rs)</th>
                    <th className="p-3 text-right">Discrepancy (Rs)</th>
                    <th className="p-3 text-center">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {paginatedClosings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        No Z-Report closings recorded yet.
                      </td>
                    </tr>
                  ) : (
                    paginatedClosings.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-900/40">
                        <td className="p-3 text-white font-medium">
                          {c.date} at {c.closedAt}
                        </td>
                        <td className="p-3 text-slate-400">{c.closedByEmail}</td>
                        <td className="p-3 text-right text-slate-300">
                          Rs {c.expectedCash.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-bold text-white">
                          Rs {c.actualCash.toLocaleString()}
                        </td>
                        <td
                          className={`p-3 text-right font-bold ${
                            c.discrepancy === 0
                              ? 'text-emerald-400'
                              : c.discrepancy > 0
                              ? 'text-blue-400'
                              : 'text-red-400'
                          }`}
                        >
                          {c.discrepancy >= 0 ? '+' : ''}Rs {c.discrepancy.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handlePrintZReport(c)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400"
                            title="Print Z-Report on Thermal Printer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {closings.length > 5 && (
              <div className="p-4 border-t border-slate-800 bg-slate-900/40">
                <PaginationControls
                  currentPage={closingsPage}
                  totalItems={closings.length}
                  pageSize={closingsPageSize}
                  onPageChange={setClosingsPage}
                  onPageSizeChange={setClosingsPageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Expense Entry</h3>
                <p className="text-xs text-slate-400">Permanently remove this logged shop expense</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="text-slate-200 font-bold text-sm">{expenseToDelete.category}</div>
              <div className="text-slate-400">Date: {expenseToDelete.date} | Paid By: {expenseToDelete.paidBy}</div>
              <div className="text-slate-400">Description: {expenseToDelete.description || 'N/A'}</div>
              <div className="text-red-400 font-bold font-mono text-sm pt-1">
                Amount: -Rs {expenseToDelete.amount.toLocaleString()} ({expenseToDelete.paymentMethod.toUpperCase()})
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  OfflineDB.deleteExpense(expenseToDelete.id, currentUser.email);
                  setExpenses((prev) => prev.filter((e) => e.id !== expenseToDelete.id));
                  setExpenseToDelete(null);
                  onRefreshData();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Confirm Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day End Printable Summary Report Modal */}
      <DayEndSummaryModal
        isOpen={isDayEndModalOpen}
        onClose={() => setIsDayEndModalOpen(false)}
        selectedDate={selectedSummaryDate}
        sales={sales}
        expenses={expenses}
        closingReport={closings.find((c) => c.date === selectedSummaryDate) || null}
        settings={settings}
        currentUser={currentUser}
      />
    </div>
  );
};

export const ExpensesClosingModule = React.memo(ExpensesClosingModuleComponent);
