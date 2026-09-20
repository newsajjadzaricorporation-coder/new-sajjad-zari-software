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
} from 'lucide-react';
import { ShopSettings, UserProfile } from '../types';
import { OfflineDB } from '../services/db';

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
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'general' | 'print' | 'sales' | 'loyalty'>('general');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    OfflineDB.saveSettings(formData);
    onSaveSettings(formData);
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
                Configure shop branding, physical address for receipts, printing templates, and operational targets
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
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/30 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveSection('general')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 ${
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
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 ${
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
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 ${
              activeSection === 'sales'
                ? 'border-amber-400 text-amber-400 bg-slate-850'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Sales Goals & Fees
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('loyalty')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 ${
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
                    Daily Sales Revenue Goal (Rs)
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Used to render the progress meter on POS and dashboard
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-amber-400">Rs</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={formData.dailySalesGoal ?? 75000}
                      onChange={(e) => setFormData({ ...formData, dailySalesGoal: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
                    />
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
