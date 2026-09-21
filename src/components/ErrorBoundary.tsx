import React, { ErrorInfo, ReactNode } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Copy,
  Check,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { OfflineDB } from '../services/db';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showReportDetails: boolean;
  diagnosticPayload: string | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showReportDetails: false,
      diagnosticPayload: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error(' [ErrorBoundary Caught Runtime Error]:', error);
    console.error(' Component Stack Trace:', errorInfo.componentStack);

    // Build comprehensive diagnostic report
    try {
      const products = OfflineDB.getProducts();
      const sales = OfflineDB.getSales();
      const customers = OfflineDB.getCustomers();
      const currentUser = OfflineDB.getCurrentUser();
      const auditLogs = OfflineDB.getAuditLogs().slice(0, 8);

      const report = {
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        componentStack: errorInfo.componentStack.trim(),
        appState: {
          currentUser: currentUser ? { uid: currentUser.uid, email: currentUser.email, role: currentUser.role } : null,
          isOnline: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        },
        offlineDB: {
          productsCount: products.length,
          salesCount: sales.length,
          customersCount: customers.length,
          storageKeys: typeof localStorage !== 'undefined' ? Object.keys(localStorage).filter(k => k.startsWith('nszc_')) : [],
        },
        recentAuditLogs: auditLogs,
      };

      this.setState({ diagnosticPayload: JSON.stringify(report, null, 2) });
    } catch {
      this.setState({
        diagnosticPayload: JSON.stringify({
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: errorInfo.componentStack,
        }, null, 2),
      });
    }
  }

  handleReload = (): void => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    window.location.reload();
  };

  handleAttemptRecovery = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null, diagnosticPayload: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleCopyReport = () => {
    if (this.state.diagnosticPayload) {
      navigator.clipboard.writeText(this.state.diagnosticPayload);
      this.setState({ copied: true });
      setTimeout(() => {
        this.setState({ copied: false });
      }, 2500);
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {this.props.fallbackTitle || 'Application Error Detected'}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                The POS workspace encountered an unexpected rendering error. All customer, sales,
                and inventory records in your local database remain safe and intact.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-left overflow-hidden">
                <div className="text-[11px] font-mono text-red-400 font-semibold mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </div>
                {this.state.errorInfo && (
                  <pre className="text-[10px] font-mono text-slate-500 max-h-24 overflow-y-auto whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack.trim()}
                  </pre>
                )}
              </div>
            )}

            {/* Diagnostic Report Drawer / Copy Feature */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Admin Diagnostic & OfflineDB Crash Report
                </span>
                <button
                  type="button"
                  onClick={this.handleCopyReport}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition cursor-pointer"
                >
                  {this.state.copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied Report!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Report String</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showReportDetails: !prev.showReportDetails }))}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                {this.state.showReportDetails ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Hide detailed payload</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>View raw JSON diagnostic payload</span>
                  </>
                )}
              </button>

              {this.state.showReportDetails && this.state.diagnosticPayload && (
                <pre className="text-[9px] font-mono text-slate-400 bg-slate-900 p-2.5 rounded-lg max-h-40 overflow-y-auto border border-slate-800 whitespace-pre-wrap select-all">
                  {this.state.diagnosticPayload}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleAttemptRecovery}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Attempt Recovery
              </button>
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again (Reload)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
