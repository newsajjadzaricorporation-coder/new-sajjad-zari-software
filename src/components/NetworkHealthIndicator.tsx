import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Activity,
  AlertCircle,
  Radio,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { NetworkService, NetworkHealthState } from '../services/network';

interface NetworkHealthIndicatorProps {
  onOpenOfflineDebugger?: () => void;
}

export const NetworkHealthIndicator: React.FC<NetworkHealthIndicatorProps> = ({
  onOpenOfflineDebugger,
}) => {
  const [health, setHealth] = useState<NetworkHealthState>(() => NetworkService.getState());
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const unsubscribe = NetworkService.subscribe((updated) => {
      setHealth(updated);
    });
    return () => unsubscribe();
  }, []);

  const handleReconnect = () => {
    setIsReconnecting(true);
    NetworkService.ping().then(() => {
      setTimeout(() => {
        NetworkService.hardReload();
      }, 300);
    });
  };

  const hasWsIssue = health.hasWebSocketError || health.wsStatus === 'disconnected';

  return (
    <div className="flex items-center gap-1.5">
      {/* WebSocket Issue Detected Toast / Banner with Reconnect Trigger */}
      <AnimatePresence>
        {hasWsIssue && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 10 }}
            className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="hidden md:inline text-[11px]">HMR Dev Link Dropped</span>
            <button
              type="button"
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="flex items-center gap-1 px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-[10px] font-black tracking-wide uppercase transition cursor-pointer disabled:opacity-50"
              title="Perform clean reload to reconnect WebSocket & dev server"
            >
              <RotateCcw className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'Reconnecting...' : 'Reconnect'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Network Latency & Connectivity Pill Indicator */}
      <button
        type="button"
        onClick={onOpenOfflineDebugger}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
          !health.isOnline
            ? 'bg-rose-950/70 border-rose-500/40 text-rose-300 hover:bg-rose-900/80'
            : health.latencyMs !== null && health.latencyMs > 400
            ? 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/70'
            : 'bg-slate-900 border-slate-800 text-emerald-400 hover:border-emerald-500/40'
        }`}
        title={`Network: ${health.isOnline ? 'Online' : 'Offline'} • Ping: ${
          health.latencyMs !== null ? `${health.latencyMs}ms` : 'N/A'
        } • Click for Offline Debugger`}
      >
        {!health.isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[11px] font-bold">Offline</span>
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[11px] text-slate-300">
              {health.latencyMs !== null ? `${health.latencyMs}ms` : 'Live'}
            </span>
          </>
        )}
      </button>
    </div>
  );
};
