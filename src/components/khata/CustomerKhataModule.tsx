import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Building,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  History,
} from 'lucide-react';
import { Customer, LedgerEntry, UserProfile, ShopSettings } from '../../types';
import { OfflineDB } from '../../services/db';

interface CustomerKhataModuleProps {
  customers: Customer[];
  currentUser: UserProfile;
  settings: ShopSettings;
  onRefreshCustomers: () => void;
}

export const CustomerKhataModule: React.FC<CustomerKhataModuleProps> = ({
  customers,
  currentUser,
  settings,
  onRefreshCustomers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'cheque'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Total Outstanding Udhaar Across All Customers
  const totalReceivables = useMemo(() => {
    return customers.reduce((acc, c) => acc + c.currentBalance, 0);
  }, [customers]);

  // Filtered customer directory
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.shopName && c.shopName.toLowerCase().includes(q)) ||
        c.phone.includes(q)
    );
  }, [customers, searchQuery]);

  // Currently active customer for ledger inspection
  const activeCustomer = useMemo(() => {
    if (!selectedCustomerId) return customers[0] || null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Customer's ledger history
  const activeLedger = useMemo(() => {
    if (!activeCustomer) return [];
    return OfflineDB.getCustomerLedger(activeCustomer.id);
  }, [activeCustomer]);

  // Open Add Customer Modal
  const openNewCustomerModal = () => {
    setEditingCustomer({
      id: `cust-${Date.now()}`,
      name: '',
      shopName: '',
      phone: '',
      address: '',
      creditLimit: 50000,
      currentBalance: 0,
      notes: '',
    });
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.name || !editingCustomer.phone) return;

    const fullCustomer: Customer = {
      id: editingCustomer.id || `cust-${Date.now()}`,
      name: editingCustomer.name,
      shopName: editingCustomer.shopName || '',
      phone: editingCustomer.phone,
      address: editingCustomer.address || '',
      creditLimit: Number(editingCustomer.creditLimit) || 50000,
      currentBalance: Number(editingCustomer.currentBalance) || 0,
      notes: editingCustomer.notes || '',
      createdAt: editingCustomer.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    OfflineDB.saveCustomer(fullCustomer, currentUser.email);
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
    onRefreshCustomers();
  };

  // Submit Payment Received (Wasooli)
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || paymentAmount <= 0) return;

    OfflineDB.recordCustomerPayment(
      activeCustomer.id,
      paymentAmount,
      paymentMethod,
      paymentNotes,
      currentUser.displayName
    );

    setIsPaymentModalOpen(false);
    setPaymentAmount(0);
    setPaymentNotes('');
    onRefreshCustomers();
  };

  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-900">
      {/* ================= LEFT SIDEBAR: CUSTOMER DIRECTORY ================= */}
      <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col border-r border-slate-800 bg-slate-950/60 overflow-hidden shrink-0">
        {/* Header & Metric */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Customer Khata Ledger
            </h2>
            <button
              onClick={openNewCustomerModal}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              New Account
            </button>
          </div>

          {/* Total Udhaar Banner */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400">Total Udhaar (Receivables)</span>
              <div className="text-lg font-black text-amber-400">
                Rs {totalReceivables.toLocaleString()}
              </div>
            </div>
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
              {customers.length} Accounts
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer, shop, phone..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredCustomers.map((cust) => {
            const isSelected = activeCustomer?.id === cust.id;
            const hasDebt = cust.currentBalance > 0;
            const isOverLimit = cust.currentBalance > cust.creditLimit;

            return (
              <button
                key={cust.id}
                onClick={() => setSelectedCustomerId(cust.id)}
                className={`w-full text-left p-3 rounded-xl border transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-amber-400/60 shadow-md'
                    : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{cust.name}</h4>
                    {cust.shopName && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-500" />
                        {cust.shopName}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-0.5">{cust.phone}</p>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xs font-black ${
                        isOverLimit
                          ? 'text-red-400'
                          : hasDebt
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      Rs {cust.currentBalance.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Limit: Rs {cust.creditLimit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= RIGHT PANEL: ACTIVE CUSTOMER KHATA TIMELINE ================= */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
        {activeCustomer ? (
          <>
            {/* Customer Summary Topbar */}
            <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">{activeCustomer.name}</h3>
                  {activeCustomer.shopName && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
                      {activeCustomer.shopName}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Phone: {activeCustomer.phone}</span>
                  {activeCustomer.address && <span>• Address: {activeCustomer.address}</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintStatement}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Statement
                </button>

                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Receive Payment (وصولی)
                </button>
              </div>
            </div>

            {/* Financial Status Cards */}
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold">Outstanding Debt Due</span>
                <div
                  className={`text-2xl font-black mt-1 ${
                    activeCustomer.currentBalance > activeCustomer.creditLimit
                      ? 'text-red-400'
                      : activeCustomer.currentBalance > 0
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  Rs {activeCustomer.currentBalance.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Payable by customer</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold">Sanctioned Credit Limit</span>
                <div className="text-2xl font-black text-slate-200 mt-1">
                  Rs {activeCustomer.creditLimit.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Maximum Udhaar allowed</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold">Available Credit Margin</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  Rs {Math.max(0, activeCustomer.creditLimit - activeCustomer.currentBalance).toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Remaining safe buffer</p>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
              <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                    <History className="w-4 h-4 text-amber-400" />
                    Transaction Khata History (Debit & Credit)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {activeLedger.length} entries recorded
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                        <th className="p-3">Date & Time</th>
                        <th className="p-3">Reference / Description</th>
                        <th className="p-3 text-center">Type</th>
                        <th className="p-3 text-right">Debit (+) (Rs)</th>
                        <th className="p-3 text-right">Credit (-) (Rs)</th>
                        <th className="p-3 text-right">Khata Balance (Rs)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {activeLedger.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-500">
                            No ledger transactions recorded yet for this customer.
                          </td>
                        </tr>
                      ) : (
                        activeLedger.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-900/50 transition">
                            <td className="p-3 text-slate-300 whitespace-nowrap">{entry.date}</td>
                            <td className="p-3 text-white font-medium">
                              <div>{entry.notes || (entry.type === 'credit_sale' ? 'Credit Sale' : entry.type === 'payment_received' ? 'Payment Received' : entry.type === 'return_credit' ? 'Return Adjustment' : 'Opening Balance')}</div>
                              {entry.referenceId && (
                                <span className="font-mono text-[10px] text-slate-500">
                                  Ref: {entry.referenceId}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  entry.debit > 0
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'bg-emerald-500/15 text-emerald-300'
                                }`}
                              >
                                {entry.debit > 0 ? 'Sale (Udhaar)' : 'Payment Received'}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-amber-400">
                              {entry.debit > 0 ? `Rs ${entry.debit.toLocaleString()}` : '-'}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-400">
                              {entry.credit > 0 ? `Rs ${entry.credit.toLocaleString()}` : '-'}
                            </td>
                            <td className="p-3 text-right font-bold text-slate-200">
                              Rs {entry.runningBalance.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center p-8 text-center text-slate-500">
            <p>Select or create a customer account to view their Khata ledger.</p>
          </div>
        )}
      </div>

      {/* ================= RECEIVE PAYMENT MODAL (WASOOLI) ================= */}
      {isPaymentModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                Receive Payment: {activeCustomer.name}
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 pt-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Current Outstanding Debt:</span>
                <span className="text-base font-bold text-amber-400">
                  Rs {activeCustomer.currentBalance.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Amount Received (Rs) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 5000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-base font-bold text-emerald-400 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Payment Method</label>
                <select
                  aria-label="Payment Method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="cash">Cash in Drawer (Adds to Daily Cash)</option>
                  <option value="bank">Bank Transfer / Online (HBL / Meezan)</option>
                  <option value="cheque">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes / Receipt Ref</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Received by Cashier via Cash Counter"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow"
                >
                  Confirm Wasooli (Rs {paymentAmount.toLocaleString()})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADD / EDIT CUSTOMER MODAL ================= */}
      {isCustomerModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create Customer Khata Profile</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 pt-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  placeholder="e.g. Haji Muhammad Aslam"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Boutique / Shop Name</label>
                <input
                  type="text"
                  value={editingCustomer.shopName || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, shopName: e.target.value })}
                  placeholder="e.g. Aslam Zari House, Anarkali"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Mobile / Phone *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.phone || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    placeholder="0300-1234567"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Credit Limit (Rs)</label>
                  <input
                    type="number"
                    value={editingCustomer.creditLimit ?? 50000}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, creditLimit: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Address / Market Location</label>
                <input
                  type="text"
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  placeholder="Shop #12, Azam Cloth Market, Lahore"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
