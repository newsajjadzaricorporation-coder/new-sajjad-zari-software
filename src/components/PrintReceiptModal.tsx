import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Printer,
  X,
  Bluetooth,
  FileText,
  Check,
  Download,
  Sparkles,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  SunMedium,
  Moon,
  Palette,
  SlidersHorizontal,
  Layers,
  Banknote,
  BookOpen,
  Landmark,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  ListFilter,
  Trash2,
  Clock,
} from 'lucide-react';
import { SaleInvoice, ShopSettings } from '../types';
import { generateBarcodeSvg } from '../utils/barcode';
import { ESCPOSPrinter } from '../utils/escpos';
import { OfflineDB } from '../services/db';
import { ReceiptCanvas } from './ReceiptCanvas';

export interface PrintQueueJob {
  id: string;
  invoiceNo: string;
  customerName: string;
  netTotal: number;
  layout: 'thermal80' | 'thermal58' | 'a4';
  status: 'pending' | 'printing' | 'completed' | 'failed';
  timestamp: string;
}

const renderPaymentMethodIcon = (method: string, sizeClass = 'w-4 h-4') => {
  const m = (method || '').toLowerCase();
  if (m.includes('cash')) {
    return <Banknote className={`${sizeClass} text-emerald-700 inline-block align-text-bottom mr-1`} />;
  }
  if (m.includes('credit') || m.includes('udhaar') || m.includes('khata')) {
    return <BookOpen className={`${sizeClass} text-amber-700 inline-block align-text-bottom mr-1`} />;
  }
  if (m.includes('bank') || m.includes('card') || m.includes('transfer') || m.includes('online')) {
    return <Landmark className={`${sizeClass} text-blue-700 inline-block align-text-bottom mr-1`} />;
  }
  return <CreditCard className={`${sizeClass} text-slate-700 inline-block align-text-bottom mr-1`} />;
};

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
  settings: initialSettings,
}) => {
  const [activeSettings, setActiveSettings] = useState<ShopSettings>(() => {
    return OfflineDB.getSettings() || initialSettings;
  });
  const [printLayout, setPrintLayout] = useState<'thermal80' | 'thermal58' | 'a4'>('a4');
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isBlackAndWhite, setIsBlackAndWhite] = useState(false);
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [zoomScale, setZoomScale] = useState<number>(0.95);
  const [showUrduDetails, setShowUrduDetails] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [bluetoothStatus, setBluetoothStatus] = useState<string | null>(null);
  const [isPrintingAnim, setIsPrintingAnim] = useState(false);
  const [printJobFailed, setPrintJobFailed] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);
  const [printAttemptCount, setPrintAttemptCount] = useState<number>(0);

  // Sync settings when modal opens or initialSettings change
  useEffect(() => {
    if (isOpen) {
      const freshSettings = OfflineDB.getSettings() || initialSettings;
      setActiveSettings(freshSettings);
      setShowLogo(freshSettings.printBusinessLogo ?? true);
    }
  }, [isOpen, initialSettings]);

  // Printer Queue Management State
  const [printQueue, setPrintQueue] = useState<PrintQueueJob[]>(() => {
    return OfflineDB.getPrintQueue() || [];
  });
  const [showQueueDrawer, setShowQueueDrawer] = useState<boolean>(false);

  // Sync current sale into Print Queue
  useEffect(() => {
    if (!sale) return;
    setPrintQueue((prev) => {
      const exists = prev.some((j) => j.invoiceNo === sale.invoiceNo);
      if (!exists) {
        const newJob: PrintQueueJob = {
          id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          invoiceNo: sale.invoiceNo,
          customerName: sale.customerName || 'Walk-in Customer',
          netTotal: sale.netTotal,
          layout: printLayout,
          status: 'pending',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        const updated = [newJob, ...prev];
        OfflineDB.savePrintQueue(updated);
        return updated;
      }
      return prev;
    });
  }, [sale, printLayout]);

  const updateJobStatus = useCallback((invoiceNo: string, status: 'pending' | 'printing' | 'completed' | 'failed') => {
    setPrintQueue((prev) => {
      const updated = prev.map((j) => (j.invoiceNo === invoiceNo ? { ...j, status } : j));
      OfflineDB.savePrintQueue(updated);
      return updated;
    });
  }, []);

  const handleClearQueue = () => {
    setPrintQueue([]);
    OfflineDB.savePrintQueue([]);
  };

  const handleRemoveQueueJob = (jobId: string) => {
    setPrintQueue((prev) => {
      const updated = prev.filter((j) => j.id !== jobId);
      OfflineDB.savePrintQueue(updated);
      return updated;
    });
  };

  // Countdown timer for Quick Retry cooldown
  useEffect(() => {
    if (retryCountdown <= 0) return;
    const interval = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [retryCountdown]);

  // Keyboard shortcut support (Ctrl+P to print, Esc to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleBrowserPrint();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !sale) return null;

  const barcodeSvg = generateBarcodeSvg(sale.invoiceNo, 38, true);

  const handleBrowserPrint = () => {
    setIsPrintingAnim(true);
    setPrintAttemptCount((prev) => prev + 1);
    if (sale) updateJobStatus(sale.invoiceNo, 'printing');

    try {
      setTimeout(() => {
        window.print();
        setIsPrintingAnim(false);
        if (sale) updateJobStatus(sale.invoiceNo, 'completed');
      }, 250);
    } catch (err) {
      console.error('Window print error:', err);
      setPrintJobFailed(true);
      setIsPrintingAnim(false);
      if (sale) updateJobStatus(sale.invoiceNo, 'failed');
    }
  };

  const handleQuickRetry = () => {
    if (retryCountdown > 0) return;
    setPrintJobFailed(false);
    setRetryCountdown(5); // 5-second countdown cooldown
    handleBrowserPrint();
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

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(1.4, Number((prev + 0.1).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(2))));
  };

  const handleResetZoom = () => {
    setZoomScale(printLayout === 'a4' ? 0.95 : 1.0);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[94vh]"
        >
          {/* TOP HEADER & FORMAT SWITCHER */}
          <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <motion.div
                animate={isPrintingAnim ? { rotate: [0, -10, 10, -10, 0] } : {}}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400"
              >
                <Printer className="w-5 h-5" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white leading-tight">
                    Invoice & Print Preview
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-amber-300 border border-slate-700 font-bold">
                    #{sale.invoiceNo}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {sale.customerName} • Rs {sale.netTotal.toLocaleString()} • {sale.paymentMethod.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Print Preview Mode Toggle */}
              <button
                type="button"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border transition cursor-pointer text-xs ${
                  isPreviewMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title="Toggle live print-preview layout mode"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Print Preview: {isPreviewMode ? 'ON' : 'OFF'}</span>
              </button>

              {/* Layout Switcher */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setPrintLayout('a4');
                    setZoomScale(0.95);
                    setIsPreviewMode(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    printLayout === 'a4'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>A4 Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrintLayout('thermal80');
                    setZoomScale(1.0);
                    setIsPreviewMode(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    printLayout === 'thermal80'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  80mm Thermal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrintLayout('thermal58');
                    setZoomScale(1.0);
                    setIsPreviewMode(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    printLayout === 'thermal58'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  58mm Mini
                </button>
              </div>

              {/* Print Queue Manager Drawer Toggle Button */}
              <button
                type="button"
                onClick={() => setShowQueueDrawer(!showQueueDrawer)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  showQueueDrawer
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="View Printer Queue & History"
              >
                <ListFilter className="w-3.5 h-3.5 text-amber-400" />
                <span>Print Queue</span>
                {printQueue.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
                    {printQueue.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* SECONDARY PRINT PREVIEW CONTROLS TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between px-5 py-2.5 bg-slate-900 border-b border-slate-800 text-xs gap-3 shrink-0">
            {/* Left: Mode Toggles (B&W vs Color, Urdu, Barcode, Logo) */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Black and White Mode Toggle */}
              <button
                type="button"
                onClick={() => setIsBlackAndWhite(!isBlackAndWhite)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border transition cursor-pointer ${
                  isBlackAndWhite
                    ? 'bg-slate-100 text-slate-950 border-white shadow-sm ring-2 ring-slate-400/40'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title="Toggle Black & White monochrome ink-saver mode"
              >
                <Palette className={`w-3.5 h-3.5 ${isBlackAndWhite ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>{isBlackAndWhite ? 'Black & White (Active)' : 'Color Mode'}</span>
              </button>

              {/* Logo Toggle */}
              <button
                type="button"
                onClick={() => setShowLogo(!showLogo)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-semibold border transition cursor-pointer ${
                  showLogo
                    ? 'bg-slate-800 text-amber-300 border-slate-700 shadow-sm'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
                title="Toggle business logo / header branding on receipt"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Logo {showLogo ? 'Visible' : 'Hidden'}</span>
              </button>

              {/* Show/Hide Urdu Toggle */}
              <button
                type="button"
                onClick={() => setShowUrduDetails(!showUrduDetails)}
                className={`px-2.5 py-1.5 rounded-xl font-semibold border transition cursor-pointer ${
                  showUrduDetails
                    ? 'bg-slate-800 text-amber-300 border-slate-700'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                اردو {showUrduDetails ? 'Enabled' : 'Hidden'}
              </button>

              {/* Show/Hide Barcode */}
              <button
                type="button"
                onClick={() => setShowBarcode(!showBarcode)}
                className={`px-2.5 py-1.5 rounded-xl font-semibold border transition cursor-pointer ${
                  showBarcode
                    ? 'bg-slate-800 text-slate-200 border-slate-700'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                Barcode {showBarcode ? 'On' : 'Off'}
              </button>
            </div>

            {/* Right: Scale & Zoom Controls */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium hidden sm:inline">Preview Scale:</span>
              <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-0.5">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomScale <= 0.5}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-40 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono font-bold text-amber-300 min-w-[48px] text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomScale >= 1.4}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-40 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition cursor-pointer"
                title="Reset Zoom to 100%"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* SCROLLABLE INVOICE / RECEIPT CANVAS STAGE */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-950/60 flex justify-center items-start custom-scrollbar">
            {!isPreviewMode ? (
              <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 my-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                  <Printer className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Print Preview is Currently OFF</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    You have chosen to send invoice #{sale.invoiceNo} directly to the printer ({printLayout.toUpperCase()}) without visual inspection.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left text-xs space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-bold text-white">{sale.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Items:</span>
                    <span className="font-bold text-white">{sale.items.length} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Net Payable:</span>
                    <span className="font-bold text-amber-400">Rs {sale.netTotal.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPreviewMode(true)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span>Enable Print Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBrowserPrint}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Now</span>
                  </button>
                </div>
              </div>
            ) : (
            <div
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
              }}
              className="pb-12"
            >
              {/* Animated Print Container with ID for CSS Print Isolation */}
              <div
                id="printable-receipt"
                className={`bg-white text-black shadow-2xl rounded-sm transition-all duration-150 ${
                  isBlackAndWhite ? 'bw-print-mode' : ''
                } ${
                  printLayout === 'thermal58'
                    ? 'w-[290px] p-3.5 text-xs'
                    : printLayout === 'thermal80'
                    ? 'w-[370px] p-5 text-sm'
                    : 'w-[794px] min-h-[1123px] p-10 text-sm border border-slate-300 ring-1 ring-black/5 bg-white'
                }`}
              >
                {printLayout === 'a4' ? (
                  /* ================== A4 WHOLESALE LASER SHEET LAYOUT ================== */
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                      <div className="flex items-start gap-4">
                        {showLogo && (
                          activeSettings.logoUrl ? (
                            <div className="w-16 h-16 rounded-lg border border-slate-300 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden">
                              <img src={activeSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg border-2 border-slate-900 bg-amber-500/10 p-1 flex flex-col items-center justify-center shrink-0 text-slate-900">
                              <span className="text-[10px] font-black uppercase tracking-tighter leading-none">NEW</span>
                              <span className="text-sm font-black tracking-tighter leading-none">SAJJAD</span>
                              <span className="text-[9px] font-bold tracking-widest text-amber-800 leading-none">ZARI</span>
                            </div>
                          )
                        )}
                        <div>
                          <h1 className="text-2xl font-black tracking-tight text-slate-950">
                            {activeSettings.shopName}
                          </h1>
                          {showUrduDetails && (
                            <p className={`text-xl font-bold font-urdu mt-1 ${isBlackAndWhite ? 'text-black' : 'text-amber-700'}`}>
                              {activeSettings.urduTitle}
                            </p>
                          )}
                          <p className="text-xs text-slate-600 mt-1">{activeSettings.tagline}</p>
                          <p className="text-xs text-slate-600">{activeSettings.address}</p>
                          <p className="text-xs font-semibold text-slate-800 mt-1">Tel: {activeSettings.phone}</p>
                          {activeSettings.thermalHeaderNote && (
                            <p className="text-[11px] text-slate-500">{activeSettings.thermalHeaderNote}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                          isBlackAndWhite ? 'bg-black text-white' : 'bg-slate-900 text-white'
                        }`}>
                          Wholesale Tax Invoice
                        </span>
                        <p className="text-sm font-bold text-slate-900 mt-2">Invoice: #{sale.invoiceNo}</p>
                        <p className="text-xs text-slate-600">Date: {sale.date}</p>
                        <p className="text-xs text-slate-600">Cashier: {sale.cashierName}</p>
                      </div>
                    </div>

                    {/* Billed To Customer Block */}
                    <div className="bg-slate-50 p-3.5 rounded border border-slate-200 flex justify-between items-center">
                      <div>
                        <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                          Customer / Bill To:
                        </p>
                        <p className="text-base font-bold text-slate-950">{sale.customerName}</p>
                        {sale.customerPhone && (
                          <p className="text-xs text-slate-600">Contact: {sale.customerPhone}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                          Payment Mode:
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          {renderPaymentMethodIcon(sale.paymentMethod, 'w-4 h-4')}
                          <span className="text-sm font-bold uppercase text-slate-900">
                            {sale.paymentMethod === 'credit' ? 'Udhaar / Credit Khata' : sale.paymentMethod}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Line Items Table */}
                    <table className="w-full text-left border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 text-xs font-bold">
                          <th className="p-2.5 border-r border-slate-300 w-10 text-center">#</th>
                          <th className="p-2.5 border-r border-slate-300">Item Description</th>
                          <th className="p-2.5 border-r border-slate-300 w-28">SKU / Code</th>
                          <th className="p-2.5 border-r border-slate-300 text-center w-24">Qty / Unit</th>
                          <th className="p-2.5 border-r border-slate-300 text-right w-28">Rate (Rs)</th>
                          <th className="p-2.5 text-right w-28">Total (Rs)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {sale.items.map((item, idx) => (
                          <tr key={idx} className="text-xs">
                            <td className="p-2.5 border-r border-slate-200 text-center">{idx + 1}</td>
                            <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-900">
                              <div>{item.product.name}</div>
                              {showUrduDetails && item.product.urduName && (
                                <div className="font-urdu text-xs text-slate-600 mt-0.5">
                                  {item.product.urduName}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-slate-600 font-mono">
                              {item.product.sku}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-center font-bold">
                              {item.quantity} {item.product.unit}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-right">
                              Rs {item.unitPrice.toLocaleString()}
                            </td>
                            <td className="p-2.5 text-right font-black text-slate-950">
                              Rs {item.subtotal.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Summary & Calculations */}
                    <div className="flex justify-between items-start pt-2 gap-6">
                      <div className="max-w-sm space-y-2">
                        {showBarcode && (
                          <div
                            className="bg-white p-1 inline-block border border-slate-200 rounded"
                            dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                          />
                        )}
                        <p className="text-xs text-slate-500 italic mt-2">
                          Terms & Conditions: Goods once sold will not be returned without original receipt.
                        </p>
                        {showUrduDetails && (
                          <p className="font-urdu text-xs font-bold text-slate-700">
                            {activeSettings.thermalFooterUrdu}
                          </p>
                        )}
                      </div>

                      <div className="w-72 space-y-1.5 text-xs text-slate-700">
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span>Gross Subtotal:</span>
                          <span className="font-bold text-slate-900">
                            Rs {sale.subtotal.toLocaleString()}
                          </span>
                        </div>

                        {sale.discountAmount > 0 && (
                          <div className={`flex justify-between py-1 border-b border-slate-200 ${
                            isBlackAndWhite ? 'text-black' : 'text-emerald-700'
                          }`}>
                            <span>
                              Discount ({sale.discountType === 'percentage' ? `${sale.discountValue}%` : 'Flat'}):
                            </span>
                            <span className="font-bold">-Rs {sale.discountAmount.toLocaleString()}</span>
                          </div>
                        )}

                        {sale.serviceFee !== undefined && sale.serviceFee > 0 && (
                          <div className="flex justify-between py-1 border-b border-slate-200 text-slate-800">
                            <span>
                              Service / Alteration Fee
                              {sale.serviceFeeType === 'percentage' && sale.serviceFeeValue
                                ? ` (${sale.serviceFeeValue}%)`
                                : ''}:
                            </span>
                            <span className="font-bold">+Rs {sale.serviceFee.toLocaleString()}</span>
                          </div>
                        )}

                        <div className="flex justify-between py-1.5 text-base font-black text-slate-950 border-b-2 border-slate-900">
                          <span>NET PAYABLE:</span>
                          <span>Rs {sale.netTotal.toLocaleString()}</span>
                        </div>

                        {sale.paymentMethod === 'credit' && sale.previousBalance !== undefined && (
                          <div className="pt-2 text-xs space-y-1">
                            <div className="flex justify-between text-slate-600">
                              <span>Previous Khata Balance:</span>
                              <span>Rs {sale.previousBalance.toLocaleString()}</span>
                            </div>
                            <div className={`flex justify-between font-bold ${
                              isBlackAndWhite ? 'text-black' : 'text-red-700'
                            }`}>
                              <span>Total Outstanding Balance:</span>
                              <span>
                                Rs {(sale.newBalance || sale.previousBalance + sale.netTotal).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Signatures & Footer Note */}
                    <div className="flex justify-between pt-12 text-xs text-slate-600">
                      <div className="border-t border-slate-400 w-52 text-center pt-1.5 font-medium">
                        Customer Signature
                      </div>
                      <div className="border-t border-slate-400 w-52 text-center pt-1.5 font-medium">
                        Authorized Store Stamp
                      </div>
                    </div>

                    {/* Custom Receipt Footer Note */}
                    {activeSettings.customReceiptFooter && (
                      <div className="mt-6 pt-3 border-t border-dashed border-slate-300 text-center text-xs text-slate-600 font-medium">
                        {activeSettings.customReceiptFooter}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ================== THERMAL RECEIPT LAYOUT (80mm / 58mm) ================== */
                  <div className="font-mono-receipt space-y-3 leading-tight">
                    {/* Header */}
                    <div className="text-center space-y-1 border-b border-dashed border-slate-400 pb-3">
                      {showLogo && (
                        activeSettings.logoUrl ? (
                          <div className="flex justify-center mb-1">
                            <img src={activeSettings.logoUrl} alt="Logo" className="max-h-12 max-w-[140px] object-contain mx-auto" />
                          </div>
                        ) : (
                          <div className="flex justify-center mb-1">
                            <div className="inline-flex flex-col items-center justify-center border border-black px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider leading-tight">
                              <span>★ {activeSettings.shopName || 'NEW SAJJAD ZARI'} ★</span>
                            </div>
                          </div>
                        )
                      )}
                      <h2 className="text-base font-bold tracking-tight text-slate-950">{activeSettings.shopName}</h2>
                      {showUrduDetails && (
                        <p className="font-urdu text-sm font-bold text-slate-800">{activeSettings.urduTitle}</p>
                      )}
                      <p className="text-[11px] text-slate-600">{activeSettings.address}</p>
                      <p className="text-[11px] font-semibold text-slate-800">Phone: {activeSettings.phone}</p>
                      {activeSettings.thermalHeaderNote && (
                        <p className="text-[10px] text-slate-500 pt-0.5">{activeSettings.thermalHeaderNote}</p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="text-xs space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                      <div className="flex justify-between">
                        <span>Invoice:</span>
                        <span className="font-bold">#{sale.invoiceNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date & Time:</span>
                        <span>{sale.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Customer:</span>
                        <span className="font-bold truncate max-w-[160px]">{sale.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cashier:</span>
                        <span>{sale.cashierName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Payment:</span>
                        <span className="font-bold uppercase flex items-center">
                          {renderPaymentMethodIcon(sale.paymentMethod, 'w-3.5 h-3.5')}
                          {sale.paymentMethod}
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="border-b border-dashed border-slate-400 pb-2">
                      <div className="flex justify-between text-xs font-bold border-b border-slate-300 pb-1 mb-1">
                        <span>ITEM</span>
                        <span>TOTAL</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {sale.items.map((item, idx) => (
                          <div key={idx}>
                            <div className="font-semibold leading-none">{item.product.name}</div>
                            {showUrduDetails && item.product.urduName && (
                              <div className="font-urdu text-[11px] text-slate-600">{item.product.urduName}</div>
                            )}
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
                      {sale.serviceFee !== undefined && sale.serviceFee > 0 && (
                        <div className="flex justify-between text-slate-700">
                          <span>
                            Service Fee{' '}
                            {sale.serviceFeeType === 'percentage' && sale.serviceFeeValue
                              ? `(${sale.serviceFeeValue}%)`
                              : ''}:
                          </span>
                          <span>+Rs {sale.serviceFee}</span>
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
                          <div className="flex justify-between font-bold text-slate-950">
                            <span>Total Due Khata:</span>
                            <span>Rs {sale.newBalance || sale.previousBalance + sale.netTotal}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Barcode & Footer */}
                    <div className="pt-3 text-center space-y-2">
                      {showBarcode && <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />}
                      <p className="text-[10px] text-slate-600">Thank you for your business!</p>
                      {showUrduDetails && (
                        <p className="font-urdu text-xs font-bold text-slate-800">
                          {activeSettings.thermalFooterUrdu}
                        </p>
                      )}
                      {activeSettings.customReceiptFooter && (
                        <p className="text-[10px] text-slate-700 font-medium pt-1 border-t border-slate-300">
                          {activeSettings.customReceiptFooter}
                        </p>
                      )}
                      <p className="text-[9px] text-slate-400">
                        Software: New Sajjad Zari POS System
                      </p>
                    </div>
                  </div>
                )}
               </div>
              </div>
            )}
           </div>

          {/* PRINT JOB STATUS & FAILURE ALERT BANNER */}
          {(printJobFailed || printAttemptCount > 0) && (
            <div className={`px-5 py-2 border-t text-xs flex items-center justify-between gap-3 ${
              printJobFailed
                ? 'bg-red-950/40 border-red-500/30 text-red-300'
                : 'bg-slate-950/80 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                {printJobFailed ? (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className="truncate">
                  {printJobFailed
                    ? 'Print job failed or printer disconnected. Use Quick Retry to resend job.'
                    : `Last print attempted (${printAttemptCount} ${printAttemptCount === 1 ? 'time' : 'times'}). Did the printer respond?`}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!printJobFailed && (
                  <button
                    type="button"
                    onClick={() => setPrintJobFailed(true)}
                    className="text-[11px] text-red-400 hover:text-red-300 underline cursor-pointer"
                  >
                    Report Print Failure
                  </button>
                )}
                {printJobFailed && (
                  <button
                    type="button"
                    onClick={() => setPrintJobFailed(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          )}

          {/* BOTTOM ACTION BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/90 shrink-0">
            <div>
              {bluetoothStatus ? (
                <span className="text-xs text-amber-400 font-medium animate-pulse">
                  {bluetoothStatus}
                </span>
              ) : (
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200 font-mono text-[10px]">Ctrl+P</kbd> to print directly
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Quick Retry Button (Enabled on Failure or Print Attempt) */}
              {(printJobFailed || printAttemptCount > 0) && (
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={handleQuickRetry}
                    disabled={retryCountdown > 0}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition shadow-lg cursor-pointer ${
                      retryCountdown > 0
                        ? 'bg-slate-800/80 border-slate-700 text-slate-400 cursor-not-allowed opacity-90'
                        : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/40 hover:border-red-400 shadow-red-500/10'
                    }`}
                    title={retryCountdown > 0 ? `Please wait ${retryCountdown}s before retrying` : 'Quick retry print command immediately'}
                  >
                    {retryCountdown > 0 ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Retry in <strong className="text-amber-300 font-mono">{retryCountdown}s</strong></span>
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-0.5" />
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                        <span>Quick Retry Print</span>
                      </>
                    )}
                  </button>

                  {/* Visual Progress Bar Overlay during Retry Countdown */}
                  {retryCountdown > 0 && (
                    <div className="absolute -bottom-1 left-2 right-2 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-1000"
                        style={{ width: `${((5 - retryCountdown) / 5) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Bluetooth Direct Thermal Button */}
              {printLayout !== 'a4' && (
                <button
                  type="button"
                  onClick={handleBluetoothPrint}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer"
                  title="Print directly to paired Bluetooth 58mm/80mm Thermal Printer"
                >
                  <Bluetooth className="w-4 h-4 text-blue-400" />
                  <span>Bluetooth Print</span>
                </button>
              )}

              {/* Main Print Button */}
              <button
                type="button"
                onClick={handleBrowserPrint}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-black shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice ({printLayout.toUpperCase()})</span>
              </button>
            </div>
          </div>

          {/* PRINTER QUEUE & HISTORY SLIDE-OVER DRAWER */}
          <AnimatePresence>
            {showQueueDrawer && (
              <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="absolute inset-y-0 right-0 w-full sm:w-96 bg-slate-950/95 border-l border-slate-800 shadow-2xl backdrop-blur-xl z-20 flex flex-col"
              >
                {/* Drawer Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold text-white">Printer Queue & History</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {printQueue.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearQueue}
                        className="text-[11px] font-semibold text-slate-400 hover:text-red-400 transition cursor-pointer"
                        title="Clear all job history"
                      >
                        Clear History
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowQueueDrawer(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Queue List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {printQueue.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                      <Clock className="w-10 h-10 mb-2 opacity-50" />
                      <p className="text-xs font-semibold">No print jobs in history</p>
                      <p className="text-[11px] mt-1 text-slate-600">
                        Print requests for receipts will automatically log here for status tracking and instant retries.
                      </p>
                    </div>
                  ) : (
                    printQueue.map((job) => (
                      <div
                        key={job.id}
                        className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 relative group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-amber-300">#{job.invoiceNo}</span>
                              <span className="text-[10px] text-slate-400">{job.timestamp}</span>
                            </div>
                            <span className="text-xs text-slate-300 block font-medium truncate max-w-[180px]">
                              {job.customerName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveQueueJob(job.id)}
                            className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            title="Remove job"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                          <span className="text-slate-400 font-mono">
                            Rs {job.netTotal.toLocaleString()} ({job.layout.toUpperCase()})
                          </span>

                          <div className="flex items-center gap-2">
                            {/* Status Badge */}
                            {job.status === 'completed' && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Printed
                              </span>
                            )}
                            {job.status === 'printing' && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" /> Printing...
                              </span>
                            )}
                            {job.status === 'pending' && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                                Pending
                              </span>
                            )}
                            {job.status === 'failed' && (
                              <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Failed
                              </span>
                            )}

                            {/* Retry Action */}
                            <button
                              type="button"
                              onClick={() => {
                                handleQuickRetry();
                                updateJobStatus(job.invoiceNo, 'printing');
                              }}
                              className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Resend print command to printer"
                            >
                              <RotateCcw className="w-3 h-3" /> Retry
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
