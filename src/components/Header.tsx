import React, { useState } from 'react';
import {
  Sparkles,
  Wifi,
  WifiOff,
  Bluetooth,
  Download,
  Shield,
  UserCheck,
  Coins,
  Volume2,
  VolumeX,
  Database,
  CheckCircle2,
  RefreshCw,
  Server,
  X,
  Info,
  Layers,
  LogOut,
  Lock,
  ChevronDown,
  User,
  KeyRound,
  Sun,
  Moon,
} from 'lucide-react';
import { UserProfile, ShopSettings } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useApp } from '../context/AppProvider';

interface HeaderProps {
  currentUser: UserProfile;
  onSwitchUser: (user: UserProfile) => void;
  allUsers: UserProfile[];
  settings: ShopSettings;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenClosingModal: () => void;
  onToggleSound: () => void;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onLockTerminal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  allUsers,
  settings,
  theme,
  onToggleTheme,
  onOpenClosingModal,
  onToggleSound,
  onOpenLoginModal,
  onLogout,
  onLockTerminal,
}) => {
  const {
    isOnline,
    firestoreStatus,
    isSyncing,
    lastSyncTime,
    isCheckingSync,
    checkSyncNow,
  } = useApp();
  const { isInstallable, install } = usePWAInstall();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isSyncInProgress = isSyncing || isCheckingSync;
  const isServerSynced = isOnline && (firestoreStatus === 'connected' || firestoreStatus === 'offline_cache') && !isSyncInProgress;

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-800 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/40 shrink-0">
              <span className="text-slate-950 font-black text-lg">SZ</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
                  {settings.shopName}
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  RETAIL & WHOLESALE
                </span>
              </div>
              <p className="font-urdu text-xs text-amber-400/90 leading-none mt-1">
                {settings.urduTitle}
              </p>
            </div>
          </div>

          {/* Quick Action Badges & RBAC Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Interactive Firestore Sync & Diagnostic Status Badge */}
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer hover:opacity-90 ${
                isSyncInProgress
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
                  : !isOnline
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50'
              }`}
              title="Click to inspect Firestore cloud sync & local cache diagnostic details"
            >
              {isSyncInProgress ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="hidden sm:inline">Syncing...</span>
                  <span className="sm:hidden">Sync</span>
                </>
              ) : !isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Offline (Cache Active)</span>
                  <span className="sm:hidden">Offline</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                  <span className="hidden sm:inline">Cache Synced</span>
                  <span className="sm:hidden">Synced</span>
                </>
              )}
            </button>

            {/* PWA Install Button */}
            {isInstallable && (
              <button
                onClick={install}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
            )}

            {/* Day / Night Mode Toggle */}
            <button
              onClick={onToggleTheme}
              className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                theme === 'light'
                  ? 'bg-amber-100/90 text-amber-900 border-amber-300/80 shadow-sm hover:bg-amber-200'
                  : 'bg-slate-900 text-amber-400 border-slate-800 hover:border-slate-700 hover:text-amber-300'
              }`}
              title={
                theme === 'light'
                  ? 'Switch to Night Mode (Dark Theme) [Ctrl+Shift+D]'
                  : 'Switch to Day Mode (Light Theme) [Ctrl+Shift+D]'
              }
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-600 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Sound Toggle */}
            <button
              onClick={onToggleSound}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition cursor-pointer"
              title={settings.enableSoundEffects ? 'Mute Beep Sounds' : 'Enable Beep Sounds'}
            >
              {settings.enableSoundEffects ? (
                <Volume2 className="w-4 h-4 text-amber-400" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {/* Daily Closing Z-Report Quick Button */}
            <button
              onClick={onOpenClosingModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition"
              title="Daily Cash Closing & Z-Report"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Daily Closing</span>
              <span className="sm:hidden">Z-Report</span>
            </button>

            {/* Lock Terminal Quick Button */}
            <button
              onClick={onLockTerminal}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
              title="Lock POS Terminal (Shift Lock)"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* User Profile & Auth Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-xl p-1.5 sm:px-2.5 transition text-left cursor-pointer"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    currentUser.role === 'admin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-100 max-w-[90px] truncate">
                      {currentUser.displayName?.split(' ')[0] || 'User'}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-1 py-0.2 rounded ${
                        currentUser.role === 'admin'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* User Dropdown Flyout */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/60">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          currentUser.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">
                          {currentUser.displayName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Switch User Selection */}
                  <div className="px-1 py-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Switch User Profile
                    </label>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {allUsers.map((u) => (
                        <button
                          key={u.uid}
                          onClick={() => {
                            onSwitchUser(u);
                            setShowUserMenu(false);
                          }}
                          className={`w-full p-1.5 rounded-lg text-left text-xs flex items-center justify-between transition ${
                            u.uid === currentUser.uid
                              ? 'bg-amber-500/15 text-amber-300 font-semibold'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{u.displayName}</span>
                          <span className="text-[9px] uppercase font-bold text-slate-400">
                            {u.role}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-1 space-y-1">
                    <button
                      onClick={() => {
                        onToggleTheme();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {theme === 'light' ? (
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <Moon className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>Appearance Theme</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase">
                        {theme === 'light' ? 'Day Mode' : 'Night Mode'}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenLoginModal();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-2 transition"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      Switch Account / PIN Login
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLockTerminal();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-2 transition"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      Lock Terminal (Shift Lock)
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl flex items-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-400" />
                      Log Out (End Session)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick 1-Click Logout Icon Button */}
            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 transition cursor-pointer"
              title="Log Out of POS Terminal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Firestore Diagnostics Modal / Flyout */}
      {showDiagnostics && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Firestore Sync & Cache Diagnostics</h3>
              </div>
              <button
                onClick={() => setShowDiagnostics(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Status Overview Card */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isServerSynced
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : isOnline
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isServerSynced ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Database className="w-5 h-5 text-blue-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-white">
                      {isServerSynced
                        ? 'Server & Local Cache In Sync'
                        : isOnline
                        ? 'Local Cache Active (Fast Offline-First)'
                        : 'Offline Mode (Local Storage Synced)'}
                    </p>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {isServerSynced
                        ? 'Connected to Cloud Firestore live server database'
                        : 'Local IndexedDB cache preserving all transactions safely'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => checkSyncNow()}
                  disabled={isCheckingSync}
                  className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 transition disabled:opacity-50 shrink-0"
                  title="Force Sync Check"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingSync ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Technical Specifications */}
              <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Database Engine</span>
                  <span className="font-mono font-medium text-slate-200">Google Cloud Firestore</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Firebase Project ID</span>
                  <span className="font-mono font-medium text-amber-300">new-sajjad-zari-corporation</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Cloud Region</span>
                  <span className="font-mono font-medium text-slate-200">asia-southeast1</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Cache Persistence</span>
                  <span className="font-mono font-medium text-emerald-400">IndexedDB + Multi-Tab</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Network State</span>
                  <span className={`font-semibold ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isOnline ? 'Online (Connected)' : 'Offline (Disconnected)'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Last Verified Sync</span>
                  <span className="font-mono text-slate-300">
                    {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'At startup'}
                  </span>
                </div>
              </div>

              {/* Security & Reliability Summary */}
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 flex items-start gap-2 text-[11px] text-slate-300">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Transactions and Khata records written offline are queued in persistent browser storage and automatically reconciled upon server connection without data loss.
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setShowDiagnostics(false)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition"
                >
                  Close Diagnostics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

