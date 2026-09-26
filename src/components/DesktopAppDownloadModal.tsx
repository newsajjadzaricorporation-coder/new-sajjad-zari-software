import React, { useState } from 'react';
import {
  Monitor,
  Download,
  CheckCircle2,
  X,
  ExternalLink,
  Wifi,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Globe,
  Archive,
  AlertTriangle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DesktopAppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopAppDownloadModal: React.FC<DesktopAppDownloadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedZipUrl, setCopiedZipUrl] = useState(false);
  const [copiedExeUrl, setCopiedExeUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedSharedUrl, setCopiedSharedUrl] = useState(false);

  const { isInstallable, install } = usePWAInstall();

  if (!isOpen) return null;

  const sharedAppUrl = 'https://ais-dev-3oxekguhnsu7h6oxyvwguu-401532134839.asia-east1.run.app';

  const currentOnlineUrl =
    typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
      ? window.location.origin
      : sharedAppUrl;

  const zipDownloadUrl = `${currentOnlineUrl}/api/download/zip`;
  const exeDownloadUrl = `${currentOnlineUrl}/api/download/exe`;
  const curlCommand = `curl -L -o SajjadZariPOS.zip "${zipDownloadUrl}"`;

  const handleCopyZipUrl = () => {
    navigator.clipboard.writeText(zipDownloadUrl);
    setCopiedZipUrl(true);
    setTimeout(() => setCopiedZipUrl(false), 2500);
  };

  const handleCopyExeUrl = () => {
    navigator.clipboard.writeText(exeDownloadUrl);
    setCopiedExeUrl(true);
    setTimeout(() => setCopiedExeUrl(false), 2500);
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2500);
  };

  const handleCopySharedUrl = () => {
    navigator.clipboard.writeText(sharedAppUrl);
    setCopiedSharedUrl(true);
    setTimeout(() => setCopiedSharedUrl(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/40">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Windows Desktop Application
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  Runs Online
                </span>
              </div>
              <p className="font-urdu text-xs text-amber-400/90 leading-relaxed">
                ونڈوز کمپیوٹر کے لیے ڈیسک ٹاپ سافٹ ویئر - براہ راست کلاؤڈ اور آف لائن سے منسلک
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-200">
          {/* 403 Forbidden Diagnostic Alert & Explanation */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  Why Did "403 Forbidden" Appear When Running the Software?
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  URLs starting with <code className="font-mono text-amber-300 bg-amber-950/60 px-1 py-0.5 rounded">ais-dev-...</code> are private Google AI Studio development containers. Google Cloud Run blocks external applications or standalone desktop launchers from opening them with:
                </p>
                <div className="font-mono text-[11px] text-red-300 bg-red-950/40 border border-red-800/40 rounded-lg p-2 my-2">
                  "403. That’s an error. We're sorry, but you do not have access to this page."
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  To run the software without any 403 errors, use either <strong>Method 1 (1-Click Browser Install - Recommended)</strong> or update <code className="font-mono text-amber-200">url.txt</code> next to the .exe with your Public Shared URL.
                </p>
              </div>
            </div>
          </div>

          {/* METHOD 1: 1-Click Desktop App (PWA) - RECOMMENDED */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-2 border-emerald-500/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  1
                </span>
                <span className="text-sm font-black text-white">
                  METHOD 1: Install Directly as Desktop App (Recommended)
                </span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Zero Setup • No 403 Error
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Install the app directly from your browser to your Windows Desktop and Start Menu. It creates a dedicated desktop window without browser tabs or address bars, supports thermal printing, and works 100% seamlessly.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              {isInstallable ? (
                <button
                  type="button"
                  onClick={install}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  Install Desktop App Now
                </button>
              ) : (
                <div className="text-xs text-slate-300 bg-slate-950/80 border border-slate-800 rounded-xl p-3 w-full flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white">How to Install in 2 Seconds:</span>
                    <ol className="list-decimal list-inside space-y-1 text-slate-300 mt-1">
                      <li>In Google Chrome or Microsoft Edge, look at the right side of the address bar.</li>
                      <li>Click the <strong className="text-white">"Install app"</strong> icon (or menu ⋮ &gt; "Save and share" &gt; "Install New Sajjad Zari Corporation").</li>
                      <li>Click <strong className="text-white">Install</strong>. A desktop shortcut will be placed on your Windows desktop!</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* METHOD 2: Windows Executable (.exe) */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  2
                </span>
                <span className="text-sm font-black text-white">
                  METHOD 2: Windows Executable (.exe) &amp; ZIP Package
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                Native x64 Windows Launcher
              </span>
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Direct EXE Download */}
              <a
                href="/api/download/exe"
                download="SajjadZariPOS.exe"
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/20 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-950/20 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 text-slate-950 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black">Download .EXE File</div>
                    <div className="text-[11px] text-slate-900/80 font-medium">
                      SajjadZariPOS.exe (Fixed &amp; Updated)
                    </div>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-950/20 text-slate-950 font-extrabold uppercase">
                  Fast
                </span>
              </a>

              {/* ZIP Package Download */}
              <a
                href="/api/download/zip"
                download="SajjadZariPOS-Windows.zip"
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-750 hover:border-amber-500/40 text-white font-bold transition-all shadow-md group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-700/60 flex items-center justify-center shrink-0">
                    <Archive className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold">Download ZIP Package</div>
                    <div className="text-[11px] text-slate-400 font-normal">
                      Includes .exe + url.txt + Instructions
                    </div>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-medium">
                  ZIP
                </span>
              </a>
            </div>

            {/* Quick Setup Instructions for SajjadZariPOS.exe */}
            <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800 space-y-2 text-xs text-slate-300">
              <h5 className="font-bold text-amber-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                How to Run SajjadZariPOS.exe on your Windows PC:
              </h5>
              <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                <li>
                  Extract the ZIP file or place <strong className="text-white">SajjadZariPOS.exe</strong> in a folder on your computer.
                </li>
                <li>
                  In Google AI Studio, click the <strong className="text-white">"Share"</strong> button at the top to activate your Public Shared URL.
                </li>
                <li>
                  Open <code className="font-mono text-amber-200">url.txt</code> in Notepad and make sure your Public Shared URL or local URL is entered.
                </li>
                <li>
                  Double-click <strong className="text-white">SajjadZariPOS.exe</strong>. (Tip: Hold <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">SHIFT</kbd> on startup if you want to open url.txt in Notepad).
                </li>
              </ul>
            </div>
          </div>

          {/* Advantages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
              <Globe className="w-4 h-4 text-amber-400 mb-1.5" />
              <div className="text-xs font-bold text-white mb-0.5">Always Online &amp; Synced</div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Directly connects to Firebase Firestore. Multi-terminal inventory and sales stay synchronized across all branches.
              </p>
            </div>
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1.5" />
              <div className="text-xs font-bold text-white mb-0.5">Always Up to Date</div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Whenever new updates, features, or fixes are pushed online, the desktop app opens the latest live version automatically.
              </p>
            </div>
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
              <Monitor className="w-4 h-4 text-sky-400 mb-1.5" />
              <div className="text-xs font-bold text-white mb-0.5">Dedicated App Window</div>
              <p className="text-[11px] text-slate-400 leading-normal">
                No browser clutter or accidentally closed tabs. Built for cashiers with full thermal printer and barcode scanner support.
              </p>
            </div>
          </div>

          {/* Direct Links for Browser / Terminal */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
              <span className="text-slate-200 font-bold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                Direct Download Links (Option 1)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Direct Browser / Download Manager URLs
              </span>
            </div>

            {/* ZIP Direct Download Link */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-amber-400" />
                  Direct ZIP Package URL (.zip)
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={zipDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-white font-medium flex items-center gap-1 text-[11px] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyZipUrl}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    {copiedZipUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="font-mono text-[11px] text-amber-300 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 break-all select-all flex items-center justify-between">
                <span>{zipDownloadUrl}</span>
              </div>
            </div>

            {/* EXE Direct Download Link */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Direct Executable URL (.exe)
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={exeDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-white font-medium flex items-center gap-1 text-[11px] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyExeUrl}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    {copiedExeUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="font-mono text-[11px] text-slate-300 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 break-all select-all">
                {exeDownloadUrl}
              </div>
            </div>

            {/* Public Shared URL for url.txt */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  Public Shared App URL (for url.txt)
                </span>
                <button
                  type="button"
                  onClick={handleCopySharedUrl}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  {copiedSharedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Shared URL
                    </>
                  )}
                </button>
              </div>
              <div className="font-mono text-[11px] text-sky-300 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 break-all select-all">
                {sharedAppUrl}
              </div>
            </div>

            {/* Terminal Command */}
            <div className="pt-2 border-t border-slate-850">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[11px] text-slate-400">Terminal / Command Prompt (curl):</span>
                <button
                  type="button"
                  onClick={handleCopyCurl}
                  className="text-slate-400 hover:text-slate-200 text-[10px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedCurl ? 'Copied' : 'Copy command'}
                </button>
              </div>
              <div className="font-mono text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800 break-all select-all">
                {curlCommand}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Native 64-bit Windows Executable • Windows 10 &amp; 11 Compatible
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
