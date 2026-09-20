import React, { useState, useRef, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  Layers,
  Sparkles,
  Info,
  ShieldAlert,
  Save,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { UserProfile, CSVValidationSummary, CSVValidationItem } from '../../types';
import { OfflineDB } from '../../services/db';

interface CSVBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSuccess: () => void;
}

const SAMPLE_CSV = `SKU,Product Name,Urdu Name,Category,Purchase Cost,Selling Price,Stock Quantity,Unit,Min Alert Threshold,Notes
ZAR-BULK-01,Heavy Golden Zari Lace 3-Inch,گولڈن زری لیس 3 انچ,Borders & Laces,220,350,120,yard,20,Fine metallic embroidery
ZAR-BULK-02,Pure Antique Silver Tilla Wire,خالص سلور تلہ تار,Zari & Tilla Threads,450,680,80,roll,15,Japanese grade 500m
ZAR-BULK-03,Kora Dabka Pearl Embellishment,کورا دبکہ موتی,Fancy Sequences & Stones,310,490,200,packet,30,Handmade bridal sequence
ZAR-BULK-04,Velvet Embroidered Neck Border,مخمل کڑھائی گلا بارڈر,Necklines & Motifs,180,290,65,piece,10,Fast color silk thread
ZAR-BULK-05,Multi-color Silk Resham Thread,ریشم دھاگہ ملٹی,Zari & Tilla Threads,85,140,300,roll,40,High tensile strength`;

export const CSVBulkImportModal: React.FC<CSVBulkImportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
}) => {
  const [step, setStep] = useState<'upload' | 'validate' | 'committed'>('upload');
  const [csvText, setCsvText] = useState('');
  const [validationSummary, setValidationSummary] = useState<CSVValidationSummary | null>(null);
  const [tableFilter, setTableFilter] = useState<'all' | 'valid' | 'errors' | 'new' | 'update'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    successCount: number;
    updatedCount: number;
    insertedCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle File Upload (.csv or .txt)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      validateData(text);
    };
    reader.readAsText(file);
  };

  // Perform validation on CSV text
  const validateData = (textToValidate: string) => {
    const text = textToValidate || csvText;
    if (!text.trim()) return;

    const summary = OfflineDB.validateProductsCSV(text);
    setValidationSummary(summary);
    setStep('validate');
  };

  // Download Sample Template
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Sajjad_Zari_Product_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load sample data for quick preview
  const handleLoadSampleData = () => {
    setCsvText(SAMPLE_CSV);
    validateData(SAMPLE_CSV);
  };

  // Commit valid products to OfflineDB
  const handleCommit = () => {
    if (!validationSummary || validationSummary.validCount === 0) return;

    setIsCommitting(true);
    try {
      const res = OfflineDB.commitBulkProductsImport(validationSummary.items, currentUser.email);
      setCommitResult(res);
      setStep('committed');
      onSuccess();
    } catch (err) {
      console.error('Error committing CSV import:', err);
    } finally {
      setIsCommitting(false);
    }
  };

  // Filtered validation items for preview table
  const filteredItems = useMemo(() => {
    if (!validationSummary) return [];

    return validationSummary.items.filter((item) => {
      // Status filter
      if (tableFilter === 'valid' && !item.isValid) return false;
      if (tableFilter === 'errors' && item.isValid) return false;
      if (tableFilter === 'new' && (!item.isValid || item.action !== 'insert')) return false;
      if (tableFilter === 'update' && (!item.isValid || item.action !== 'update')) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const d = item.data;
        const match =
          d.sku.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          (d.urduName && d.urduName.includes(q)) ||
          d.category.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [validationSummary, tableFilter, searchQuery]);

  const handleReset = () => {
    setCsvText('');
    setValidationSummary(null);
    setCommitResult(null);
    setStep('upload');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">CSV Bulk Product Import Utility</h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Pre-Commit Validation
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Quickly add or update catalog items with SKU, unit cost, selling price, and category validation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= STEP 1: UPLOAD & INPUT ================= */}
        {step === 'upload' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Action Helper Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs text-slate-300">
                  Required columns: <strong>SKU, Name, Unit Cost, Selling Price, Category</strong>. (Existing SKUs update; new ones insert).
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Download Sample CSV
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleData}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/30 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Fill Sample Zari Data
                </button>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-2xl p-8 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition group"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto mb-3 group-hover:scale-105 transition">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-white">Click or drag & drop product CSV spreadsheet here</h3>
              <p className="text-xs text-slate-400 mt-1">
                Supports standard .csv and .txt files exported from Microsoft Excel, LibreOffice, or Google Sheets
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Manual CSV Text Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Or Paste Raw CSV Data Directly:
                </label>
                {csvText && (
                  <button
                    type="button"
                    onClick={() => setCsvText('')}
                    className="text-[11px] text-slate-400 hover:text-red-400"
                  >
                    Clear Text
                  </button>
                )}
              </div>
              <textarea
                rows={7}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="SKU,Product Name,Urdu Name,Category,Cost Price,Selling Price,Stock Quantity,Unit,Min Stock Alert,Notes&#10;ZAR-001,Pure Gold Tilla,گولڈ تلہ,Zari & Tilla Threads,420,650,100,roll,20,Premium quality"
                className="w-full font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:outline-none focus:border-amber-400 placeholder:text-slate-600 leading-relaxed"
              />
            </div>

            {/* Step 1 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!csvText.trim()}
                onClick={() => validateData(csvText)}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/20"
              >
                <span>Validate & Preview Records</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: VALIDATION SUMMARY & DATA PREVIEW ================= */}
        {step === 'validate' && validationSummary && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5 flex flex-col">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Rows</div>
                <div className="text-xl font-bold text-white mt-1">{validationSummary.totalRows}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Parsed from CSV</div>
              </div>

              <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                <div className="text-[11px] text-emerald-400 uppercase font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready to Commit
                </div>
                <div className="text-xl font-bold text-emerald-300 mt-1">
                  {validationSummary.validCount}
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-0.5">Valid products</div>
              </div>

              <div className="p-3.5 bg-blue-500/10 rounded-xl border border-blue-500/30">
                <div className="text-[11px] text-blue-400 uppercase font-semibold">New vs Updates</div>
                <div className="text-sm font-bold text-white mt-1">
                  <span className="text-emerald-400">+{validationSummary.newCount} New</span> /{' '}
                  <span className="text-blue-400">{validationSummary.updateCount} Update</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Matched by SKU</div>
              </div>

              <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/30">
                <div className="text-[11px] text-amber-400 uppercase font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Warnings
                </div>
                <div className="text-xl font-bold text-amber-300 mt-1">
                  {validationSummary.warningCount}
                </div>
                <div className="text-[10px] text-amber-400/80 mt-0.5">E.g. low margin</div>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  validationSummary.invalidCount > 0
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div
                  className={`text-[11px] uppercase font-semibold flex items-center gap-1 ${
                    validationSummary.invalidCount > 0 ? 'text-red-400' : 'text-slate-400'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Invalid Rows
                </div>
                <div
                  className={`text-xl font-bold mt-1 ${
                    validationSummary.invalidCount > 0 ? 'text-red-400' : 'text-slate-400'
                  }`}
                >
                  {validationSummary.invalidCount}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {validationSummary.invalidCount > 0 ? 'Will be skipped' : 'No errors found'}
                </div>
              </div>
            </div>

            {/* Validation Notice Banner */}
            {validationSummary.invalidCount > 0 && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    {validationSummary.invalidCount} row(s) have validation errors and cannot be imported directly.
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    You can either click "Commit Valid Records" to import the {validationSummary.validCount} valid products (skipping invalid rows), or click "Back to Editor" to fix the CSV.
                  </div>
                </div>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setTableFilter('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    tableFilter === 'all'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Rows ({validationSummary.totalRows})
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter('valid')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    tableFilter === 'valid'
                      ? 'bg-emerald-500/20 text-emerald-300 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Valid ({validationSummary.validCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter('new')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    tableFilter === 'new'
                      ? 'bg-emerald-500/20 text-emerald-300 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  New ({validationSummary.newCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter('update')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    tableFilter === 'update'
                      ? 'bg-blue-500/20 text-blue-300 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Updates ({validationSummary.updateCount})
                </button>
                {validationSummary.invalidCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setTableFilter('errors')}
                    className={`px-3 py-1 rounded-lg font-medium transition ${
                      tableFilter === 'errors'
                        ? 'bg-red-500/20 text-red-300 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Errors ({validationSummary.invalidCount})
                  </button>
                )}
              </div>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search parsed records..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Validation Preview Table */}
            <div className="flex-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3 w-12">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Cost (Rs)</th>
                    <th className="py-2.5 px-3 text-right">Selling (Rs)</th>
                    <th className="py-2.5 px-3 text-center">Margin %</th>
                    <th className="py-2.5 px-3 text-center">Stock</th>
                    <th className="py-2.5 px-3">Validation Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        No rows matching the active filter.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const d = item.data;
                      const marginPercent =
                        d.sellingPrice > 0 && d.costPrice > 0
                          ? (((d.sellingPrice - d.costPrice) / d.sellingPrice) * 100).toFixed(1)
                          : '0.0';

                      return (
                        <tr
                          key={item.rowIndex}
                          className={`hover:bg-slate-800/40 transition ${
                            !item.isValid ? 'bg-red-500/5' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                            #{item.rowIndex}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {!item.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                                <X className="w-3 h-3" />
                                Invalid
                              </span>
                            ) : item.action === 'insert' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                New Item
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                <RefreshCw className="w-3 h-3" />
                                Update SKU
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-amber-300">
                            {d.sku}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-white">{d.name}</div>
                            {d.urduName && (
                              <div className="font-urdu text-[11px] text-amber-400">
                                {d.urduName}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-300">{d.category}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">
                            Rs {d.costPrice}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-white">
                            Rs {d.sellingPrice}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`text-[11px] font-bold ${
                                Number(marginPercent) >= 25
                                  ? 'text-emerald-400'
                                  : Number(marginPercent) > 0
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {marginPercent}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap font-semibold text-slate-200">
                            {d.stock} {d.unit}
                          </td>
                          <td className="py-2 px-3">
                            {item.errors.length > 0 && (
                              <div className="text-red-400 text-[11px] font-medium">
                                {item.errors.join('; ')}
                              </div>
                            )}
                            {item.warnings.length > 0 && (
                              <div className="text-amber-400 text-[10px]">
                                {item.warnings.join('; ')}
                              </div>
                            )}
                            {item.errors.length === 0 && item.warnings.length === 0 && (
                              <span className="text-emerald-500 text-[11px]">Valid</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Step 2 Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to CSV Editor
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={validationSummary.validCount === 0 || isCommitting}
                  onClick={handleCommit}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      Committing to Database...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-slate-950" />
                      Commit {validationSummary.validCount} Products to Database
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: COMMITTED SUCCESS STATE ================= */}
        {step === 'committed' && commitResult && (
          <div className="flex-1 p-8 text-center space-y-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-bold text-white">
                Bulk Products Successfully Committed!
              </h3>
              <p className="text-xs text-slate-400">
                The product catalog has been updated in the local offline database and synced with audit logging.
              </p>
            </div>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-md">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Processed</div>
                <div className="text-xl font-bold text-white mt-0.5">{commitResult.successCount}</div>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <div className="text-[10px] text-emerald-400 uppercase font-semibold">New Inserted</div>
                <div className="text-xl font-bold text-emerald-300 mt-0.5">+{commitResult.insertedCount}</div>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <div className="text-[10px] text-blue-400 uppercase font-semibold">Updated SKUs</div>
                <div className="text-xl font-bold text-blue-300 mt-0.5">{commitResult.updatedCount}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Import Another File
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition"
              >
                View Inventory Catalog
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
