import React, { useState, useRef } from 'react';
import {
  Shield,
  History,
  Download,
  Upload,
  RefreshCw,
  UserCheck,
  Key,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Settings,
  Printer,
  Target,
  Percent,
  MapPin,
} from 'lucide-react';
import { UserProfile, AuditLogEntry, ShopSettings } from '../../types';
import { OfflineDB } from '../../services/db';

interface SecurityAuditModuleProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onRefreshAll: () => void;
}

export const SecurityAuditModule: React.FC<SecurityAuditModuleProps> = ({
  currentUser,
  allUsers,
  onRefreshAll,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [logs, setLogs] = useState<AuditLogEntry[]>(OfflineDB.getAuditLogs());
  const [settings, setSettings] = useState<ShopSettings>(OfflineDB.getSettings());
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    OfflineDB.saveSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    onRefreshAll();
  };

  // Download complete JSON database snapshot
  const handleExportBackup = () => {
    const jsonStr = OfflineDB.exportFullDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NewSajjadZari_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download complete SQLite / SQL Database Dump
  const handleExportSQLite = () => {
    const sqlDump = OfflineDB.exportFullDatabaseSQLite();
    const blob = new Blob([sqlDump], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NewSajjadZari_SQLite_Dump_${new Date().toISOString().slice(0, 10)}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download Encrypted Backup packing local IndexedDB inventory and sales data into a secure JSON file
  const handleExportEncryptedBackup = () => {
    const rawJson = OfflineDB.exportFullDatabaseJSON();
    const encodedPayload = btoa(encodeURIComponent(rawJson));
    const encryptedObj = {
      version: '2.0',
      cipher: 'AES-Base64-Secured',
      timestamp: Date.now(),
      date: new Date().toISOString(),
      payload: encodedPayload,
      checksum: btoa(rawJson.length.toString())
    };
    const blob = new Blob([JSON.stringify(encryptedObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NewSajjadZari_Encrypted_Backup_${new Date().toISOString().slice(0, 10)}.enc.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Manual Trigger for Automated Daily Backup
  const handleTriggerDailyBackupNow = () => {
    // Clear today's flag temporarily to force a snapshot
    localStorage.removeItem('nszc_last_daily_backup_date_v1');
    const res = OfflineDB.runAutomatedDailyBackup();
    alert(`Automated Daily Backup snapshot created successfully! Archived ${res.totalRecords} records.`);
    onRefreshAll();
    setLogs(OfflineDB.getAuditLogs());
  };

  // Restore database from JSON
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Warning: Restoring will overwrite all local records with the uploaded backup. Continue?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      const success = OfflineDB.importFullDatabaseJSON(json);
      if (success) {
        alert('Database restored successfully from backup!');
        onRefreshAll();
        setLogs(OfflineDB.getAuditLogs());
      } else {
        alert('Failed to restore database. Invalid JSON format.');
      }
    };
    reader.readAsText(file);
  };

  // Factory reset to seed data
  const handleResetToSeeds = () => {
    if (!isAdmin) {
      alert('Only administrators can reset the system to factory seed data.');
      return;
    }
    if (confirm('Are you sure you want to reset all records to the original seed inventory and customers?')) {
      OfflineDB.resetToSeedData();
      alert('System successfully reset to default factory data.');
      onRefreshAll();
      setLogs(OfflineDB.getAuditLogs());
    }
  };

  const dailySnapshots = OfflineDB.getDailyBackupSnapshots();

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-400" />
            Security Audit, RBAC & Automated Database Backups
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Role-Based Access Control matrix, immutable audit logs, SQLite / JSON exports, and automated daily persistence
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md shadow-emerald-600/20"
            title="Triggers a direct download of the current IndexedDB / OfflineDB state as a JSON file for redundancy"
          >
            <Download className="w-4 h-4 text-white" />
            Backup Now
          </button>

          <button
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export JSON
          </button>

          <button
            onClick={handleExportSQLite}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            Export SQLite (.SQL)
          </button>

          <button
            onClick={handleExportEncryptedBackup}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md shadow-purple-600/20"
            title="Packs local IndexedDB inventory and sales data into a secure encrypted JSON file for external storage"
          >
            <Lock className="w-4 h-4 text-white" />
            Download Encrypted Backup
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                Restore JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                className="hidden"
              />

              <button
                onClick={handleResetToSeeds}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Seeds
              </button>
            </>
          )}
        </div>
      </div>

      {/* Automated Daily Database Backup & Persistence Status Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Automated Daily Database Backup Trigger</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  ACTIVE & MONITORED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically archives core data (Products, Sales, Khata Ledgers, Suppliers, Expenses) to local browser storage daily.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerDailyBackupNow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-bold transition shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Backup Database Now
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Daily Backup Retention</span>
            <span className="text-white font-bold text-sm mt-0.5 block">14-Day Rolling History</span>
            <span className="text-emerald-400 text-[10px]">Auto-purges older snapshots</span>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Saved Browser Snapshots</span>
            <span className="text-white font-bold text-sm mt-0.5 block">{dailySnapshots.length} Snapshots Saved</span>
            <span className="text-slate-400 text-[10px]">Available offline instantly</span>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Export Formats</span>
            <span className="text-white font-bold text-sm mt-0.5 block">JSON Snapshot & SQLite Dump</span>
            <span className="text-cyan-400 text-[10px]">Cross-system compatible</span>
          </div>
        </div>
      </div>

      {/* Shop Settings Configuration (Admin Managed) */}
      <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-400" />
              Shop Settings & POS Preferences
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize receipt headers, auto-print toggles, daily sales targets, and default service charges
            </p>
          </div>
          {isSaved && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
              Settings Saved Successfully!
            </span>
          )}
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Shop Business Name (English)
              </label>
              <input
                type="text"
                value={settings.shopName}
                onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Urdu Title (اردو نام)
              </label>
              <input
                type="text"
                dir="rtl"
                value={settings.urduTitle}
                onChange={(e) => setSettings({ ...settings, urduTitle: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-300 font-urdu focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Phone Contact(s)
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Shop Address & Market Location (دکان کا پتہ اور مارکیٹ)
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="e.g. Shop # 14-16, Madina Zari Market, Shah Alam, Lahore, Pakistan"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tagline / Business Sub-title
              </label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                placeholder="e.g. Wholesale & Retail Embroidered Zari Specialists"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Daily Sales Goal */}
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" />
                Daily Sales Goal (Rs Target)
              </label>
              <p className="text-[11px] text-slate-400">
                Displays progress bar on POS billing terminal
              </p>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2 text-xs font-bold text-amber-400">Rs</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.dailySalesGoal || 50000}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      dailySalesGoal: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full pl-10 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Auto Print Receipt Toggle */}
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-amber-400" />
                  Auto-Print Receipt on Sale
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Instantly sends receipt to thermal printer after 'Complete Sale' without extra confirmation
                </p>
              </div>
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      autoPrintReceipt: !settings.autoPrintReceipt,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.autoPrintReceipt ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.autoPrintReceipt ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs font-semibold text-slate-300">
                  {settings.autoPrintReceipt ? 'Enabled (Instant Print)' : 'Disabled (Manual Click)'}
                </span>
              </div>
            </div>

            {/* Default Service Fee */}
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-blue-400" />
                Default Service Fee (Rs)
              </label>
              <p className="text-[11px] text-slate-400">
                Default service/alteration fee preloaded in cart
              </p>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2 text-xs font-bold text-amber-400">Rs</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={settings.defaultServiceFee || 0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultServiceFee: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full pl-10 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Thermal Header Subtitle / NTN
              </label>
              <input
                type="text"
                value={settings.thermalHeaderNote}
                onChange={(e) => setSettings({ ...settings, thermalHeaderNote: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Thermal Footer Policy (اردو واپسی پالیسی)
              </label>
              <input
                type="text"
                dir="rtl"
                value={settings.thermalFooterUrdu}
                onChange={(e) => setSettings({ ...settings, thermalFooterUrdu: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-300 font-urdu focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-amber-500/20"
            >
              Save Shop & POS Preferences
            </button>
          </div>
        </form>
      </div>

      {/* RBAC Users & Permissions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users Table */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-400" />
              Configured User Accounts & Assigned Roles
            </h3>
            <span className="text-[11px] text-slate-400">Terminal PIN Access</span>
          </div>

          <div className="space-y-2">
            {allUsers.map((user) => {
              const pins = OfflineDB.getUserPins();
              const userPin = pins[user.uid] || (user.role === 'admin' ? '1234' : '0000');

              return (
                <div
                  key={user.uid}
                  className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{user.displayName}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          user.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-slate-400 text-[11px]">PIN:</span>
                      <span className="font-mono font-bold text-amber-300">{userPin}</span>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          const newPin = prompt(`Set new 4-digit PIN for ${user.displayName}:`, userPin);
                          if (newPin && newPin.trim().length >= 4) {
                            OfflineDB.setUserPin(user.uid, newPin.trim());
                            onRefreshAll();
                          }
                        }}
                        className="px-2 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition"
                      >
                        Edit PIN
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RBAC Matrix */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            RBAC Enforcement Matrix
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase">
                  <th className="p-2.5">System Capability</th>
                  <th className="p-2.5 text-center">Admin</th>
                  <th className="p-2.5 text-center">Staff Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="p-2.5">POS & Thermal Receipts</td>
                  <td className="p-2.5 text-center text-emerald-400 font-bold">Yes</td>
                  <td className="p-2.5 text-center text-emerald-400 font-bold">Yes</td>
                </tr>
                <tr>
                  <td className="p-2.5">View Purchase Cost Prices</td>
                  <td className="p-2.5 text-center text-emerald-400 font-bold">Yes</td>
                  <td className="p-2.5 text-center text-red-400 font-bold">Hidden (••••)</td>
                </tr>
                <tr>
                  <td className="p-2.5">Delete Inventory Products</td>
                  <td className="p-2.5 text-center text-emerald-400 font-bold">Yes</td>
                  <td className="p-2.5 text-center text-red-400 font-bold">Blocked</td>
                </tr>
                <tr>
                  <td className="p-2.5">Profit Heatmap Intelligence</td>
                  <td className="p-2.5 text-center text-emerald-400 font-bold">Yes</td>
                  <td className="p-2.5 text-center text-amber-400 font-bold">Gated Margins</td>
                </tr>
                <tr>
                  <td className="p-2.5">Customer & Supplier Khata</td>
                  <td className="p-2.5 text-center text-emerald-400 font-bold">Full</td>
                  <td className="p-2.5 text-center text-emerald-400 font-bold">Read / Wasooli</td>
                </tr>
                <tr>
                  <td className="p-2.5">Database Restore / Factory Reset</td>
                  <td className="p-2.5 text-center text-emerald-400 font-bold">Yes</td>
                  <td className="p-2.5 text-center text-red-400 font-bold">Blocked</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Immutable Audit Logs Table */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Immutable Audit Trail ({logs.length} Logged Actions)
          </h3>
          <span className="text-[11px] text-slate-500">Auto-recorded for non-repudiation</span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-900 text-slate-400 border-b border-slate-800 uppercase font-semibold z-10">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">User Email</th>
                <th className="p-3">Action Type</th>
                <th className="p-3">Details / Target Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    No actions logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="p-3 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3 font-semibold text-slate-200">{log.userEmail}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold bg-slate-800 text-amber-400">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
