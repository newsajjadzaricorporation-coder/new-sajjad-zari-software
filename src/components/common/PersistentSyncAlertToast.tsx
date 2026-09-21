import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, RefreshCw, HardDrive, ShieldAlert, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppProvider';

export const PersistentSyncAlertToast: React.FC = () => {
  const {
    showSyncFailureModal,
    setShowSyncFailureModal,
    syncFailureDetails,
    pendingRecordsCount,
    firestoreStatus,
    isOnline,
    checkSyncNow,
    isCheckingSync,
  } = useApp();

  // Show persistent toast if sync failure, offline error with pending records, or sync modal requested
  const isConflictOrError =
    showSyncFailureModal ||
    (firestoreStatus === 'error' && pendingRecordsCount > 0) ||
    Boolean(syncFailureDetails);

  if (!isConflictOrError) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-5 right-5 z-40 max-w-md w-full bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl shadow-2xl backdrop-blur-xl p-4 overflow-hidden"
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Firestore Cache Sync Alert
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {pendingRecordsCount} Pending
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-1 line-clamp-2">
              {syncFailureDetails ||
                'Persistent local cache encounter synchronization conflict with cloud Firestore or offline storage limit reached.'}
            </p>

            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => checkSyncNow()}
                disabled={isCheckingSync}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingSync ? 'animate-spin' : ''}`} />
                <span>Retry Sync</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSyncFailureModal(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
              >
                <span>Resolve Conflict</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
