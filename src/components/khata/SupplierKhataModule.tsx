import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Building,
  Phone,
  ArrowUpRight,
  PackagePlus,
  Trash2,
  CheckCircle,
  X,
  FileText,
  DollarSign,
} from 'lucide-react';
import { Supplier, Product, PurchaseInvoice, UserProfile } from '../../types';
import { OfflineDB } from '../../services/db';

interface SupplierKhataModuleProps {
  suppliers: Supplier[];
  products: Product[];
  currentUser: UserProfile;
  onRefreshData: () => void;
}

export const SupplierKhataModule: React.FC<SupplierKhataModuleProps> = ({
  suppliers,
  products,
  currentUser,
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

  // New Purchase Inward Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<'cash' | 'credit' | 'bank'>('cash');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<
    { productId: string; quantity: number; unitCost: number }[]
  >([]);

  // Supplier payables total
  const totalPayables = useMemo(() => {
    return suppliers.reduce((acc, s) => acc + s.balancePayable, 0);
  }, [suppliers]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        !q ||
        s.companyName.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.phone.includes(q)
    );
  }, [suppliers, searchQuery]);

  // Add Item to purchase order
  const addPurchaseRow = () => {
    if (products.length === 0) return;
    setPurchaseItems((prev) => [
      ...prev,
      {
        productId: products[0].id,
        quantity: 10,
        unitCost: products[0].costPrice || 100,
      },
    ]);
  };

  const updatePurchaseRow = (index: number, field: string, value: any) => {
    setPurchaseItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'productId') {
        const p = products.find((prod) => prod.id === value);
        if (p) updated[index].unitCost = p.costPrice || 100;
      }
      return updated;
    });
  };

  const removePurchaseRow = (index: number) => {
    setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
  };

  const purchaseGrossTotal = useMemo(() => {
    return purchaseItems.reduce((acc, row) => acc + row.quantity * row.unitCost, 0);
  }, [purchaseItems]);

  // Save new Purchase Inward (Stock Inward)
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || purchaseItems.length === 0) return;

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    if (!supplier) return;

    const itemsMapped = purchaseItems.map((row) => {
      const prod = products.find((p) => p.id === row.productId)!;
      return {
        productId: prod.id,
        productName: prod.name,
        product: prod,
        quantity: Number(row.quantity),
        unitCost: Number(row.unitCost),
        subtotal: Number(row.quantity) * Number(row.unitCost),
      };
    });

    const invoice: PurchaseInvoice = {
      id: `pur-${Date.now()}`,
      invoiceNo: `PUR-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      supplierId: supplier.id,
      supplierName: supplier.companyName,
      items: itemsMapped,
      totalAmount: purchaseGrossTotal,
      paidAmount: purchasePaymentMethod === 'credit' ? 0 : purchaseGrossTotal,
      paymentMethod: purchasePaymentMethod,
      notes: purchaseNotes,
    };

    OfflineDB.savePurchaseInvoice(invoice, currentUser.email);
    setIsPurchaseModalOpen(false);
    setPurchaseItems([]);
    setPurchaseNotes('');
    onRefreshData();
  };

  // Add Supplier Profile
  const openNewSupplier = () => {
    setEditingSupplier({
      id: `sup-${Date.now()}`,
      companyName: '',
      contactPerson: '',
      phone: '',
      category: 'Zari Raw Materials',
      balancePayable: 0,
    });
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.companyName || !editingSupplier.phone) return;

    const fullSup: Supplier = {
      id: editingSupplier.id || `sup-${Date.now()}`,
      companyName: editingSupplier.companyName,
      contactPerson: editingSupplier.contactPerson || '',
      phone: editingSupplier.phone,
      category: editingSupplier.category || 'General',
      balancePayable: Number(editingSupplier.balancePayable) || 0,
      createdAt: new Date().toISOString(),
    };

    OfflineDB.saveSupplier(fullSup);
    setIsSupplierModalOpen(false);
    setEditingSupplier(null);
    onRefreshData();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-900">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-amber-400" />
            Supplier Khata & Stock Inward (Purchases)
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage raw material vendors, purchase orders, and accounts payable
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openNewSupplier}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            New Supplier
          </button>

          <button
            onClick={() => {
              addPurchaseRow();
              setIsPurchaseModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20 transition"
          >
            <PackagePlus className="w-4 h-4" />
            New Purchase (Stock Inward)
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold">Active Vendor Partners</span>
          <div className="text-2xl font-black text-white mt-1">{suppliers.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Manufacturers & Importers</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold">Total Accounts Payable</span>
          <div className="text-2xl font-black text-red-400 mt-1">
            Rs {totalPayables.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Outstanding supplier debts</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold">Stock Inward Status</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">Active</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Auto-updates inventory & costs</p>
        </div>
      </div>

      {/* Supplier Directory Table */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendor company, person, phone..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                <th className="p-3.5">Vendor / Company</th>
                <th className="p-3.5">Contact Person</th>
                <th className="p-3.5">Phone</th>
                <th className="p-3.5">Product Category</th>
                <th className="p-3.5 text-right">Balance Payable (Rs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSuppliers.map((sup) => (
                <tr key={sup.id} className="hover:bg-slate-900/50 transition">
                  <td className="p-3.5 font-bold text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-500" />
                    {sup.companyName}
                  </td>
                  <td className="p-3.5 text-slate-300">{sup.contactPerson}</td>
                  <td className="p-3.5 text-slate-400 font-mono">{sup.phone}</td>
                  <td className="p-3.5 text-slate-400">{sup.category}</td>
                  <td className="p-3.5 text-right font-bold text-amber-400">
                    Rs {sup.balancePayable.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= NEW PURCHASE INWARD MODAL ================= */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 my-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-amber-400" />
                Record Stock Inward (Purchase Order)
              </h3>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Supplier *</label>
                  <select
                    aria-label="Select Supplier"
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName} - Bal: Rs {s.balancePayable}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Payment Method</label>
                  <select
                    aria-label="Select Payment Method"
                    value={purchasePaymentMethod}
                    onChange={(e) => setPurchasePaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="cash">Cash Paid (Deducts from Cash Drawer)</option>
                    <option value="credit">Supplier Credit / Udhaar (Adds to Payable)</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-slate-300">Inward Line Items:</label>
                  <button
                    type="button"
                    onClick={addPurchaseRow}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {purchaseItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <select
                        aria-label={`Product Selection Item ${idx + 1}`}
                        value={item.productId}
                        onChange={(e) => updatePurchaseRow(idx, 'productId', e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updatePurchaseRow(idx, 'quantity', parseFloat(e.target.value) || 1)}
                          placeholder="Qty"
                          className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-center text-white"
                        />
                      </div>

                      <div className="w-28">
                        <input
                          type="number"
                          min="0"
                          value={item.unitCost}
                          onChange={(e) => updatePurchaseRow(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                          placeholder="Cost Price"
                          className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-right text-white"
                        />
                      </div>

                      <div className="w-28 text-right font-bold text-amber-400">
                        Rs {(item.quantity * item.unitCost).toLocaleString()}
                      </div>

                      <button
                        type="button"
                        onClick={() => removePurchaseRow(idx)}
                        className="text-slate-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Notes */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <input
                  type="text"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="Notes, carrier or consignment ref..."
                  className="w-1/2 bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />

                <div className="text-right">
                  <span className="text-slate-400 mr-2">Total Inward Value:</span>
                  <span className="text-lg font-black text-amber-400">
                    Rs {purchaseGrossTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={purchaseItems.length === 0}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl shadow"
                >
                  Receive Inward Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADD SUPPLIER MODAL ================= */}
      {isSupplierModalOpen && editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create Supplier Profile</h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 pt-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Company / Mill Name *</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.companyName || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, companyName: e.target.value })}
                  placeholder="e.g. Lahore Zari & Thread Mills"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editingSupplier.contactPerson || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, contactPerson: e.target.value })}
                  placeholder="e.g. Sheikh Naveed"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.phone || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    placeholder="0321-7654321"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Material Category</label>
                  <input
                    type="text"
                    value={editingSupplier.category || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, category: e.target.value })}
                    placeholder="Zari Raw Materials"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
