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
} from 'lucide-react';
import { UserProfile, AuditLogEntry } from '../../types';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-400" />
            Security Audit, RBAC & Cloud Backups
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Role-Based Access Control matrix, immutable action logs, and offline database snapshots
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Download Database Backup (.JSON)
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                Restore from JSON
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
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl text-xs font-semibold transition"
              >
                <RefreshCw className="w-4 h-4" />
                Reset to Seed Data
              </button>
            </>
          )}
        </div>
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
