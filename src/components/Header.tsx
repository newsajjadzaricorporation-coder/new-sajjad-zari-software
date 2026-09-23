import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Settings,
  Cloud,
  Clock,
  Globe,
} from 'lucide-react';
import { UserProfile, ShopSettings } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useApp } from '../context/AppProvider';
import { useLanguage } from '../context/LanguageContext';
import { SyncDiagnostics } from './SyncDiagnostics';
import { NetworkHealthIndicator } from './NetworkHealthIndicator';
import { OfflineDebuggerModal } from './OfflineDebuggerModal';

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
  onOpenSettings?: () => void;
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
  onOpenSettings,
}) => {
  const {
    isOnline,
    firestoreStatus,
    isSyncing,
    lastSyncTime,
    isCheckingSync,
    pendingRecordsCount,
    checkSyncNow,
  } = useApp();
  const { language, toggleLanguage, t, isUrdu } = useLanguage();
  const { isInstallable, install } = usePWAInstall();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showOfflineDebugger, setShowOfflineDebugger] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isManualReSyncing, setIsManualReSyncing] = useState(false);

  const handleManualReSync = async () => {
    setIsManualReSyncing(true);
    try {
      await checkSyncNow();
    } finally {
      setIsManualReSyncing(false);
    }
  };

  const isSyncInProgress = isSyncing || isCheckingSync;
  const isServerSynced = isOnline && (firestoreStatus === 'connected' || firestoreStatus === 'offline_cache') && !isSyncInProgress;

  // Formatted last sync time string
  const formattedSyncTime = useMemo(() => {
    if (!lastSyncTime) return null;
    return lastSyncTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [lastSyncTime]);

  // Visual calculation for Firestore background sync queue & progress
  const syncProgressPercent = useMemo(() => {
    if (isSyncInProgress) {
      return 85;
    }
    if (!isOnline) {
      if (pendingRecordsCount === 0) return 100;
      return Math.max(15, Math.min(85, 100 - pendingRecordsCount * 12));
    }
    if (pendingRecordsCount > 0) {
      return Math.max(20, Math.min(90, 100 - pendingRecordsCount * 15));
    }
    return 100;
  }, [isSyncInProgress, isOnline, pendingRecordsCount]);

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
                  {t('retailWholesale', 'RETAIL & WHOLESALE')}
                </span>
              </div>
              <p className="font-urdu text-xs text-amber-400/90 leading-none mt-1">
                {settings.urduTitle}
              </p>
            </div>
          </div>

          {/* Firestore Background Sync Progress Bar & Queue Status Widget */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDiagnostics(true)}
            className="hidden md:flex flex-col justify-center px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-amber-500/40 transition cursor-pointer group min-w-[190px] max-w-[260px] shadow-sm"
            title={`Firebase Firestore Sync Status: ${
              isSyncInProgress
                ? 'Actively synchronizing background queue to Firestore...'
                : !isOnline
                ? `Offline mode: ${pendingRecordsCount} operations queued locally`
                : `100% Synced: Local database matches Firebase Firestore (${formattedSyncTime || 'Active'})`
            } • Click for Diagnostics`}
          >
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold mb-1">
              <span className="flex items-center gap-1.5 text-slate-300 truncate">
                <Cloud
                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                    isSyncInProgress
                      ? 'text-amber-400 animate-pulse'
                      : !isOnline
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}
                />
                <span className="truncate">Firestore Sync</span>
              </span>
              <span
                className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-extrabold ${
                  isSyncInProgress
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : !isOnline
                    ? pendingRecordsCount > 0
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                    : pendingRecordsCount > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {isSyncInProgress
                  ? `${pendingRecordsCount} Syncing...`
                  : pendingRecordsCount > 0
                  ? `${pendingRecordsCount} Queued`
                  : '0 Pending'}
              </span>
            </div>

            {/* Visual Progress Bar Track */}
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800/80 relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isSyncInProgress
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse'
                    : !isOnline
                    ? pendingRecordsCount > 0
                      ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                      : 'bg-slate-700'
                    : pendingRecordsCount > 0
                    ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${syncProgressPercent}%` }}
              />
              {isSyncInProgress && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
              )}
            </div>
          </motion.div>

          {/* Quick Action Badges & RBAC Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Floating Offline-First Sync Status Badge Indicator */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md shadow-lg transition-all cursor-pointer ${
                isSyncInProgress
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-amber-500/20 ring-1 ring-amber-400/30'
                  : !isOnline
                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-rose-500/20 ring-1 ring-rose-400/30'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-emerald-500/20 ring-1 ring-emerald-400/30'
              }`}
              title={
                isSyncInProgress
                  ? `Syncing... Reconciling local changes with Cloud Firestore • Click for Diagnostics`
                  : !isOnline
                  ? `Offline • Operating safely on local persistent storage. ${pendingRecordsCount} record(s) queued for sync. Click for Diagnostics`
                  : `Synced • All sales & inventory backed up locally & online (${formattedSyncTime || 'Active'}). Click for Diagnostics`
              }
            >
              {isSyncInProgress ? (
                <>
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="tracking-wide">Syncing...</span>
                </>
              ) : !isOnline ? (
                <>
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  <span className="tracking-wide">Offline</span>
                  {pendingRecordsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/30 text-rose-200 border border-rose-400/40 font-mono">
                      {pendingRecordsCount}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="tracking-wide">Synced</span>
                </>
              )}
            </motion.button>

            {/* Network Health Monitor & Proactive Ping/WebSocket Reconnect */}
            <NetworkHealthIndicator onOpenOfflineDebugger={() => setShowOfflineDebugger(true)} />

            {/* Header 'Attempt Re-Sync' Heartbeat Trigger */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleManualReSync}
              disabled={isManualReSyncing || isSyncInProgress}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-amber-300 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              title="Manually force database heartbeat check & cache verification"
            >
              <RefreshCw className={`w-3 h-3 text-amber-400 ${isManualReSyncing ? 'animate-spin' : ''}`} />
              <span>{isManualReSyncing ? 'Checking...' : 'Attempt Re-Sync'}</span>
            </motion.button>

            {/* Language Switcher Button (English / Urdu) */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-amber-300 shadow-sm cursor-pointer"
              title={language === 'en' ? 'اردو میں تبدیل کریں (Switch to Urdu)' : 'Switch to English'}
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span className="tracking-wide">{language === 'en' ? 'اردو' : 'English'}</span>
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

            {/* Day / Night Mode Toggle with Smooth CSS & Motion Cross-Fade */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.06 }}
              onClick={onToggleTheme}
              className={`relative p-2 rounded-xl border transition-colors duration-300 cursor-pointer flex items-center justify-center overflow-hidden ${
                theme === 'light'
                  ? 'bg-amber-100/90 text-amber-900 border-amber-300 shadow-sm hover:bg-amber-200'
                  : 'bg-slate-900 text-amber-400 border-slate-800 hover:border-slate-700 hover:text-amber-300'
              }`}
              title={
                theme === 'light'
                  ? 'Switch to Night Mode (Dark Theme) [Ctrl+Shift+D]'
                  : 'Switch to Day Mode (Light Theme) [Ctrl+Shift+D]'
              }
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === 'light' ? (
                  <motion.div
                    key="sun-theme"
                    initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="flex items-center justify-center"
                  >
                    <Sun className="w-4 h-4 text-amber-600" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon-theme"
                    initial={{ opacity: 0, rotate: 90, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: -90, scale: 0.6 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="flex items-center justify-center"
                  >
                    <Moon className="w-4 h-4 text-amber-400" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

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

            {/* Shop Settings Quick Button */}
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                title="Shop Settings & POS Preferences (Address, Receipts, Goals)"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

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
                      {allUsers.map((u, idx) => (
                        <button
                          key={u.uid || `user-${idx}`}
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

                    {onOpenSettings && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenSettings();
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-2 transition cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-amber-400" />
                        Shop Settings & POS Preferences
                      </button>
                    )}

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

      {/* Full-Width Visual Progress Bar along Header Bottom Border */}
      <div
        className="w-full bg-slate-900/60 h-1 overflow-hidden relative border-t border-slate-800/40"
        title={`Firestore Background Queue: ${
          isSyncInProgress
            ? 'Syncing changes to Firestore...'
            : pendingRecordsCount > 0
            ? `${pendingRecordsCount} changes queued in background`
            : 'Synchronized with Cloud Firestore'
        }`}
      >
        <div
          className={`h-full transition-all duration-500 ease-out ${
            isSyncInProgress
              ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse'
              : !isOnline
              ? pendingRecordsCount > 0
                ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                : 'bg-slate-700/60'
              : pendingRecordsCount > 0
              ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
              : 'bg-emerald-500/80'
          }`}
          style={{ width: `${syncProgressPercent}%` }}
        />
        {isSyncInProgress && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        )}
      </div>

      {/* Floating Firestore Diagnostics Modal */}
      <SyncDiagnostics
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
      />

      {/* Offline Debugger & Cache Storage Quota Modal */}
      <OfflineDebuggerModal
        isOpen={showOfflineDebugger}
        onClose={() => setShowOfflineDebugger(false)}
      />
    </header>
  );
};

