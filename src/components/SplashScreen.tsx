import React from 'react';
import { ShoppingBag, Loader2, Database, ShieldCheck } from 'lucide-react';

interface SplashScreenProps {
  statusMessage?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  statusMessage = 'Synchronizing local databases & offline cache...',
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -top-20 -right-20" />
      <div className="absolute w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -bottom-20 -left-20" />

      <div className="max-w-md w-full flex flex-col items-center text-center space-y-6 z-10">
        {/* Brand Icon with Pulse */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-2xl shadow-amber-500/20">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-950 border-2 border-amber-500 flex items-center justify-center text-amber-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </div>
        </div>

        {/* Brand Titles */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tight">
            NEW SAJJAD ZARI CORPORATION
          </h1>
          <p className="text-sm font-semibold text-amber-400 font-serif">
            نیو سجاد زری کارپوریشن
          </p>
          <p className="text-xs text-slate-400">
            Enterprise Retail POS, Multi-Tab Khata & Offline Stock Terminal
          </p>
        </div>

        {/* Loading Spinner & Status Badge */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Database className="w-4 h-4 text-amber-400" />
              {statusMessage}
            </span>
            <span className="font-mono text-[11px] text-amber-400 font-semibold">Active</span>
          </div>

          {/* High-Contrast Progress Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
            <div className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 w-full animate-pulse" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> AES Cache Protected
            </span>
            <span>v2.4.0 High-Speed</span>
          </div>
        </div>

        {/* Skeleton Preview representation */}
        <div className="w-full grid grid-cols-3 gap-2 opacity-30 pointer-events-none">
          <div className="h-10 rounded-xl bg-slate-800 animate-pulse" />
          <div className="h-10 rounded-xl bg-slate-800 animate-pulse" />
          <div className="h-10 rounded-xl bg-slate-800 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
