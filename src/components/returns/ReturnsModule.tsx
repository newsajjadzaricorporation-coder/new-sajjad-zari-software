import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Search,
  CheckCircle,
  AlertTriangle,
  Printer,
  FileText,
  DollarSign,
  Package,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { SaleInvoice, ReturnRecord, UserProfile, ShopSettings } from '../../types';
import { OfflineDB } from '../../services/db';
import { PaginationControls } from '../common/PaginationControls';

interface ReturnsModuleProps {
  sales: SaleInvoice[];
  currentUser: UserProfile;
  settings: ShopSettings;
  onRefreshSales: () => void;
}

const ReturnsModuleComponent: React.FC<ReturnsModuleProps> = ({
  sales,
  currentUser,
  settings,
  onRefreshSales,
}) => {
  const [searchInvoiceNo, setSearchInvoiceNo] = useState('');
  const [matchedSale, setMatchedSale] = useState<SaleInvoice | null>(null);

  // Return item selection state
  const [returnQtys, setReturnQtys] = useState<{ [productId: string]: number }>({});
  const [restockDisposition, setRestockDisposition] = useState<'restock' | 'damaged'>('restock');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'khata_credit'>('cash');
  const [returnReason, setReturnReason] = useState('Customer exchange / excess quantity');
  const [recentReturns, setRecentReturns] = useState<ReturnRecord[]>(OfflineDB.getReturns());
  const [returnToDelete, setReturnToDelete] = useState<ReturnRecord | null>(null);

  // Pagination for returns history
  const [returnsPage, setReturnsPage] = useState(1);
  const [returnsPageSize, setReturnsPageSize] = useState(10);

  const paginatedReturns = useMemo(() => {
    const start = (returnsPage - 1) * returnsPageSize;
    return recentReturns.slice(start, start + returnsPageSize);
  }, [recentReturns, returnsPage, returnsPageSize]);

  // Search invoice
  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInvoiceNo.trim().toUpperCase();
    const found = sales.find((s) => s.invoiceNo.toUpperCase() === q || s.id === q);
    if (found) {
      setMatchedSale(found);
      const initialQtys: { [id: string]: number } = {};
      found.items.forEach((item) => {
        initialQtys[item.product.id] = 0;
      });
      setReturnQtys(initialQtys);
    } else {
      alert(`Invoice #${searchInvoiceNo} not found. Verify the invoice number or scan receipt.`);
    }
  };

  const handleQtyChange = (productId: string, qty: number, maxQty: number) => {
    const validQty = Math.max(0, Math.min(maxQty, qty));
    setReturnQtys((prev) => ({ ...prev, [productId]: validQty }));
  };

  // Calculate return total
  const calculatedRefundTotal = useMemo(() => {
    if (!matchedSale) return 0;
    return matchedSale.items.reduce((acc, item) => {
      const q = returnQtys[item.product.id] || 0;
      return acc + q * item.unitPrice;
    }, 0);
  }, [matchedSale, returnQtys]);

  // Execute Return
  const handleProcessReturn = () => {
    if (!matchedSale || calculatedRefundTotal <= 0) return;

    const itemsToReturn = matchedSale.items
      .filter((item) => (returnQtys[item.product.id] || 0) > 0)
      .map((item) => ({
        product: item.product,
        returnedQuantity: returnQtys[item.product.id],
        unitRefundPrice: item.unitPrice,
        subtotal: returnQtys[item.product.id] * item.unitPrice,
      }));

    const returnRecord: ReturnRecord = {
      id: `ret-${Date.now()}`,
      invoiceNo: `RET-${Date.now().toString().slice(-6)}`,
      originalInvoiceNo: matchedSale.invoiceNo,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      customerId: matchedSale.customerId,
      customerName: matchedSale.customerName,
      items: itemsToReturn,
      refundAmount: calculatedRefundTotal,
      restockedToInventory: restockDisposition === 'restock',
      refundMethod,
      reason: returnReason,
      cashierEmail: currentUser.email,
    };

    OfflineDB.processSaleReturn(returnRecord, currentUser.email);
    setRecentReturns(OfflineDB.getReturns());
    setMatchedSale(null);
    setSearchInvoiceNo('');
    onRefreshSales();
    alert(`Return processed successfully! Credit Note: #${returnRecord.invoiceNo}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-900">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <RotateCcw className="w-6 h-6 text-amber-400" />
          Sales Returns & Credit Notes Engine
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Process customer item returns, barcode invoice verification, stock restoration, and refund khata credits
        </p>
      </div>

      {/* Invoice Lookup Form */}
      <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Lookup Original Invoice
        </h3>

        <form onSubmit={handleLookup} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={searchInvoiceNo}
              onChange={(e) => setSearchInvoiceNo(e.target.value)}
              placeholder="Enter or scan invoice # (e.g. INV-202609-1001)..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition"
          >
            Find Invoice
          </button>
        </form>
      </div>

      {/* Matched Invoice Return Interface */}
      {matchedSale && (
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
            <div>
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Invoice #{matchedSale.invoiceNo}
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                Customer: {matchedSale.customerName}
              </h3>
              <p className="text-xs text-slate-400">Date: {matchedSale.date}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Original Total:</span>
              <div className="text-lg font-black text-white">
                Rs {matchedSale.netTotal.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Select Items to Return */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase">
              Select Quantity to Return:
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-center">Sold Qty</th>
                    <th className="p-3 text-right">Unit Rate (Rs)</th>
                    <th className="p-3 text-center">Return Qty</th>
                    <th className="p-3 text-right">Refund Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {matchedSale.items.map((item) => {
                    const currentRet = returnQtys[item.product.id] || 0;
                    return (
                      <tr key={item.product.id} className="hover:bg-slate-900/40">
                        <td className="p-3 font-semibold text-white">
                          {item.product.name}
                          <div className="text-[11px] text-slate-500 font-normal">
                            SKU: {item.product.sku}
                          </div>
                        </td>
                        <td className="p-3 text-center text-slate-300">
                          {item.quantity} {item.product.unit}
                        </td>
                        <td className="p-3 text-right text-slate-400">
                          Rs {item.unitPrice.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={currentRet}
                            onChange={(e) =>
                              handleQtyChange(
                                item.product.id,
                                parseFloat(e.target.value) || 0,
                                item.quantity
                              )
                            }
                            className="w-16 bg-slate-900 border border-slate-700 rounded p-1 text-center font-bold text-white focus:outline-none focus:border-amber-400"
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-amber-400">
                          Rs {(currentRet * item.unitPrice).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Restock & Refund Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Restock Disposition:
              </label>
              <select
                aria-label="Restock Disposition"
                value={restockDisposition}
                onChange={(e) => setRestockDisposition(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="restock">Restock to Inventory (Restore Stock)</option>
                <option value="damaged">Damaged / Defective (Do not restore)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Refund Method:
              </label>
              <select
                aria-label="Refund Method"
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="cash">Cash Refund (Pay from Drawer)</option>
                <option value="khata_credit">Credit to Customer Khata Balance</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Reason for Return:</label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Reason for return..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
          </div>

          {/* Refund Submission Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div>
              <span className="text-xs text-slate-400">Net Refund Payable:</span>
              <div className="text-2xl font-black text-amber-400">
                Rs {calculatedRefundTotal.toLocaleString()}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMatchedSale(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={calculatedRefundTotal <= 0}
                onClick={handleProcessReturn}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20"
              >
                Confirm Return & Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historic Return Records Table */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Recent Returns & Credit Notes
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                <th className="p-3">Credit Note #</th>
                <th className="p-3">Original Invoice</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Items Returned</th>
                <th className="p-3 text-right">Refund Amount (Rs)</th>
                <th className="p-3 text-right w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {paginatedReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No return credit notes processed yet.
                  </td>
                </tr>
              ) : (
                paginatedReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-mono font-bold text-amber-400">{ret.invoiceNo}</td>
                    <td className="p-3 font-mono text-slate-400">{ret.originalInvoiceNo}</td>
                    <td className="p-3 text-white font-medium">{ret.customerName}</td>
                    <td className="p-3 text-slate-400">{ret.date}</td>
                    <td className="p-3 text-slate-300">
                      {ret.items.map((i) => `${i.product.name} (${i.returnedQuantity})`).join(', ')}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-400">
                      Rs {ret.refundAmount.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setReturnToDelete(ret)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition cursor-pointer"
                        title="Delete Return Record"
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

        {recentReturns.length > 5 && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/40">
            <PaginationControls
              currentPage={returnsPage}
              totalItems={recentReturns.length}
              pageSize={returnsPageSize}
              onPageChange={setReturnsPage}
              onPageSizeChange={setReturnsPageSize}
              pageSizeOptions={[5, 10, 25, 50]}
            />
          </div>
        )}
      </div>

      {/* Delete Return Confirmation Modal */}
      {returnToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Return Credit Note</h3>
                <p className="text-xs text-slate-400">Permanently remove this return credit note</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="text-slate-200 font-bold">
                Credit Note: #{returnToDelete.invoiceNo || returnToDelete.returnNo}
              </div>
              <div className="text-slate-400">Original Invoice: #{returnToDelete.originalInvoiceNo}</div>
              <div className="text-slate-400">Customer: {returnToDelete.customerName} | Date: {returnToDelete.date}</div>
              <div className="text-emerald-400 font-bold font-mono text-sm pt-1">
                Refund Amount: Rs {returnToDelete.refundAmount.toLocaleString()}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReturnToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  OfflineDB.deleteReturn(returnToDelete.id, currentUser.email);
                  setRecentReturns((prev) => prev.filter((r) => r.id !== returnToDelete.id));
                  setReturnToDelete(null);
                  onRefreshSales();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Confirm Delete Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ReturnsModule = React.memo(ReturnsModuleComponent);
