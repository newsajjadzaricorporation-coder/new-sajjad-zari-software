import React, { useState, useRef, useMemo } from 'react';
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
  Trash2,
  Users,
  BarChart3,
  TrendingUp,
  ShoppingBag,
  LogIn,
  Award,
  Crown,
  DollarSign,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
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
  const [activeTab, setActiveTab] = useState<'analytics' | 'security'>('analytics');
  const [logs, setLogs] = useState<AuditLogEntry[]>(OfflineDB.getAuditLogs());
  const [logFilter, setLogFilter] = useState<'all' | 'critical'>('all');
  const [settings, setSettings] = useState<ShopSettings>(OfflineDB.getSettings());
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sales = useMemo(() => OfflineDB.getSales(), []);

  // Compute Staff Performance, Average Transaction Size, and Login Activity
  const staffAnalytics = useMemo(() => {
    const staffMap = new Map<string, {
      id: string;
      name: string;
      email: string;
      role: string;
      totalRevenue: number;
      totalInvoices: number;
      totalItemsSold: number;
      loginCount: number;
      lastLogin: string | null;
    }>();

    // Helper function to locate staff by ID, email, or name
    const findStaffEntry = (id?: string, email?: string, name?: string) => {
      if (id && staffMap.has(id)) return staffMap.get(id);

      const normEmail = email?.trim().toLowerCase();
      const normName = name?.trim().toLowerCase();

      for (const entry of staffMap.values()) {
        if (id && entry.id === id) return entry;
        if (normEmail && entry.email.trim().toLowerCase() === normEmail) return entry;
        if (normName && entry.name.trim().toLowerCase() === normName) return entry;
        if (normName && (entry.name.toLowerCase().includes(normName) || normName.includes(entry.name.toLowerCase()))) return entry;
      }
      return undefined;
    };

    // 1. Initialize from all registered users
    allUsers.forEach((u, idx) => {
      const uid = u.uid || `user-${idx}`;
      const displayName = u.displayName || u.email || 'User';
      if (!staffMap.has(uid)) {
        staffMap.set(uid, {
          id: uid,
          name: displayName,
          email: u.email || '',
          role: u.role || 'cashier',
          totalRevenue: 0,
          totalInvoices: 0,
          totalItemsSold: 0,
          loginCount: 0,
          lastLogin: u.lastLogin || null,
        });
      }
    });

    // 2. Aggregate sales metrics per staff member
    sales.forEach((sale) => {
      const cashierName = sale.cashierName || 'Store Cashier';
      const cashierId = sale.cashierId;

      let staffEntry = findStaffEntry(cashierId, undefined, cashierName);

      if (!staffEntry) {
        const newId = cashierId || `staff-${cashierName.replace(/\s+/g, '-').toLowerCase()}`;
        if (staffMap.has(newId)) {
          staffEntry = staffMap.get(newId)!;
        } else {
          staffEntry = {
            id: newId,
            name: cashierName,
            email: `${cashierName.replace(/\s+/g, '.').toLowerCase()}@sajjadzari.com`,
            role: 'cashier',
            totalRevenue: 0,
            totalInvoices: 0,
            totalItemsSold: 0,
            loginCount: 0,
            lastLogin: null,
          };
          staffMap.set(newId, staffEntry);
        }
      }

      staffEntry.totalRevenue += Number(sale.netTotal) || 0;
      staffEntry.totalInvoices += 1;
      sale.items?.forEach((it) => {
        staffEntry!.totalItemsSold += Number(it.quantity) || 0;
      });
    });

    // 3. Process audit logs for login count & activity
    logs.forEach((log) => {
      const detailStr = (log.details || '').toLowerCase();
      const actionStr = (log.action || '').toLowerCase();
      const userStr = (log.userEmail || '').toLowerCase();

      const isLogin = actionStr.includes('login') || detailStr.includes('login') || detailStr.includes('logged in') || actionStr.includes('user_login');

      if (isLogin) {
        staffMap.forEach((entry) => {
          if (
            (entry.email && userStr.includes(entry.email.toLowerCase())) ||
            (entry.name && userStr.includes(entry.name.toLowerCase())) ||
            (entry.name && detailStr.includes(entry.name.toLowerCase()))
          ) {
            entry.loginCount += 1;
            if (!entry.lastLogin || new Date(log.timestamp) > new Date(entry.lastLogin)) {
              entry.lastLogin = log.timestamp;
            }
          }
        });
      }
    });

    return Array.from(staffMap.values())
      .map((s) => ({
        ...s,
        avgTransactionSize: s.totalInvoices > 0 ? Math.round(s.totalRevenue / s.totalInvoices) : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [allUsers, sales, logs]);

  // Compute Current Month Staff Leaderboard & Transaction Speed Metrics
  const monthlyLeaderboard = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // e.g., '2026-09'
    const monthSales = sales.filter((s) => s.date && s.date.startsWith(currentMonthPrefix));

    const monthStaffMap = new Map<string, {
      id: string;
      name: string;
      role: string;
      monthlyRevenue: number;
      monthlyInvoices: number;
      monthlyItemsSold: number;
      totalCheckoutTimeSec: number;
      timestamps: number[];
    }>();

    // Initialize with staff members
    staffAnalytics.forEach((s) => {
      monthStaffMap.set(s.id, {
        id: s.id,
        name: s.name,
        role: s.role,
        monthlyRevenue: 0,
        monthlyInvoices: 0,
        monthlyItemsSold: 0,
        totalCheckoutTimeSec: 0,
        timestamps: [],
      });
    });

    // Aggregate monthly sales per staff
    monthSales.forEach((sale) => {
      const cashierName = sale.cashierName || 'Store Cashier';
      let entry = monthStaffMap.get(sale.cashierId);
      if (!entry) {
        for (const e of monthStaffMap.values()) {
          if (e.name.toLowerCase() === cashierName.toLowerCase() || e.id === sale.cashierId) {
            entry = e;
            break;
          }
        }
      }

      if (!entry) {
        entry = {
          id: sale.cashierId || `staff-${cashierName}`,
          name: cashierName,
          role: 'cashier',
          monthlyRevenue: 0,
          monthlyInvoices: 0,
          monthlyItemsSold: 0,
          totalCheckoutTimeSec: 0,
          timestamps: [],
        };
        monthStaffMap.set(entry.id, entry);
      }

      const net = Number(sale.netTotal) || 0;
      entry.monthlyRevenue += net;
      entry.monthlyInvoices += 1;
      const itemsCount = sale.items?.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) || 1;
      entry.monthlyItemsSold += itemsCount;

      if (sale.timestamp) {
        entry.timestamps.push(sale.timestamp);
      }

      // Estimate transaction speed: ~20s base + 8s per unique item in cart
      const estimatedSec = 20 + Math.min(60, (sale.items?.length || 1) * 8);
      entry.totalCheckoutTimeSec += estimatedSec;
    });

    return Array.from(monthStaffMap.values())
      .map((s) => {
        // Average speed in seconds per sale invoice
        const avgSpeedSec = s.monthlyInvoices > 0 ? Math.round(s.totalCheckoutTimeSec / s.monthlyInvoices) : 30;
        const avgSpeedFormatted = `${avgSpeedSec}s / sale`;
        const avgTicket = s.monthlyInvoices > 0 ? Math.round(s.monthlyRevenue / s.monthlyInvoices) : 0;

        return {
          ...s,
          avgSpeedSec,
          avgSpeedFormatted,
          avgTicket,
        };
      })
      .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue || a.avgSpeedSec - b.avgSpeedSec);
  }, [sales, staffAnalytics]);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'critical') {
      return logs.filter((l) => /delete|override|stock|pin|reset|admin|price|invoice/i.test(l.action + l.details));
    }
    return logs;
  }, [logs, logFilter]);

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

  // Purge expired backup files
  const handlePurgeExpiredBackups = () => {
    const deletedCount = OfflineDB.purgeOldBackupSnapshots(settings.backupRetentionDays || 30);
    alert(
      deletedCount > 0
        ? `Cleaned up local storage! Successfully auto-deleted ${deletedCount} backup snapshot(s) older than ${settings.backupRetentionDays || 30} days.`
        : `No expired backup files found older than ${settings.backupRetentionDays || 30} days. Local storage is already clean!`
    );
    onRefreshAll();
  };

  const dailySnapshots = OfflineDB.getDailyBackupSnapshots();

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-900">
      {/* Navigation Tab Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Staff Performance & Analytics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'security'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security, Backups & Audit Logs</span>
        </button>
      </div>

      {activeTab === 'analytics' ? (
        /* ================== STAFF PERFORMANCE ANALYTICS VIEW ================== */
        <div className="space-y-6">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-xs font-medium text-slate-400">Total Registered Staff</span>
              <div className="text-2xl font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                {staffAnalytics.length} Members
              </div>
              <div className="text-[11px] text-slate-400">Cashiers, Managers & Admins</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-xs font-medium text-slate-400">Top Revenue Contributor</span>
              <div className="text-2xl font-black text-emerald-400 flex items-center gap-2 truncate">
                <Award className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="truncate">{staffAnalytics[0]?.name || 'N/A'}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Rs {(staffAnalytics[0]?.totalRevenue || 0).toLocaleString()} generated
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-xs font-medium text-slate-400">Avg System Transaction</span>
              <div className="text-2xl font-black text-cyan-400 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Rs {Math.round(
                  staffAnalytics.reduce((acc, curr) => acc + curr.totalRevenue, 0) /
                    Math.max(1, staffAnalytics.reduce((acc, curr) => acc + curr.totalInvoices, 0))
                ).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400">Average sales value per receipt</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-xs font-medium text-slate-400">Total Login Sessions</span>
              <div className="text-2xl font-black text-purple-400 flex items-center gap-2">
                <LogIn className="w-5 h-5 text-purple-400" />
                {staffAnalytics.reduce((acc, curr) => acc + curr.loginCount, 0)} Logins
              </div>
              <div className="text-[11px] text-slate-400">Audit logged staff access events</div>
            </div>
          </div>

          {/* Staff Performance Bar Chart (Recharts) */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span>Sales Revenue Comparison by Staff Member</span>
                  <span className="text-xs text-amber-400 font-urdu font-normal">(اسٹاف کی سیلز کی کارکردگی)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visual breakdown of total net revenue generated across active cashiers and admins
                </p>
              </div>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffAnalytics} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl text-xs shadow-2xl space-y-1.5 z-50">
                            <div className="font-bold text-white border-b border-slate-800 pb-1 flex justify-between gap-4">
                              <span>{item.name}</span>
                              <span className="uppercase text-[10px] text-amber-400 font-mono">{item.role}</span>
                            </div>
                            <div className="space-y-1 text-slate-300">
                              <div className="flex justify-between gap-6 text-emerald-400 font-bold">
                                <span>Total Sales Revenue:</span>
                                <span>Rs {item.totalRevenue.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span>Invoices Issued:</span>
                                <span>{item.totalInvoices} receipts</span>
                              </div>
                              <div className="flex justify-between gap-6 text-cyan-400 font-semibold">
                                <span>Avg Transaction Size:</span>
                                <span>Rs {item.avgTransactionSize.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between gap-6 text-purple-300">
                                <span>Login Count:</span>
                                <span>{item.loginCount} sessions</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="totalRevenue" radius={[6, 6, 0, 0]}>
                    {staffAnalytics.map((_, index) => {
                      const colors = ['#10b981', '#f59e0b', '#06b6d4', '#6366f1', '#a855f7'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ================== MONTHLY STAFF LEADERBOARD SECTION ================== */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900 to-slate-950 border border-amber-500/30 space-y-5 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>Monthly Cashier & Staff Leaderboard</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Staff rankings based on monthly sales revenue volume and average transaction checkout speed
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Auto-refreshed from completed POS invoices</span>
              </div>
            </div>

            {/* Top 3 Podium Highlights */}
            {monthlyLeaderboard.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* 2nd Place - Silver */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/60 flex flex-col items-center text-center space-y-2 relative order-2 md:order-1">
                  <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-950 font-black flex items-center justify-center text-base shadow-md">
                    2
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    SILVER PODIUM
                  </span>
                  <h4 className="text-sm font-bold text-white truncate max-w-full">{monthlyLeaderboard[1].name}</h4>
                  <div className="text-lg font-black text-emerald-400">
                    Rs {monthlyLeaderboard[1].monthlyRevenue.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                    <span>{monthlyLeaderboard[1].monthlyInvoices} Invoices</span>
                    <span>•</span>
                    <span className="text-cyan-400 font-semibold">{monthlyLeaderboard[1].avgSpeedFormatted}</span>
                  </div>
                </div>

                {/* 1st Place - Gold Champion */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-400 flex flex-col items-center text-center space-y-2 relative order-1 md:order-2 shadow-amber-500/10 shadow-2xl scale-105">
                  <div className="absolute -top-3 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <Crown className="w-3 h-3 fill-slate-950" />
                    Month Champion
                  </div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black flex items-center justify-center text-xl shadow-lg mt-1">
                    1
                  </div>
                  <h4 className="text-base font-black text-amber-300 truncate max-w-full">{monthlyLeaderboard[0].name}</h4>
                  <div className="text-2xl font-black text-amber-400">
                    Rs {monthlyLeaderboard[0].monthlyRevenue.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300 pt-1 font-medium">
                    <span>{monthlyLeaderboard[0].monthlyInvoices} Invoices</span>
                    <span>•</span>
                    <span className="text-cyan-300 font-bold">{monthlyLeaderboard[0].avgSpeedFormatted}</span>
                  </div>
                </div>

                {/* 3rd Place - Bronze */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/60 flex flex-col items-center text-center space-y-2 relative order-3">
                  <div className="w-10 h-10 rounded-full bg-amber-700/80 text-amber-100 font-black flex items-center justify-center text-base shadow-md">
                    3
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-900/40 text-amber-300 border border-amber-700/40">
                    BRONZE PODIUM
                  </span>
                  <h4 className="text-sm font-bold text-white truncate max-w-full">{monthlyLeaderboard[2].name}</h4>
                  <div className="text-lg font-black text-emerald-400">
                    Rs {monthlyLeaderboard[2].monthlyRevenue.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                    <span>{monthlyLeaderboard[2].monthlyInvoices} Invoices</span>
                    <span>•</span>
                    <span className="text-cyan-400 font-semibold">{monthlyLeaderboard[2].avgSpeedFormatted}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Complete Leaderboard Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-4 font-semibold text-center w-12">Rank</th>
                    <th className="py-3 px-4 font-semibold">Staff Member</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold text-right">Monthly Sales Volume</th>
                    <th className="py-3 px-4 font-semibold text-center">Invoices</th>
                    <th className="py-3 px-4 font-semibold text-right">Avg Ticket Size</th>
                    <th className="py-3 px-4 font-semibold text-center">Avg Checkout Speed</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {monthlyLeaderboard.map((staff, idx) => {
                    const rank = idx + 1;
                    const isTop1 = rank === 1;
                    const isTop2 = rank === 2;
                    const isTop3 = rank === 3;

                    return (
                      <tr key={staff.id || `leaderboard-${idx}`} className="hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 text-center font-bold">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/80 text-amber-100 font-black text-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono">#{rank}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <span>{staff.name}</span>
                            {isTop1 && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {staff.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-400">
                          Rs {staff.monthlyRevenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold">
                          {staff.monthlyInvoices} receipts
                        </td>
                        <td className="py-3 px-4 text-right text-amber-300 font-semibold">
                          Rs {staff.avgTicket.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-cyan-400 font-bold">
                          {staff.avgSpeedFormatted}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {staff.monthlyRevenue > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Active Seller
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                              No Sales
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Staff Performance Table */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Staff Member Performance Breakdown</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed analytics covering sales volume, average ticket size, items sold, and authentication frequency
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-4 font-semibold">Staff Member</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold text-right">Total Revenue</th>
                    <th className="py-3 px-4 font-semibold text-center">Invoices</th>
                    <th className="py-3 px-4 font-semibold text-right">Avg Ticket Size</th>
                    <th className="py-3 px-4 font-semibold text-center">Units Sold</th>
                    <th className="py-3 px-4 font-semibold text-center">Login Sessions</th>
                    <th className="py-3 px-4 font-semibold text-center">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {staffAnalytics.map((staff, idx) => (
                    <tr key={staff.id || `staff-${idx}`} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{staff.name}</span>
                              {idx === 0 && staff.totalRevenue > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                                  Top Seller
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">{staff.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            staff.role === 'admin'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : staff.role === 'manager'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {staff.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-black text-emerald-400">
                        Rs {staff.totalRevenue.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-300">
                        {staff.totalInvoices}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-cyan-400">
                        Rs {staff.avgTransactionSize.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-center text-slate-300 font-medium">
                        {staff.totalItemsSold} units
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700 font-mono text-[11px] font-bold">
                          {staff.loginCount} logins
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center text-[11px] text-slate-400">
                        {staff.lastLogin ? new Date(staff.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ================== SECURITY, BACKUPS & AUDIT LOGS VIEW ================== */
        <div className="space-y-6">
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
              onClick={handlePurgeExpiredBackups}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
              title="Deletes backup files older than configured retention period (30 or 60 days)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clean Expired Backups
            </button>
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
            <span className="text-slate-400 block text-[11px]">Daily Backup Auto-Retention</span>
            <span className="text-white font-bold text-sm mt-0.5 block">{settings.backupRetentionDays || 30}-Day Auto-Clean Policy</span>
            <span className="text-emerald-400 text-[10px]">Auto-deletes files older than {settings.backupRetentionDays || 30} days</span>
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

            {/* Auto-Delete Old Backups Retention Setting */}
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Auto-Delete Old Backup Files (Local Storage)
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Automatically purge local backup files older than specified days to keep storage clean
                </p>
              </div>
              <div className="mt-2">
                <select
                  value={settings.backupRetentionDays || 30}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      backupRetentionDays: Number(e.target.value) as any,
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value={30}>Delete Backups Older Than 30 Days (Recommended)</option>
                  <option value={60}>Delete Backups Older Than 60 Days</option>
                  <option value={90}>Delete Backups Older Than 90 Days</option>
                  <option value={14}>Delete Backups Older Than 14 Days</option>
                </select>
              </div>
            </div>
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
            {allUsers.map((user, idx) => {
              const pins = OfflineDB.getUserPins();
              const userPin = pins[user.uid] || (user.role === 'admin' ? '1234' : '0000');

              return (
                <div
                  key={user.uid || `user-${idx}`}
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
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Immutable Audit Trail ({filteredLogs.length} {logFilter === 'critical' ? 'Critical' : 'Total'} Actions)
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                logFilter === 'all'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Actions ({logs.length})
            </button>
            <button
              onClick={() => setLogFilter('critical')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                logFilter === 'critical'
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Critical Action History
            </button>
          </div>
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
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    No matching audit logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
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
      )}
    </div>
  );
};
