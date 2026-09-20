import React, { useState } from 'react';
import {
  X,
  Store,
  MapPin,
  Phone,
  Printer,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  Percent,
  Coins,
  ShieldCheck,
  Target,
  Lock,
  Clock,
  Zap,
} from 'lucide-react';
import { ShopSettings, UserProfile } from '../types';
import { OfflineDB } from '../services/db';
import { ESCPOSPrinter } from '../utils/escpos';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShopSettings;
  onSaveSettings: (settings: ShopSettings) => void;
  currentUser?: UserProfile;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings: initialSettings,
  onSaveSettings,
  currentUser,
}) => {
  const [formData, setFormData] = useState<ShopSettings>({
    ...initialSettings,
    address: initialSettings.address || '',
    autoPrintOnSale: initialSettings.autoPrintOnSale ?? initialSettings.autoPrintReceipt ?? false,
    autoPrintReceipt: initialSettings.autoPrintOnSale ?? initialSettings.autoPrintReceipt ?? false,
    dailyRevenueTarget: initialSettings.dailyRevenueTarget ?? initialSettings.dailySalesGoal ?? 75000,
    dailySalesGoal: initialSettings.dailyRevenueTarget ?? initialSettings.dailySalesGoal ?? 75000,
    autoLockEnabled: initialSettings.autoLockEnabled ?? false,
    autoLockMinutes: initialSettings.autoLockMinutes ?? 5,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'general' | 'print' | 'sales' | 'loyalty' | 'security'>('general');
  const [testPrintStatus, setTestPrintStatus] = useState<{ isTesting: boolean; message: string | null; success?: boolean }>({
    isTesting: false,
    message: null,
  });

  if (!isOpen) return null;

  const handleTestPrint = () => {
    setTestPrintStatus({ isTesting: true, message: 'Dispatching diagnostic test slip to thermal printer...' });
    const result = ESCPOSPrinter.triggerTestPrint(formData);
    setTimeout(() => {
      setTestPrintStatus({
        isTesting: false,
        message: result.message,
        success: result.success,
      });
      setTimeout(() => {
        setTestPrintStatus((prev) => ({ ...prev, message: null }));
      }, 5000);
    }, 800);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanData: ShopSettings = {
      ...formData,
      dailySalesGoal: formData.dailyRevenueTarget || formData.dailySalesGoal,
      dailyRevenueTarget: formData.dailyRevenueTarget || formData.dailySalesGoal,
      autoPrintReceipt: formData.autoPrintOnSale,
    };
    OfflineDB.saveSettings(cleanData);
    onSaveSettings(cleanData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Shop Settings & POS Preferences
              </h2>
              <p className="text-xs text-slate-400">
                Configure shop branding, physical address for receipts, printing templates, auto-print, security lock, and operational targets
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/30 gap-2 pt-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSection('general')}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeSection === 'general'
                ? 'border-amber-400 text-amber-400 bg-slate-850'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Shop Identity & Address
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('print')}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeSection === 'print'
                ? 'border-amber-400 text-amber-400 bg-slate-850'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            Receipts & Invoices
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('sales')}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeSection === 'sales'
                ? 'border-amber-400 text-amber-400 bg-slate-850'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Sales Target & Fees
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('security')}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeSection === 'security'
                ? 'border-amber-400 text-amber-400 bg-slate-850'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Auto-Lock & Security
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('loyalty')}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeSection === 'loyalty'
                ? 'border-amber-400 text-amber-400 bg-slate-850'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Loyalty Rewards
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeSection === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Shop English Name / Brand Title *
                  </label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    placeholder="e.g. New Sajjad Zari Corporation"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Shop Urdu Title (اردو دکان کا نام)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.urduTitle}
                    onChange={(e) => setFormData({ ...formData, urduTitle: e.target.value })}
                    placeholder="نیو سجاد زری کارپوریشن"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-amber-300 font-urdu focus:border-amber-400 focus:outline-none text-right"
                  />
                </div>
              </div>

              {/* Physical Shop Address Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  Shop Address & Market Location (دکان کا پتہ اور مارکیٹ) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Shop # 14-16, Madina Zari Market, Shah Alam, Lahore, Pakistan"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This address is printed on all thermal receipts and A4 wholesale tax invoices.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    Phone / Contact Number(s) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 0300-4567890 / 042-37654321"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tagline / Business Sub-title
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="e.g. Wholesale & Retail Embroidered Zari Specialists"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'print' && (
            <div className="space-y-4">
              {/* Auto-Print on Sale Global Toggle */}
              <div className="p-4 bg-slate-800/90 rounded-xl border border-slate-700 flex items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Auto-Print on Sale (فوری پرنٹ)</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      High Speed POS
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Bypass the print confirmation dialog and automatically trigger print jobs for faster checkout experiences.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formData.autoPrintOnSale ?? false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        autoPrintOnSale: e.target.checked,
                        autoPrintReceipt: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Diagnostic Test Print Action Box */}
              <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <Printer className="w-4 h-4 text-emerald-400" />
                      <span>Thermal Printer Diagnostic Test</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Send a test print request to the thermal printer to ensure connectivity, font rendering, and paper feed motor are working before a busy shift.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestPrint}
                    disabled={testPrintStatus.isTesting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <Printer className={`w-4 h-4 ${testPrintStatus.isTesting ? 'animate-bounce' : ''}`} />
                    <span>{testPrintStatus.isTesting ? 'Sending Test...' : 'Test Print (آزمائشی پرنٹ)'}</span>
                  </button>
                </div>

                {testPrintStatus.message && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 animate-in fade-in duration-150 ${
                      testPrintStatus.success === false
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                        : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{testPrintStatus.message}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Default Printer & Receipt Layout
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'thermal80', label: '80mm Thermal (ESC/POS)', desc: 'Standard POS receipt printer' },
                    { id: 'thermal58', label: '58mm Mini Thermal', desc: 'Compact portable Bluetooth printer' },
                    { id: 'a4', label: 'A4 Laser / Inkjet', desc: 'Detailed wholesale tax invoice' },
                  ].map((mode) => (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => setFormData({ ...formData, defaultPrinterMode: mode.id as any })}
                      className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        formData.defaultPrinterMode === mode.id
                          ? 'bg-amber-500/10 border-amber-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-semibold text-xs text-white">{mode.label}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Thermal Receipt Header Note / Tax Info
                </label>
                <input
                  type="text"
                  value={formData.thermalHeaderNote}
                  onChange={(e) => setFormData({ ...formData, thermalHeaderNote: e.target.value })}
                  placeholder="e.g. NTN: 4129845-2 | Retail & Wholesale Zari Specialists"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Thermal Receipt Footer Notice (Urdu / English Return Policy)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.thermalFooterUrdu}
                  onChange={(e) => setFormData({ ...formData, thermalFooterUrdu: e.target.value })}
                  placeholder="مال کی واپسی یا تبدیلی 7 دن کے اندر بل کے ساتھ ممکن ہے"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-amber-300 font-urdu focus:border-amber-400 focus:outline-none text-right"
                />
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Audio & Sound FX</div>
                  <div className="text-[11px] text-slate-400">Play chime sound on barcode scan and billing</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableSoundEffects}
                    onChange={(e) => setFormData({ ...formData, enableSoundEffects: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>
          )}

          {activeSection === 'sales' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                  <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-emerald-400" />
                    Daily Revenue Target (Rs) / یومیہ ہدف
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Configurable daily sales benchmark used by the QuickStatsDashboard progress meter and POS status bar.
                  </p>
                  <div className="relative mb-2">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-amber-400">Rs</span>
                    <input
                      type="number"
                      min={1000}
                      step={5000}
                      value={formData.dailyRevenueTarget ?? formData.dailySalesGoal ?? 75000}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          dailyRevenueTarget: val,
                          dailySalesGoal: val,
                        });
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[50000, 75000, 100000, 150000, 200000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            dailyRevenueTarget: preset,
                            dailySalesGoal: preset,
                          })
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                          (formData.dailyRevenueTarget ?? formData.dailySalesGoal) === preset
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                        }`}
                      >
                        Rs {(preset / 1000)}k
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                  <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-blue-400" />
                    Default Service / Alteration Fee
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Default fee pre-populated during POS checkout
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      value={formData.defaultServiceFee ?? 0}
                      onChange={(e) => setFormData({ ...formData, defaultServiceFee: parseFloat(e.target.value) || 0 })}
                      className="w-1/2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
                    />
                    <select
                      value={formData.defaultServiceFeeType || 'flat'}
                      onChange={(e) => setFormData({ ...formData, defaultServiceFeeType: e.target.value as any })}
                      className="w-1/2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                    >
                      <option value="flat">Flat (Rs)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Auto-Lock Terminal on Inactivity (خودکار لاک)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Triggers the terminal lock screen after a user-defined period of inactivity to improve security compliance.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formData.autoLockEnabled ?? false}
                    onChange={(e) => setFormData({ ...formData, autoLockEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {formData.autoLockEnabled && (
                <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 space-y-3 animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Inactivity Timeout Period (منٹ)
                  </label>
                  <p className="text-xs text-slate-400">
                    Terminal will lock and require authentication if no user clicks, keypresses, or touch inputs occur during this time:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {[
                      { minutes: 1, label: '1 min' },
                      { minutes: 2, label: '2 mins' },
                      { minutes: 5, label: '5 mins (Recommended)' },
                      { minutes: 10, label: '10 mins' },
                      { minutes: 15, label: '15 mins' },
                      { minutes: 30, label: '30 mins' },
                    ].map((opt) => (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() => setFormData({ ...formData, autoLockMinutes: opt.minutes })}
                        className={`p-2.5 rounded-xl border text-center transition font-bold text-xs ${
                          (formData.autoLockMinutes ?? 5) === opt.minutes
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Protects sensitive wholesale margins, ledger balances, and cash closing records from unauthorized view.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'loyalty' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    Customer Loyalty Points System
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Reward wholesale and retail clients with points upon cash & credit settlement
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.loyaltyEnabled ?? true}
                    onChange={(e) => setFormData({ ...formData, loyaltyEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 bg-slate-800 rounded-xl border border-slate-700">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Points Earned per Rs 100
                  </label>
                  <input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={formData.pointsPerHundredRupees ?? 1}
                    onChange={(e) =>
                      setFormData({ ...formData, pointsPerHundredRupees: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default: 1 pt per Rs 100 spent</p>
                </div>

                <div className="p-3.5 bg-slate-800 rounded-xl border border-slate-700">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Point Redemption Rate (Rs / pt)
                  </label>
                  <input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={formData.pointRedemptionRate ?? 1}
                    onChange={(e) =>
                      setFormData({ ...formData, pointRedemptionRate: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default: 1 pt = Rs 1 discount</p>
                </div>

                <div className="p-3.5 bg-slate-800 rounded-xl border border-slate-700">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Min Points to Redeem
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.minPointsToRedeem ?? 20}
                    onChange={(e) =>
                      setFormData({ ...formData, minPointsToRedeem: parseInt(e.target.value, 10) || 20 })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Threshold before points unlock</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer Action Controls */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Changes saved locally and synced across tabs</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition shadow-lg shadow-amber-500/20"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                    Settings Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
