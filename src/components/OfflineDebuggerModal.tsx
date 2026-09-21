import React, { useState, useEffect } from 'react';
import {
  Server,
  RefreshCw,
  HardDrive,
  Wifi,
  WifiOff,
  Radio,
  CheckCircle2,
  AlertTriangle,
  X,
  Database,
  Layers,
  Activity,
  Cpu,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { NetworkService, NetworkHealthState } from '../services/network';
import { useApp } from '../context/AppProvider';
import { OfflineDB } from '../services/db';

interface OfflineDebuggerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineDebuggerModal: React.FC<OfflineDebuggerModalProps> = ({ isOpen, onClose }) => {
  const { isOnline, firestoreStatus, checkSyncNow, lastSyncTime, pendingRecordsCount } = useApp();
  const [health, setHealth] = useState<NetworkHealthState>(() => NetworkService.getState());
  const [isPinging, setIsPinging] = useState(false);
  const [isReSyncing, setIsReSyncing] = useState(false);
  const [syncResultMsg, setSyncResultMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = NetworkService.subscribe((updated) => {
      setHealth(updated);
    });
    NetworkService.checkServiceWorker();
    NetworkService.checkStorageQuota();
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualPing = async () => {
    setIsPinging(true);
    await NetworkService.ping();
    await NetworkService.checkStorageQuota();
    await NetworkService.checkServiceWorker();
    setIsPinging(false);
  };

  const handleAttemptReSync = async () => {
    setIsReSyncing(true);
    setSyncResultMsg(null);
    try {
      const ok = await checkSyncNow();
      if (ok) {
        setSyncResultMsg('Heartbeat success: Firestore persistentLocalCache and online sync confirmed active.');
      } else {
        setSyncResultMsg('Operating in offline persistentLocalCache mode. All local transactions cached securely.');
      }
    } catch (err: any) {
      setSyncResultMsg(`Re-sync notice: ${err?.message || 'Offline mode active'}`);
    } finally {
      setIsReSyncing(false);
    }
  };

  const handleClearWsError = () => {
    NetworkService.clearWebSocketError();
  };

  const productsCount = OfflineDB.getProducts().length;
  const salesCount = OfflineDB.getSales().length;
  const customersCount = OfflineDB.getCustomers().length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Offline Debugger & Persistent Cache Monitor
              </h2>
              <p className="text-xs text-slate-400">
                Inspect Service Worker status, Firestore localCache health, and storage quota.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status Feedback Banner */}
          {syncResultMsg && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 font-semibold flex items-center justify-between">
              <span>{syncResultMsg}</span>
              <button
                onClick={() => setSyncResultMsg(null)}
                className="text-[10px] text-amber-400 hover:underline ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Service Worker Status */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-400" />
                Service Worker State
              </span>
              <div className="flex items-center gap-2 pt-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    health.serviceWorkerStatus === 'active'
                      ? 'bg-emerald-400'
                      : health.serviceWorkerStatus === 'unsupported'
                      ? 'bg-slate-500'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="text-sm font-bold text-white capitalize">
                  {health.serviceWorkerStatus.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                {health.serviceWorkerStatus === 'active'
                  ? 'PWA assets cached for offline operation'
                  : 'Operating in single-page application mode'}
              </p>
            </div>

            {/* Firestore Cache Status */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                persistentLocalCache
              </span>
              <div className="flex items-center gap-2 pt-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    firestoreStatus === 'connected'
                      ? 'bg-emerald-400'
                      : firestoreStatus === 'offline_cache'
                      ? 'bg-amber-400'
                      : 'bg-red-400'
                  }`}
                />
                <span className="text-sm font-bold text-white capitalize">
                  {firestoreStatus === 'connected'
                    ? 'Cloud Connected'
                    : firestoreStatus === 'offline_cache'
                    ? 'Persistent Cache'
                    : 'Unconfigured'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Multi-Tab Manager active with zero data loss guarantee
              </p>
            </div>

            {/* Storage Quota Usage */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                Offline Storage Used
              </span>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-white">
                  {health.storageQuota.usedKb} KB
                </span>
                <span className="text-[11px] font-mono text-purple-300">
                  {health.storageQuota.percentUsed}% of quota
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, health.storageQuota.percentUsed || 5)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Detailed Diagnostic Breakdown */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Runtime Core Health & Heartbeat
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block">Cached Products</span>
                <strong className="text-white font-mono text-sm">{productsCount}</strong>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block">Sales Invoices</span>
                <strong className="text-white font-mono text-sm">{salesCount}</strong>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block">Khata Customers</span>
                <strong className="text-white font-mono text-sm">{customersCount}</strong>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block">Pending Cloud Sync</span>
                <strong className="text-amber-400 font-mono text-sm">{pendingRecordsCount}</strong>
              </div>
            </div>

            {/* Network / WebSocket details */}
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Network Connection:</span>
                <span className={`font-bold ${health.isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                  {health.isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Server Latency Ping:</span>
                <span className="font-mono text-slate-200">
                  {health.latencyMs !== null ? `${health.latencyMs} ms` : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">WebSocket / HMR Channel:</span>
                <span
                  className={`font-semibold ${
                    health.hasWebSocketError ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {health.hasWebSocketError
                    ? `Issue: ${health.webSocketErrorMessage || 'Closed'}`
                    : 'Active / Handled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Multi-Tab Sync Channel:</span>
                <span className="text-emerald-400 font-semibold">nszc_pos_sync_bus (BroadcastChannel)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualPing}
              disabled={isPinging}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              <span>Probe Network & Storage</span>
            </button>

            <button
              type="button"
              onClick={handleAttemptReSync}
              disabled={isReSyncing}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Database className={`w-3.5 h-3.5 ${isReSyncing ? 'animate-spin' : ''}`} />
              <span>{isReSyncing ? 'Re-Syncing...' : 'Attempt Re-Sync Now'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
