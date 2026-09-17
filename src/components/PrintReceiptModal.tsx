import React, { useState } from 'react';
import { Printer, X, Bluetooth, FileText, Check, Download } from 'lucide-react';
import { SaleInvoice, ShopSettings } from '../types';
import { generateBarcodeSvg } from '../utils/barcode';
import { ESCPOSPrinter } from '../utils/escpos';

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleInvoice | null;
  settings: ShopSettings;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  settings,
}) => {
  const [printLayout, setPrintLayout] = useState<'thermal80' | 'thermal58' | 'a4'>('thermal80');
  const [bluetoothStatus, setBluetoothStatus] = useState<string | null>(null);

  if (!isOpen || !sale) return null;

  const barcodeSvg = generateBarcodeSvg(sale.invoiceNo, 40, true);

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleBluetoothPrint = async () => {
    setBluetoothStatus('Connecting to thermal printer...');
    const result = await ESCPOSPrinter.connectBluetooth();
    if (result.success) {
      setBluetoothStatus(`Connected: ${result.deviceName}. Ready!`);
      setTimeout(() => setBluetoothStatus(null), 4000);
    } else {
      setBluetoothStatus(`BT Error: ${result.error}`);
      setTimeout(() => setBluetoothStatus(null), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Receipt & Invoice Print</h3>
              <p className="text-xs text-slate-400">Invoice: #{sale.invoiceNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Toggle Buttons */}
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setPrintLayout('thermal80')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                  printLayout === 'thermal80' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout('thermal58')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                  printLayout === 'thermal58' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                58mm Mini
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout('a4')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                  printLayout === 'a4' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                A4 Laser
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40 flex justify-center items-start">
          {/* Print Container with ID for CSS isolation */}
          <div
            id="printable-receipt"
            className={`bg-white text-black transition-all shadow-xl rounded-sm ${
              printLayout === 'thermal58'
                ? 'w-[280px] p-3 text-xs'
                : printLayout === 'thermal80'
                ? 'w-[360px] p-5 text-sm'
                : 'w-full max-w-[720px] p-8 text-sm'
            }`}
          >
            {printLayout === 'a4' ? (
              /* ================== A4 WHOLESALE LASER LAYOUT ================== */
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950">{settings.shopName}</h1>
                    <p className="text-xl font-bold font-urdu text-amber-700 mt-1">{settings.urduTitle}</p>
                    <p className="text-xs text-slate-600 mt-1">{settings.tagline}</p>
                    <p className="text-xs text-slate-600">{settings.address}</p>
                    <p className="text-xs font-semibold text-slate-800 mt-1">Tel: {settings.phone}</p>
                    {settings.thermalHeaderNote && (
                      <p className="text-[11px] text-slate-500">{settings.thermalHeaderNote}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded">
                      Wholesale Tax Invoice
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-2">Invoice: #{sale.invoiceNo}</p>
                    <p className="text-xs text-slate-600">Date: {sale.date}</p>
                    <p className="text-xs text-slate-600">Cashier: {sale.cashierName}</p>
                  </div>
                </div>

                {/* Billed To */}
                <div className="bg-slate-50 p-3 rounded border border-slate-200 flex justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Customer Details:</p>
                    <p className="text-base font-bold text-slate-900">{sale.customerName}</p>
                    {sale.customerPhone && <p className="text-xs text-slate-600">Contact: {sale.customerPhone}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase text-slate-500">Payment Status:</p>
                    <p className="text-sm font-bold uppercase text-slate-900">
                      {sale.paymentMethod === 'credit' ? 'Udhaar / Credit Khata' : sale.paymentMethod}
                    </p>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 text-xs">
                      <th className="p-2 border-r border-slate-300">#</th>
                      <th className="p-2 border-r border-slate-300">Item Description</th>
                      <th className="p-2 border-r border-slate-300">SKU / Code</th>
                      <th className="p-2 border-r border-slate-300 text-center">Qty / Unit</th>
                      <th className="p-2 border-r border-slate-300 text-right">Rate (Rs)</th>
                      <th className="p-2 text-right">Total (Rs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-200 text-xs">
                        <td className="p-2 border-r border-slate-200">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 font-semibold text-slate-900">
                          {item.product.name}
                          {item.product.urduName && (
                            <span className="font-urdu text-xs text-slate-600 ml-2">({item.product.urduName})</span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-600">{item.product.sku}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-medium">
                          {item.quantity} {item.product.unit}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right">Rs {item.unitPrice.toLocaleString()}</td>
                        <td className="p-2 text-right font-bold text-slate-900">Rs {item.subtotal.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary Box */}
                <div className="flex justify-between items-start pt-2">
                  <div className="max-w-xs space-y-2">
                    <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
                    <p className="text-xs text-slate-500 italic mt-2">
                      Terms: {settings.thermalFooterUrdu}
                    </p>
                  </div>
                  <div className="w-64 space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-slate-900">Rs {sale.subtotal.toLocaleString()}</span>
                    </div>
                    {sale.discountAmount > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-200 text-emerald-700">
                        <span>Discount ({sale.discountType === 'percentage' ? `${sale.discountValue}%` : 'Flat'}):</span>
                        <span className="font-semibold">-Rs {sale.discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 text-base font-bold text-slate-950 border-b-2 border-slate-900">
                      <span>Net Total Payable:</span>
                      <span>Rs {sale.netTotal.toLocaleString()}</span>
                    </div>
                    {sale.paymentMethod === 'credit' && sale.previousBalance !== undefined && (
                      <div className="pt-2 text-[11px] text-slate-600">
                        <div className="flex justify-between">
                          <span>Previous Khata Debt:</span>
                          <span>Rs {sale.previousBalance.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-red-600">
                          <span>Total Outstanding Balance:</span>
                          <span>Rs {(sale.newBalance || sale.previousBalance + sale.netTotal).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between pt-12 text-xs text-slate-600">
                  <div className="border-t border-slate-400 w-48 text-center pt-1">
                    Customer Signature
                  </div>
                  <div className="border-t border-slate-400 w-48 text-center pt-1">
                    Authorized Store Stamp
                  </div>
                </div>
              </div>
            ) : (
              /* ================== THERMAL 58mm / 80mm ESC/POS RECEIPT ================== */
              <div className="font-mono-receipt leading-tight text-slate-900">
                {/* Thermal Header */}
                <div className="text-center pb-2 border-b border-dashed border-slate-400">
                  <h2 className="font-bold text-base uppercase tracking-tight text-slate-950">
                    {settings.shopName}
                  </h2>
                  <p className="font-urdu text-sm font-bold mt-0.5 text-slate-900">
                    {settings.urduTitle}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">{settings.address}</p>
                  <p className="text-[11px] font-semibold text-slate-800">Phone: {settings.phone}</p>
                  {settings.thermalHeaderNote && (
                    <p className="text-[10px] text-slate-500 mt-0.5">{settings.thermalHeaderNote}</p>
                  )}
                </div>

                {/* Metadata */}
                <div className="py-2 text-[11px] border-b border-dashed border-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>INV: #{sale.invoiceNo}</span>
                    <span>{sale.date.split(',')[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier: {sale.cashierName.split(' ')[0]}</span>
                    <span>Pay: {sale.paymentMethod.toUpperCase()}</span>
                  </div>
                  <div className="font-bold">Customer: {sale.customerName}</div>
                </div>

                {/* Items Table */}
                <div className="py-2 border-b border-dashed border-slate-400">
                  <div className="flex justify-between text-[10px] font-bold border-b border-slate-300 pb-1 mb-1 uppercase">
                    <span>Item / Qty x Rate</span>
                    <span>Total (Rs)</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {sale.items.map((item, idx) => (
                      <div key={idx}>
                        <div className="font-semibold leading-none">{item.product.name}</div>
                        <div className="flex justify-between text-[11px] text-slate-700 mt-0.5">
                          <span>
                            {item.quantity} {item.product.unit} @ {item.unitPrice}
                          </span>
                          <span className="font-bold text-slate-950">Rs {item.subtotal}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calculation Summary */}
                <div className="py-2 space-y-1 text-xs border-b border-dashed border-slate-400">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rs {sale.subtotal}</span>
                  </div>
                  {sale.discountAmount > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>
                        Discount {sale.discountType === 'percentage' ? `(${sale.discountValue}%)` : ''}:
                      </span>
                      <span>-Rs {sale.discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-300">
                    <span>NET PAYABLE:</span>
                    <span>Rs {sale.netTotal}</span>
                  </div>

                  {sale.paymentMethod === 'cash' && (
                    <div className="text-[11px] pt-1 space-y-0.5 text-slate-700">
                      <div className="flex justify-between">
                        <span>Paid Cash:</span>
                        <span>Rs {sale.amountTendered || sale.netTotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Change Returned:</span>
                        <span>Rs {sale.changeGiven || 0}</span>
                      </div>
                    </div>
                  )}

                  {sale.paymentMethod === 'credit' && sale.previousBalance !== undefined && (
                    <div className="text-[11px] pt-1 space-y-0.5 text-slate-700">
                      <div className="flex justify-between">
                        <span>Previous Khata Debt:</span>
                        <span>Rs {sale.previousBalance}</span>
                      </div>
                      <div className="flex justify-between font-bold text-red-700">
                        <span>Total Due Khata:</span>
                        <span>Rs {sale.newBalance || sale.previousBalance + sale.netTotal}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Barcode & Footer */}
                <div className="pt-3 text-center space-y-2">
                  <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
                  <p className="text-[10px] text-slate-600">Thank you for your business!</p>
                  <p className="font-urdu text-xs font-bold text-slate-800">
                    {settings.thermalFooterUrdu}
                  </p>
                  <p className="text-[9px] text-slate-400">
                    Software: New Sajjad Zari POS System
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/80 shrink-0">
          <div>
            {bluetoothStatus && (
              <span className="text-xs text-amber-400 font-medium animate-pulse">
                {bluetoothStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBluetoothPrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition"
              title="Print directly to paired Bluetooth 58mm/80mm Thermal Printer"
            >
              <Bluetooth className="w-4 h-4 text-blue-400" />
              Bluetooth Print
            </button>

            <button
              type="button"
              onClick={handleBrowserPrint}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-sm font-bold shadow-lg shadow-amber-500/20 transition"
            >
              <Printer className="w-4 h-4" />
              Print Receipt (ESC/POS)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
