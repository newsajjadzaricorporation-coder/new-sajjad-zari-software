import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  RefreshCw,
  Download,
  CheckCircle2,
  X,
  HardDrive,
  CloudOff,
  ShieldCheck,
  ChevronRight,
  Database,
} from 'lucide-react';
import { useApp } from '../../context/AppProvider';
import { OfflineDB } from '../../services/db';
import { useLanguage } from '../../context/LanguageContext';

export const SyncReconciliationFailureModal: React.FC = () => {
  const {
    showSyncFailureModal,
    setShowSyncFailureModal,
    syncFailureDetails,
    checkSyncNow,
    pendingRecordsCount,
    isOnline,
  } = useApp();
  const { t, isUrdu } = useLanguage();

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<'success' | 'failed' | null>(null);
  const [showManualOptions, setShowManualOptions] = useState(false);
  const [isBackupDownloaded, setIsBackupDownloaded] = useState(false);

  if (!showSyncFailureModal) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryResult(null);
    try {
      const success = await checkSyncNow();
      if (success) {
        setRetryResult('success');
        setTimeout(() => {
          setShowSyncFailureModal(false);
          setRetryResult(null);
        }, 1500);
      } else {
        setRetryResult('failed');
      }
    } catch {
      setRetryResult('failed');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleExportBackup = () => {
    const jsonStr = OfflineDB.exportFullDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NSZC_Emergency_Reconciliation_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setIsBackupDownloaded(true);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border-b border-amber-500/20 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {t('reconciliationFailureTitle', 'Sync Reconciliation Issue Detected')}
                </h3>
                <p className="text-xs text-amber-400/90 font-medium">
                  {isUrdu ? 'کلاؤڈ ڈیٹا ہم آہنگی میں دشواری' : 'OfflineDB ↔ Cloud Firestore Out-of-Sync'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSyncFailureModal(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 text-xs">
            <p className="text-slate-300 leading-relaxed">
              {syncFailureDetails ||
                t(
                  'reconciliationFailureDesc',
                  'The app encountered an issue while reconciling local OfflineDB state with Cloud Firestore. Your local database remains intact and safely preserved on this terminal.'
                )}
            </p>

            {/* Diagnostic Box */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-amber-400" />
                  Local Pending Records:
                </span>
                <span className="px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {pendingRecordsCount} {t('pendingRecords', 'records waiting')}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                  Network State:
                </span>
                <span className={isOnline ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                  {isOnline ? 'Connected to Internet (Cloud Pending)' : 'Offline / Restricted Gateway'}
                </span>
              </div>
            </div>

            {/* Retry Feedback */}
            {retryResult === 'success' && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Reconciliation successful! Connected to Firestore.</span>
              </div>
            )}
            {retryResult === 'failed' && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Reconnection attempt failed. You can resolve manually below.</span>
              </div>
            )}

            {/* Manual Resolution Drawer */}
            {showManualOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-3"
              >
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Manual Conflict & Recovery Options:
                </span>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex items-center justify-between p-2.5 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-700 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="font-bold text-slate-200 block">Download Emergency JSON Backup</span>
                        <span className="text-[10px] text-slate-400">Save all offline sales & inventory to disk</span>
                      </div>
                    </div>
                    {isBackupDownloaded ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      OfflineDB.clearPendingSyncQueue();
                      setShowSyncFailureModal(false);
                    }}
                    className="flex items-center justify-between p-2.5 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-700 text-left transition cursor-pointer text-slate-400 hover:text-amber-300"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="font-bold block">Reset Pending Sync Queue</span>
                        <span className="text-[10px]">Mark current records as already reconciled locally</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowManualOptions(!showManualOptions)}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              {showManualOptions ? 'Hide Manual Options' : t('resolveManually', 'Resolve Manually')}
            </button>

            <button
              type="button"
              disabled={isRetrying}
              onClick={handleRetry}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold transition shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying...' : t('retrySync', 'Retry Sync')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSyncFailureModal(false)}
              className="w-full sm:w-auto px-3 py-2 text-slate-400 hover:text-white rounded-xl text-xs font-medium transition cursor-pointer"
            >
              {t('continueOffline', 'Continue Offline')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
