import React, { useState } from 'react';
import {
  HelpCircle,
  Laptop,
  Printer,
  Copy,
  Check,
  Download,
  Terminal,
  FileCode,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { copyToClipboard } from '../../utils/clipboard';

export const UserGuideModule: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { isInstallable, install } = usePWAInstall();

  const handleCopy = async (text: string, key: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedSection(key);
      setTimeout(() => setCopiedSection(null), 2500);
    }
  };

  const electronJsCode = `// electron.js - New Sajjad Zari POS Desktop Main Process
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: "New Sajjad Zari Corporation - Retail POS",
    icon: path.join(__dirname, 'dist/icon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    autoHideMenuBar: true,
  });

  // Load the production build
  win.loadFile(path.join(__dirname, 'dist/index.html'));

  // Optional: Kiosk mode for counter terminal
  // win.setKiosk(true);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});`;

  const packageJsonSnippet = `"scripts": {
  "build": "vite build",
  "electron": "electron .",
  "dist": "vite build && electron-builder --win"
},
"build": {
  "appId": "com.sajjadzari.pos",
  "productName": "New Sajjad Zari POS",
  "win": {
    "target": ["nsis", "portable"],
    "icon": "public/icon.svg"
  }
}`;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-slate-900 text-slate-200">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-amber-400" />
          POS User Manual & Desktop Windows .EXE Packaging Guide
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Everything you need to operate New Sajjad Zari Corporation POS and deploy as a native Windows application
        </p>
      </div>

      {/* Quick PWA Installation Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">1-Click Desktop PWA App</h3>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            This POS system is a full Progressive Web App. You can install it straight to your desktop
            or cash register screen with no extra installation files required!
          </p>
        </div>
        {isInstallable && (
          <button
            onClick={install}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 shrink-0"
          >
            <Download className="w-4 h-4" /> Install Desktop App Now
          </button>
        )}
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Module 1: POS Operations */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black">
              1
            </span>
            Point of Sale (POS) & Billing Workflows
          </h4>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>
                <strong>Instant Barcode Scanning:</strong> Plug any standard USB barcode gun into your PC.
                Scan any Zari reel or lace barcode, and it will be added to the cart instantly with zero clicks!
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>
                <strong>Camera Barcode Scanner:</strong> On mobile phones, tablets, or laptops, tap "Scan Barcode"
                to use the camera scanner with audio verification beeps.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>
                <strong>Voice Search:</strong> Tap the microphone icon and speak in English or Urdu (e.g. "Tilla", "Gota Lace")
                to filter the inventory instantly.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>
                <strong>Invoice Discount Switch:</strong> Choose between Flat Currency (Rs) discount or Percentage (%) discount.
              </span>
            </li>
          </ul>
        </div>

        {/* Module 2: Thermal Printing & ESC/POS */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black">
              2
            </span>
            Thermal Printer & Receipt Formats
          </h4>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>
                <strong>80mm & 58mm Thermal:</strong> Automatically formatted with Urdu shop headers, itemized totals,
                Udhaar balances, and high-resolution SVG barcodes for return scanning.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>
                <strong>Wholesale A4 Laser Mode:</strong> Switch to A4 layout for corporate invoices, customer stamp seals,
                and comprehensive credit histories.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>
                <strong>Web Bluetooth Direct:</strong> Tap "Bluetooth Print" on Android or Chrome desktop to print directly
                without system printer dialogs.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Packaging into Windows .EXE */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              Packaging into Standalone Windows .EXE (Electron)
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 bg-slate-900 text-slate-400 rounded-lg border border-slate-800">
            Windows 10 / 11 64-bit
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Follow these 3 simple steps to bundle this web application into an offline-first Windows installer (.exe)
          that launches in fullscreen kiosk mode on your counter terminal.
        </p>

        {/* Step 1 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Step 1: Install Electron in your terminal</span>
            <button
              onClick={() => handleCopy('npm install -D electron electron-builder', 'step1')}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              {copiedSection === 'step1' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSection === 'step1' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto">
            npm install -D electron electron-builder
          </pre>
        </div>

        {/* Step 2 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Step 2: Create `electron.js` in project root</span>
            <button
              onClick={() => handleCopy(electronJsCode, 'step2')}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              {copiedSection === 'step2' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSection === 'step2' ? 'Copied' : 'Copy Script'}
            </button>
          </div>
          <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-48">
            {electronJsCode}
          </pre>
        </div>

        {/* Step 3 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Step 3: Run the build command to generate .EXE</span>
            <button
              onClick={() => handleCopy('npm run dist', 'step3')}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              {copiedSection === 'step3' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSection === 'step3' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto">
            npm run dist
          </pre>
          <p className="text-[11px] text-slate-400">
            Your installer file `New-Sajjad-Zari-POS-Setup.exe` will be located in the `/dist` folder.
          </p>
        </div>
      </div>
    </div>
  );
};
