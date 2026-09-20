import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Trash2, Database, UploadCloud } from 'lucide-react';

export interface ActionLoaderState {
  isOpen: boolean;
  title: string;
  description?: string;
  currentCount: number;
  totalCount: number;
  status: 'idle' | 'running' | 'completed' | 'error';
  errorMessage?: string;
  actionIcon?: 'delete' | 'database' | 'cloud' | 'generic';
}

interface ActionLoaderModalProps {
  state: ActionLoaderState;
  onClose?: () => void;
}

export const ActionLoaderModal: React.FC<ActionLoaderModalProps> = ({ state, onClose }) => {
  if (!state.isOpen) return null;

  const percentage =
    state.totalCount > 0 ? Math.min(100, Math.round((state.currentCount / state.totalCount) * 100)) : 0;

  const renderIcon = () => {
    if (state.status === 'completed') {
      return <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />;
    }
    if (state.status === 'error') {
      return <AlertCircle className="w-8 h-8 text-red-400 animate-pulse" />;
    }
    switch (state.actionIcon) {
      case 'delete':
        return <Trash2 className="w-7 h-7 text-red-400 animate-pulse" />;
      case 'cloud':
        return <UploadCloud className="w-7 h-7 text-amber-400 animate-pulse" />;
      default:
        return <Database className="w-7 h-7 text-amber-400 animate-pulse" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 shadow-inner">
          {renderIcon()}
        </div>

        <h3 className="text-lg font-bold text-white mb-1">{state.title}</h3>
        {state.description && <p className="text-xs text-slate-400 mb-4">{state.description}</p>}

        {/* Progress Bar Container */}
        <div className="my-4">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1.5 px-1">
            <span className="flex items-center gap-1.5">
              {state.status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />}
              {state.status === 'running' ? 'Processing Records...' : state.status === 'completed' ? 'Finished' : 'Status'}
            </span>
            <span className="font-mono text-amber-300">
              {state.currentCount} / {state.totalCount} ({percentage}%)
            </span>
          </div>

          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                state.status === 'error'
                  ? 'bg-red-500'
                  : state.status === 'completed'
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-amber-500 to-amber-300'
              }`}
              style={{ width: `${Math.max(4, percentage)}%` }}
            />
          </div>
        </div>

        {/* Error message if any */}
        {state.status === 'error' && state.errorMessage && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 text-left">
            <p className="font-semibold mb-0.5">Operation Notice:</p>
            <p>{state.errorMessage}</p>
          </div>
        )}

        {/* Close Button when done or failed */}
        {(state.status === 'completed' || state.status === 'error') && (
          <div className="mt-5">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-xl text-xs font-bold transition shadow"
            >
              Close Notification
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
