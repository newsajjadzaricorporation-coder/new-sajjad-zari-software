import React, { useState, useMemo, useEffect } from 'react';
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
  Trash2,
  Edit2,
  Award,
  Crown,
  Coins,
  Sparkles,
  Gift,
  Star,
  ChevronRight,
  ChevronLeft,
  Download,
} from 'lucide-react';
import { Customer, LedgerEntry, UserProfile, ShopSettings, LoyaltyTier } from '../../types';
import { OfflineDB } from '../../services/db';
import { LOYALTY_TIERS, getCustomerLoyaltyTier } from '../../utils/loyalty';
import { exportToCSV } from '../../utils/csvExport';
import { PaginationControls } from '../common/PaginationControls';

interface CustomerKhataModuleProps {
  customers: Customer[];
  currentUser: UserProfile;
  settings: ShopSettings;
  onRefreshCustomers: () => void;
}

const CustomerKhataModuleComponent: React.FC<CustomerKhataModuleProps> = ({
  customers,
  currentUser,
  settings,
  onRefreshCustomers,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Multi-Select Customers State
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isBatchCustomerDeleteOpen, setIsBatchCustomerDeleteOpen] = useState(false);

  // Multi-Select Ledger Entries State
  const [selectedLedgerIds, setSelectedLedgerIds] = useState<string[]>([]);
  const [ledgerEntryToDelete, setLedgerEntryToDelete] = useState<LedgerEntry | null>(null);
  const [isBatchLedgerDeleteOpen, setIsBatchLedgerDeleteOpen] = useState(false);

  // Customer Directory Pagination State
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(15);

  // Ledger Table Pagination State
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(20);

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'cheque'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Loyalty Points Adjustment Modal
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [pointsAdjustmentDelta, setPointsAdjustmentDelta] = useState<number>(50);
  const [pointsAdjustmentReason, setPointsAdjustmentReason] = useState<string>('VIP Customer Special Bonus');

  // Total Outstanding Udhaar Across All Customers
  const totalReceivables = useMemo(() => {
    return customers.reduce((acc, c) => acc + c.currentBalance, 0);
  }, [customers]);

  // Filtered customer directory with name, urdu name, phone (normalized), shop name, and address
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;
    const cleanQ = q.replace(/[^0-9a-z]/gi, '');
    return customers.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const urduNameMatch = Boolean(c.urduName && c.urduName.includes(q));
      const shopMatch = Boolean(c.shopName && c.shopName.toLowerCase().includes(q));
      const addressMatch = Boolean(c.address && c.address.toLowerCase().includes(q));
      const notesMatch = Boolean(c.notes && c.notes.toLowerCase().includes(q));

      // Exact & normalized phone matching (e.g. 0300123 matches 0300-1234567 or +92 300 1234567)
      const rawPhone = (c.phone || '').replace(/[^0-9]/g, '');
      const phoneMatch = (c.phone || '').includes(q) || (cleanQ.length >= 3 && rawPhone.includes(cleanQ));

      return nameMatch || urduNameMatch || shopMatch || addressMatch || notesMatch || phoneMatch;
    });
  }, [customers, searchQuery]);

  // Paginated customers for high-performance rendering
  const paginatedCustomers = useMemo(() => {
    const start = (customerPage - 1) * customerPageSize;
    return filteredCustomers.slice(start, start + customerPageSize);
  }, [filteredCustomers, customerPage, customerPageSize]);

  const totalCustomerPages = Math.max(1, Math.ceil(filteredCustomers.length / customerPageSize));

  // Currently active customer for ledger inspection
  const activeCustomer = useMemo(() => {
    if (filteredCustomers.length > 0) {
      if (selectedCustomerId) {
        const found = filteredCustomers.find((c) => c.id === selectedCustomerId);
        if (found) return found;
      }
      return filteredCustomers[0];
    }
    if (!selectedCustomerId) return customers[0] || null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, filteredCustomers, selectedCustomerId]);

  // Active customer loyalty details
  const activeCustomerLoyalty = useMemo(() => {
    if (!activeCustomer) return null;
    const currentPoints = activeCustomer.loyaltyPoints ?? 0;
    const lifetime = activeCustomer.lifetimePoints ?? currentPoints;
    const tier = activeCustomer.loyaltyTier || getCustomerLoyaltyTier(lifetime);
    const tierConfig = LOYALTY_TIERS[tier] || LOYALTY_TIERS.Bronze;

    // Next tier progress
    let nextTierName: string | null = null;
    let pointsToNext = 0;
    let progressPercent = 100;

    if (tier === 'Bronze') {
      nextTierName = 'Silver';
      pointsToNext = Math.max(0, 500 - lifetime);
      progressPercent = Math.min(100, Math.round((lifetime / 500) * 100));
    } else if (tier === 'Silver') {
      nextTierName = 'Gold';
      pointsToNext = Math.max(0, 1500 - lifetime);
      progressPercent = Math.min(100, Math.round(((lifetime - 500) / 1000) * 100));
    } else if (tier === 'Gold') {
      nextTierName = 'Platinum';
      pointsToNext = Math.max(0, 3000 - lifetime);
      progressPercent = Math.min(100, Math.round(((lifetime - 1500) / 1500) * 100));
    } else {
      nextTierName = null;
      pointsToNext = 0;
      progressPercent = 100;
    }

    return {
      currentPoints,
      lifetime,
      tier,
      tierConfig,
      nextTierName,
      pointsToNext,
      progressPercent,
      pointRedemptionValue: currentPoints * (settings.pointRedemptionRate || 1),
    };
  }, [activeCustomer, settings]);

  // Customer's ledger history
  const activeLedger = useMemo(() => {
    if (!activeCustomer) return [];
    return OfflineDB.getCustomerLedger(activeCustomer.id);
  }, [activeCustomer]);

  // Paginated ledger entries for ultra-responsive UI
  const paginatedLedger = useMemo(() => {
    const start = (ledgerPage - 1) * ledgerPageSize;
    return activeLedger.slice(start, start + ledgerPageSize);
  }, [activeLedger, ledgerPage, ledgerPageSize]);

  // Reset ledger page & selection when customer changes
  useEffect(() => {
    setLedgerPage(1);
    setSelectedLedgerIds([]);
  }, [activeCustomer?.id]);

  // Export Selected Customers to CSV
  const handleExportSelectedCustomers = () => {
    const toExport = customers.filter((c) => selectedCustomerIds.includes(c.id));
    if (toExport.length === 0) return;

    const headers = [
      'Customer ID',
      'Customer Name',
      'Urdu Name',
      'Shop Name',
      'Phone',
      'Address',
      'Current Balance (Rs)',
      'Credit Limit (Rs)',
      'Loyalty Points',
      'Loyalty Tier',
      'Notes',
    ];

    const rows = toExport.map((c) => [
      c.id,
      c.name,
      c.urduName || '',
      c.shopName || '',
      c.phone || '',
      c.address || '',
      c.currentBalance,
      c.creditLimit,
      c.loyaltyPoints || 0,
      c.loyaltyTier || 'Bronze',
      c.notes || '',
    ]);

    exportToCSV(`Customers_Export_${Date.now()}`, headers, rows);
  };

  // Export Selected Ledger Entries to CSV
  const handleExportSelectedLedger = () => {
    const toExport = activeLedger.filter((l) => selectedLedgerIds.includes(l.id));
    if (toExport.length === 0) return;

    const headers = [
      'Entry ID',
      'Date & Time',
      'Reference',
      'Description / Notes',
      'Type',
      'Debit (+) (Rs)',
      'Credit (-) (Rs)',
      'Running Balance (Rs)',
      'Recorded By',
    ];

    const rows = toExport.map((l) => [
      l.id,
      l.date,
      l.referenceId || '',
      l.notes || '',
      l.type,
      l.debit || 0,
      l.credit || 0,
      l.runningBalance || 0,
      l.recordedBy || '',
    ]);

    exportToCSV(`Ledger_${(activeCustomer?.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`, headers, rows);
  };

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
      loyaltyPoints: 0,
      lifetimePoints: 0,
      loyaltyTier: 'Bronze',
      notes: '',
    });
    setIsCustomerModalOpen(true);
  };

  // Save Customer (Create or Edit)
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.name || !editingCustomer.phone) return;

    const lifetime = editingCustomer.lifetimePoints ?? editingCustomer.loyaltyPoints ?? 0;
    const tier = editingCustomer.loyaltyTier || getCustomerLoyaltyTier(lifetime);

    const saved = OfflineDB.saveCustomer(
      {
        id: editingCustomer.id || `cust-${Date.now()}`,
        name: editingCustomer.name,
        shopName: editingCustomer.shopName,
        phone: editingCustomer.phone,
        address: editingCustomer.address,
        creditLimit: editingCustomer.creditLimit || 50000,
        currentBalance: editingCustomer.currentBalance || 0,
        loyaltyPoints: editingCustomer.loyaltyPoints ?? 0,
        lifetimePoints: lifetime,
        loyaltyTier: tier,
        notes: editingCustomer.notes,
        createdAt: editingCustomer.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      currentUser.email
    );

    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
    setSelectedCustomerId(saved.id);
    onRefreshCustomers();
  };

  // Adjust Customer Loyalty Points
  const handleAdjustLoyaltyPoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;

    const currentPoints = activeCustomer.loyaltyPoints ?? 0;
    const currentLifetime = activeCustomer.lifetimePoints ?? currentPoints;

    const newPoints = Math.max(0, currentPoints + pointsAdjustmentDelta);
    const newLifetime = pointsAdjustmentDelta > 0 ? currentLifetime + pointsAdjustmentDelta : currentLifetime;
    const newTier = getCustomerLoyaltyTier(newLifetime);

    const updatedCustomer: Customer = {
      ...activeCustomer,
      loyaltyPoints: newPoints,
      lifetimePoints: newLifetime,
      loyaltyTier: newTier,
      updatedAt: new Date().toISOString(),
    };

    OfflineDB.saveCustomer(updatedCustomer, currentUser.email);
    setIsPointsModalOpen(false);
    onRefreshCustomers();
  };

  // Delete Single Customer
  const confirmDeleteCustomer = () => {
    if (!customerToDelete) return;
    OfflineDB.deleteCustomer(customerToDelete.id, currentUser.email);
    setCustomerToDelete(null);
    if (selectedCustomerId === customerToDelete.id) {
      setSelectedCustomerId(null);
    }
    setSelectedCustomerIds((prev) => prev.filter((id) => id !== customerToDelete.id));
    onRefreshCustomers();
  };

  // Batch Delete Customers
  const confirmBatchDeleteCustomers = () => {
    if (selectedCustomerIds.length === 0) return;
    OfflineDB.batchDeleteCustomers(selectedCustomerIds, currentUser.email);
    if (selectedCustomerId && selectedCustomerIds.includes(selectedCustomerId)) {
      setSelectedCustomerId(null);
    }
    setSelectedCustomerIds([]);
    setIsBatchCustomerDeleteOpen(false);
    onRefreshCustomers();
  };

  // Delete Single Ledger Entry
  const confirmDeleteLedgerEntry = () => {
    if (!ledgerEntryToDelete) return;
    OfflineDB.deleteCustomerLedgerEntry(ledgerEntryToDelete.id, currentUser.email);
    setLedgerEntryToDelete(null);
    setSelectedLedgerIds((prev) => prev.filter((id) => id !== ledgerEntryToDelete.id));
    onRefreshCustomers();
  };

  // Batch Delete Ledger Entries
  const confirmBatchDeleteLedger = () => {
    if (selectedLedgerIds.length === 0) return;
    OfflineDB.batchDeleteCustomerLedgerEntries(selectedLedgerIds, currentUser.email);
    setSelectedLedgerIds([]);
    setIsBatchLedgerDeleteOpen(false);
    onRefreshCustomers();
  };

  // Toggle selection for single customer
  const handleToggleSelectCustomer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all customers
  const handleToggleSelectAllCustomers = () => {
    if (selectedCustomerIds.length === filteredCustomers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filteredCustomers.map((c) => c.id));
    }
  };

  // Toggle selection for single ledger entry
  const handleToggleSelectLedger = (id: string) => {
    setSelectedLedgerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all ledger entries
  const handleToggleSelectAllLedger = () => {
    if (selectedLedgerIds.length === activeLedger.length) {
      setSelectedLedgerIds([]);
    } else {
      setSelectedLedgerIds(activeLedger.map((l) => l.id));
    }
  };

  // Record Wasooli / Payment Received
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || paymentAmount <= 0) return;

    OfflineDB.addCustomerTransaction({
      customerId: activeCustomer.id,
      type: 'payment_received',
      amount: paymentAmount,
      paymentMethod,
      notes: paymentNotes || `Wasooli via ${paymentMethod.toUpperCase()}`,
      recordedBy: currentUser.email,
    });

    setIsPaymentModalOpen(false);
    setPaymentAmount(0);
    setPaymentNotes('');
    onRefreshCustomers();
  };

  // Statement Print
  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-900">
      {/* ================= LEFT PANEL: CUSTOMER DIRECTORY & KHATA LIST ================= */}
      <div className="w-full lg:w-96 flex flex-col border-r border-slate-800 bg-slate-950/60 overflow-hidden shrink-0">
        {/* Header & Controls */}
        <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Customer Khata & Loyalty</h3>
            </div>
            <button
              onClick={openNewCustomerModal}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition shadow-sm"
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

          {/* Search & Bulk Selection Controls */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contact by name or phone (e.g. 0300...)"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Count Indicator */}
            {searchQuery && (
              <div className="flex items-center justify-between px-1 text-[11px] text-amber-400/90 font-medium">
                <span>Matching {filteredCustomers.length} of {customers.length} contacts</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-amber-300 underline cursor-pointer text-[10px]"
                >
                  Reset
                </button>
              </div>
            )}

            {/* Select All Checkbox Header */}
            {filteredCustomers.length > 0 && (
              <div className="flex items-center justify-between px-1 text-xs text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={
                      filteredCustomers.length > 0 &&
                      filteredCustomers.every((c) => selectedCustomerIds.includes(c.id))
                    }
                    onChange={handleToggleSelectAllCustomers}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 bg-slate-800 cursor-pointer"
                  />
                  <span>Select All ({filteredCustomers.length})</span>
                </label>

                {selectedCustomerIds.length > 0 && (
                  <button
                    onClick={() => setSelectedCustomerIds([])}
                    className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    Clear ({selectedCustomerIds.length})
                  </button>
                )}
              </div>
            )}

            {/* Batch Delete & Export Customers Action Bar */}
            {selectedCustomerIds.length > 0 && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-amber-300 font-bold">
                  {selectedCustomerIds.length} selected
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleExportSelectedCustomers}
                    className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold flex items-center gap-1 shadow-sm transition text-[11px] cursor-pointer"
                    title="Export selected customers to CSV"
                  >
                    <Download className="w-3 h-3" />
                    Export
                  </button>
                  <button
                    onClick={() => setIsBatchCustomerDeleteOpen(true)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-sm transition text-[11px] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {paginatedCustomers.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-xs">
              No customers found.
            </div>
          ) : (
            paginatedCustomers.map((cust) => {
              const isActive = activeCustomer?.id === cust.id;
              const isChecked = selectedCustomerIds.includes(cust.id);
              const hasDebt = cust.currentBalance > 0;
              const isOverLimit = cust.currentBalance > cust.creditLimit;
              const tier = cust.loyaltyTier || getCustomerLoyaltyTier(cust.lifetimePoints || cust.loyaltyPoints || 0);
              const tierConfig = LOYALTY_TIERS[tier] || LOYALTY_TIERS.Bronze;
              const points = cust.loyaltyPoints ?? 0;

              return (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomerId(cust.id)}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-2.5 cursor-pointer ${
                    isChecked
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : isActive
                      ? 'bg-slate-800 border-amber-400/60 shadow-md'
                      : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
                  }`}
                >
                  {/* Select Checkbox */}
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleToggleSelectCustomer(cust.id, e as unknown as React.MouseEvent)}
                      aria-label={`Select ${cust.name}`}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 bg-slate-800 cursor-pointer"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-white leading-tight truncate">{cust.name}</h4>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold border ${tierConfig.badgeColor}`}>
                            {tier}
                          </span>
                        </div>
                        {cust.shopName && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <Building className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{cust.shopName}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span>{cust.phone}</span>
                          <span>•</span>
                          <span className="text-amber-400 font-semibold">{points} pts</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
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
                        <span className="text-[10px] text-slate-500 block">
                          Limit: Rs {cust.creditLimit.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions for this customer */}
                    <div className="flex items-center justify-end gap-1.5 mt-2 pt-1 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCustomer(cust);
                          setIsCustomerModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                        title="Edit Customer Details"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomerToDelete(cust);
                        }}
                        className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                        title="Delete Customer Account"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Customer Directory Pagination Controls */}
        {filteredCustomers.length > customerPageSize && (
          <div className="p-2 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {customerPage} of {totalCustomerPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={customerPage <= 1}
                onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={customerPage >= totalCustomerPages}
                onClick={() => setCustomerPage((p) => Math.min(totalCustomerPages, p + 1))}
                className="p-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200"
                aria-label="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= RIGHT PANEL: ACTIVE CUSTOMER KHATA & LOYALTY ================= */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
        {activeCustomer && activeCustomerLoyalty ? (
          <>
            {/* Customer Summary Topbar */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-white">{activeCustomer.name}</h3>
                  {activeCustomer.shopName && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
                      {activeCustomer.shopName}
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${activeCustomerLoyalty.tierConfig.badgeColor}`}>
                    👑 {activeCustomerLoyalty.tier} Member
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Phone: {activeCustomer.phone}</span>
                  {activeCustomer.address && <span>• Address: {activeCustomer.address}</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPointsModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition"
                  title="Adjust or award loyalty bonus points"
                >
                  <Coins className="w-3.5 h-3.5" />
                  Adjust Points
                </button>

                <button
                  onClick={handlePrintStatement}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Statement
                </button>

                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Receive Wasooli
                </button>
              </div>
            </div>

            {/* Financial & Loyalty Status Cards */}
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
              {/* Debt Due Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold">Outstanding Debt Due</span>
                  <div
                    className={`text-xl font-black mt-1 ${
                      activeCustomer.currentBalance > activeCustomer.creditLimit
                        ? 'text-red-400'
                        : activeCustomer.currentBalance > 0
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    Rs {activeCustomer.currentBalance.toLocaleString()}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Payable by customer</p>
              </div>

              {/* Credit Limit Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold">Credit Limit</span>
                  <div className="text-xl font-black text-slate-200 mt-1">
                    Rs {activeCustomer.creditLimit.toLocaleString()}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Max authorized balance</p>
              </div>

              {/* Loyalty Points Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-950/30 to-slate-950/90 border border-amber-500/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                    <span>Available Points</span>
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-black text-amber-300 mt-1">
                    {activeCustomerLoyalty.currentPoints.toLocaleString()} <span className="text-xs font-normal text-amber-400">pts</span>
                  </div>
                </div>
                <p className="text-[11px] text-amber-200/80 mt-1 font-semibold">
                  Worth Rs {activeCustomerLoyalty.pointRedemptionValue.toLocaleString()} Discount
                </p>
              </div>

              {/* Loyalty Tier Progress Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span>Tier: <strong className="text-white">{activeCustomerLoyalty.tier}</strong></span>
                    <span className="text-[11px] text-amber-400 font-mono">{activeCustomerLoyalty.tierConfig.pointsMultiplier}x Mult</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2 border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                      style={{ width: `${activeCustomerLoyalty.progressPercent}%` }}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 truncate">
                  {activeCustomerLoyalty.nextTierName
                    ? `${activeCustomerLoyalty.pointsToNext.toLocaleString()} pts to ${activeCustomerLoyalty.nextTierName}`
                    : 'Highest Tier Achieved! 🏆'}
                </p>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-5">
              <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="p-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                      <History className="w-4 h-4 text-amber-400" />
                      Transaction Khata History (Debit & Credit)
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      ({activeLedger.length} entries)
                    </span>
                  </div>

                  {selectedLedgerIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-300 font-bold">
                        {selectedLedgerIds.length} selected
                      </span>
                      <button
                        onClick={handleExportSelectedLedger}
                        className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-lg flex items-center gap-1 shadow cursor-pointer transition"
                        title="Export selected ledger entries to CSV"
                      >
                        <Download className="w-3 h-3" />
                        Export ({selectedLedgerIds.length})
                      </button>
                      <button
                        onClick={() => setSelectedLedgerIds([])}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setIsBatchLedgerDeleteOpen(true)}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              paginatedLedger.length > 0 &&
                              paginatedLedger.every((l) => selectedLedgerIds.includes(l.id))
                            }
                            onChange={handleToggleSelectAllLedger}
                            aria-label="Select Ledger Entries on Page"
                            className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 bg-slate-800 cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Date & Time</th>
                        <th className="p-3">Reference / Description</th>
                        <th className="p-3 text-center">Type</th>
                        <th className="p-3 text-right">Debit (+) (Rs)</th>
                        <th className="p-3 text-right">Credit (-) (Rs)</th>
                        <th className="p-3 text-right">Khata Balance (Rs)</th>
                        <th className="p-3 text-right w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {paginatedLedger.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-500">
                            No ledger transactions recorded yet for this customer.
                          </td>
                        </tr>
                      ) : (
                        paginatedLedger.map((entry) => {
                          const isChecked = selectedLedgerIds.includes(entry.id);
                          return (
                            <tr
                              key={entry.id}
                              className={`transition ${
                                isChecked ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-slate-900/50'
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleSelectLedger(entry.id)}
                                  aria-label={`Select entry ${entry.id}`}
                                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 bg-slate-800 cursor-pointer"
                                />
                              </td>
                              <td className="p-3 text-slate-300 whitespace-nowrap">{entry.date}</td>
                              <td className="p-3 text-white font-medium">
                                <div>
                                  {entry.notes ||
                                    (entry.type === 'credit_sale'
                                      ? 'Credit Sale'
                                      : entry.type === 'payment_received'
                                      ? 'Payment Received'
                                      : entry.type === 'return_credit'
                                      ? 'Return Adjustment'
                                      : 'Opening Balance')}
                                </div>
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
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => setLedgerEntryToDelete(entry)}
                                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                                  title="Delete Ledger Entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Ledger Pagination Controls */}
                <PaginationControls
                  currentPage={ledgerPage}
                  totalItems={activeLedger.length}
                  pageSize={ledgerPageSize}
                  onPageChange={setLedgerPage}
                  onPageSizeChange={(newSize) => {
                    setLedgerPageSize(newSize);
                    setLedgerPage(1);
                  }}
                  pageSizeOptions={[10, 20, 50, 100]}
                  itemName="transactions"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center p-8 text-center text-slate-500">
            <p>Select or create a customer account to view their Khata ledger & loyalty status.</p>
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
                Receive Payment (وصولی درج کریں)
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 pt-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Customer:</span>
                <div className="text-sm font-bold text-white">{activeCustomer.name}</div>
                <div className="text-amber-400 font-semibold mt-1">
                  Current Debt Due: Rs {activeCustomer.currentBalance.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Amount Received (Rs) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 25000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-base font-bold text-emerald-400 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'bank', 'cheque'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-2 rounded-lg font-bold uppercase transition ${
                        paymentMethod === method
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Notes / Slip Reference</label>
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

      {/* ================= ADJUST LOYALTY POINTS MODAL ================= */}
      {isPointsModalOpen && activeCustomer && activeCustomerLoyalty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                Adjust Loyalty Points
              </h3>
              <button onClick={() => setIsPointsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustLoyaltyPoints} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-200 font-bold">{activeCustomer.name}</div>
                <div className="flex justify-between text-slate-400">
                  <span>Current Balance:</span>
                  <span className="text-amber-400 font-bold">{activeCustomerLoyalty.currentPoints} pts</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Current Tier:</span>
                  <span className="text-white font-bold">{activeCustomerLoyalty.tier}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Points to Add / Deduct (Use negative for deduction)
                </label>
                <input
                  type="number"
                  required
                  value={pointsAdjustmentDelta}
                  onChange={(e) => setPointsAdjustmentDelta(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-base font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                />
                <div className="flex gap-2 mt-2">
                  {[25, 50, 100, 250, 500].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPointsAdjustmentDelta(num)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={pointsAdjustmentReason}
                  onChange={(e) => setPointsAdjustmentReason(e.target.value)}
                  placeholder="e.g. Birthday reward, Eid promo, manual adjustment"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex justify-between text-xs">
                <span className="text-slate-400">Resulting Points Balance:</span>
                <span className="font-bold text-emerald-400">
                  {Math.max(0, activeCustomerLoyalty.currentPoints + pointsAdjustmentDelta)} pts
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPointsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow"
                >
                  Save Points
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
              <h3 className="text-base font-bold text-white">Create / Edit Customer Profile</h3>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Loyalty Points</label>
                  <input
                    type="number"
                    value={editingCustomer.loyaltyPoints ?? 0}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, loyaltyPoints: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Loyalty Tier</label>
                  <select
                    value={editingCustomer.loyaltyTier || 'Bronze'}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, loyaltyTier: e.target.value as LoyaltyTier })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Bronze">Bronze (0+ pts)</option>
                    <option value="Silver">Silver (500+ pts)</option>
                    <option value="Gold">Gold (1,500+ pts)</option>
                    <option value="Platinum">Platinum (3,000+ pts)</option>
                  </select>
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

      {/* ================= DELETE SINGLE CUSTOMER MODAL ================= */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Customer Account</h3>
                <p className="text-xs text-slate-400">Permanently delete customer and Khata profile</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-200 font-bold">{customerToDelete.name}</div>
              {customerToDelete.shopName && (
                <div className="text-slate-400">{customerToDelete.shopName}</div>
              )}
              <div className="text-slate-400">Phone: {customerToDelete.phone}</div>
              <div className="text-amber-400 font-bold">
                Outstanding Balance: Rs {customerToDelete.currentBalance.toLocaleString()}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCustomer}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BATCH DELETE CUSTOMERS MODAL ================= */}
      {isBatchCustomerDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Batch Delete Customers</h3>
                <p className="text-xs text-slate-400">
                  You are about to delete {selectedCustomerIds.length} customer accounts and their associated Khata ledgers.
                </p>
              </div>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Warning: Irreversible action
              </div>
              <p>
                All balances and ledger records for these {selectedCustomerIds.length} customers will be permanently wiped.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBatchCustomerDeleteOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmBatchDeleteCustomers}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20"
              >
                Delete {selectedCustomerIds.length} Customers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE SINGLE LEDGER ENTRY MODAL ================= */}
      {ledgerEntryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Ledger Entry</h3>
                <p className="text-xs text-slate-400">Remove entry from customer's Khata history</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-300">
                <span className="text-slate-500">Date:</span> {ledgerEntryToDelete.date}
              </div>
              <div className="text-slate-300">
                <span className="text-slate-500">Note:</span> {ledgerEntryToDelete.notes || 'N/A'}
              </div>
              <div className="text-amber-400 font-bold">
                Amount: Rs {(ledgerEntryToDelete.debit || ledgerEntryToDelete.credit || 0).toLocaleString()}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setLedgerEntryToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteLedgerEntry}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BATCH DELETE LEDGER ENTRIES MODAL ================= */}
      {isBatchLedgerDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Batch Delete Ledger Entries</h3>
                <p className="text-xs text-slate-400">
                  Permanently remove {selectedLedgerIds.length} selected entries from this Khata ledger.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBatchLedgerDeleteOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmBatchDeleteLedger}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20"
              >
                Delete {selectedLedgerIds.length} Entries
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CustomerKhataModule = React.memo(CustomerKhataModuleComponent);
