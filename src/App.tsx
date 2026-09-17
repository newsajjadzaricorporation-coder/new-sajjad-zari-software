import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingBag,
  Package,
  TrendingUp,
  Users,
  Truck,
  RotateCcw,
  Coins,
  Shield,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';

import { Product, Customer, Supplier, SaleInvoice, UserProfile, ShopSettings } from './types';
import { OfflineDB } from './services/db';
import { auth, logoutUser } from './services/firebase';
import { Header } from './components/Header';
import { LoginModal } from './components/auth/LoginModal';
import { POSModule } from './components/pos/POSModule';
import { InventoryModule } from './components/inventory/InventoryModule';
import { ProfitMarginHeatmapModule } from './components/analytics/ProfitMarginHeatmapModule';
import { CustomerKhataModule } from './components/khata/CustomerKhataModule';
import { SupplierKhataModule } from './components/khata/SupplierKhataModule';
import { ReturnsModule } from './components/returns/ReturnsModule';
import { ExpensesClosingModule } from './components/expenses/ExpensesClosingModule';
import { SecurityAuditModule } from './components/admin/SecurityAuditModule';
import { UserGuideModule } from './components/guide/UserGuideModule';
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { SplashScreen } from './components/SplashScreen';
import { useApp } from './context/AppProvider';

type NavTab =
  | 'pos'
  | 'inventory'
  | 'analytics'
  | 'customers'
  | 'suppliers'
  | 'returns'
  | 'expenses'
  | 'audit'
  | 'guide';

export default function App() {
  const { isInitializing, validateAuthSession } = useApp();

  // System State
  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => OfflineDB.getTheme());
  const [allUsers, setAllUsers] = useState<UserProfile[]>(OfflineDB.getUsers());
  const [currentUser, setCurrentUser] = useState<UserProfile>(
    OfflineDB.getCurrentUser() || allUsers.find((u) => u.role === 'admin') || allUsers[0]
  );
  const [settings, setSettings] = useState<ShopSettings>(OfflineDB.getSettings());

  // Safe navigation with authentication guard check
  const handleNavClick = (tab: NavTab) => {
    if (!validateAuthSession()) {
      setIsLocked(true);
      setIsLoginModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  // Theme Synchronizer
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'light') {
        document.documentElement.classList.add('light-mode');
        document.documentElement.classList.remove('dark');
        document.body.classList.add('light-mode');
      } else {
        document.documentElement.classList.remove('light-mode');
        document.documentElement.classList.add('dark');
        document.body.classList.remove('light-mode');
      }
    }
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      OfflineDB.setTheme(next);
      return next;
    });
  }, []);

  // Auth & Lock State
  const [isLocked, setIsLocked] = useState<boolean>(OfflineDB.isSessionLocked());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(OfflineDB.isSessionLocked());

  // Core Data Collections
  const [products, setProducts] = useState<Product[]>(OfflineDB.getProducts());
  const [customers, setCustomers] = useState<Customer[]>(OfflineDB.getCustomers());
  const [suppliers, setSuppliers] = useState<Supplier[]>(OfflineDB.getSuppliers());
  const [sales, setSales] = useState<SaleInvoice[]>(OfflineDB.getSales());

  // Receipt Modal State
  const [printModalSale, setPrintModalSale] = useState<SaleInvoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Sync Firebase Auth State
  useEffect(() => {
    if (!auth) return;
    try {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          const email = fbUser.email || 'newsajjadzaricorporation@gmail.com';
          const isOwnerAdmin =
            email === 'newsajjadzaricorporation@gmail.com' ||
            email.includes('admin') ||
            fbUser.uid === 'admin-sajjad-01';

          const users = OfflineDB.getUsers();
          let matched = users.find((u) => u.email === email || u.uid === fbUser.uid);
          if (!matched) {
            matched = {
              uid: fbUser.uid,
              email,
              displayName: fbUser.displayName || 'Google Admin',
              role: isOwnerAdmin ? 'admin' : 'staff',
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
            };
            OfflineDB.saveUser(matched, 'system');
          }
          setCurrentUser(matched);
          setAllUsers(OfflineDB.getUsers());
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firebase Auth State listener init note:', e);
    }
  }, []);

  // Calculate low-stock item count for inventory warning badge
  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stock <= (p.minStockAlert ?? 5)).length;
  }, [products]);

  // Global Keyboard Shortcuts (Ctrl+N for POS, Ctrl+I for Inventory, Ctrl+K for Khata, Ctrl+L for Lock, Ctrl+Shift+D for Theme)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleToggleTheme();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          setActiveTab('pos');
        } else if (e.key.toLowerCase() === 'i') {
          e.preventDefault();
          setActiveTab('inventory');
        } else if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setActiveTab('customers');
        } else if (e.key.toLowerCase() === 'l') {
          e.preventDefault();
          handleLockTerminal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, handleToggleTheme]);

  // Reload data from local database
  const reloadData = useCallback(() => {
    setProducts(OfflineDB.getProducts());
    setCustomers(OfflineDB.getCustomers());
    setSuppliers(OfflineDB.getSuppliers());
    setSales(OfflineDB.getSales());
    setAllUsers(OfflineDB.getUsers());
    setSettings(OfflineDB.getSettings());
    setThemeState(OfflineDB.getTheme());
  }, []);

  // Subscribe to Multi-Tab Broadcast synchronization
  useEffect(() => {
    const unsubscribe = OfflineDB.onSyncUpdate(() => {
      reloadData();
      setIsLocked(OfflineDB.isSessionLocked());
    });
    return () => unsubscribe();
  }, [reloadData]);

  // Auth Action Handlers
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Firebase logout notice:', e);
    }
    OfflineDB.recordAuthEvent('LOGOUT', currentUser, 'Logout Button');
    OfflineDB.setSessionLocked(true);
    setIsLocked(true);
    setIsLoginModalOpen(true);
  };

  const handleLockTerminal = () => {
    OfflineDB.recordAuthEvent('LOCK', currentUser, 'Terminal Lock');
    OfflineDB.setSessionLocked(true);
    setIsLocked(true);
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsLocked(false);
    setIsLoginModalOpen(false);
    reloadData();
  };

  // Handle completing a sale in the POS
  const handleCompleteSale = (sale: SaleInvoice) => {
    OfflineDB.recordSale(sale, currentUser.email);
    reloadData();
    // Automatically display the print receipt modal immediately
    setPrintModalSale(sale);
    setIsPrintModalOpen(true);
  };

  // Toggle Sound Effects
  const handleToggleSound = () => {
    const updated = {
      ...settings,
      enableSoundEffects: !settings.enableSoundEffects,
    };
    OfflineDB.saveSettings(updated);
    setSettings(updated);
  };

  if (isInitializing) {
    return <SplashScreen statusMessage="Synchronizing local databases & multi-tab cache..." />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Universal Top Header */}
      <Header
        currentUser={currentUser}
        onSwitchUser={(user) => {
          OfflineDB.setCurrentUser(user);
          setCurrentUser(user);
        }}
        allUsers={allUsers}
        settings={settings}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenClosingModal={() => setActiveTab('expenses')}
        onToggleSound={handleToggleSound}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onLockTerminal={handleLockTerminal}
      />

      {/* Main Navigation Bar */}
      <nav className="bg-slate-950/70 border-b border-slate-800 px-4 sm:px-6 lg:px-8 shrink-0 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 h-12">
          <button
            onClick={() => handleNavClick('pos')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'pos'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Shortcuts: Ctrl+N"
          >
            <ShoppingBag className="w-4 h-4" />
            POS & Billing
          </button>

          <button
            onClick={() => handleNavClick('inventory')}
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Shortcuts: Ctrl+I"
          >
            <Package className="w-4 h-4" />
            Inventory & CSV
            {lowStockCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black leading-none ${
                  activeTab === 'inventory'
                    ? 'bg-slate-950 text-amber-400 border border-slate-900'
                    : 'bg-red-500 text-white animate-pulse'
                }`}
                title={`${lowStockCount} items below minimum stock threshold`}
              >
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleNavClick('analytics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Profit Heatmap
          </button>

          <button
            onClick={() => handleNavClick('customers')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            Customer Khata
          </button>

          <button
            onClick={() => handleNavClick('suppliers')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'suppliers'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Truck className="w-4 h-4" />
            Suppliers & Inward
          </button>

          <button
            onClick={() => handleNavClick('returns')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'returns'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Returns & Credit Notes
          </button>

          <button
            onClick={() => handleNavClick('expenses')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'expenses'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Coins className="w-4 h-4" />
            Expenses & Z-Closing
          </button>

          <button
            onClick={() => handleNavClick('audit')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            RBAC & Backups
          </button>

          <button
            onClick={() => handleNavClick('guide')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            User Guide & .EXE
          </button>
        </div>
      </nav>

      {/* Dynamic Main Workspace Router */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'pos' && (
          <POSModule
            products={products}
            customers={customers}
            currentUser={currentUser}
            settings={settings}
            onCompleteSale={handleCompleteSale}
            onOpenCustomerModal={() => setActiveTab('customers')}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryModule
            products={products}
            currentUser={currentUser}
            onRefreshProducts={reloadData}
          />
        )}

        {activeTab === 'analytics' && (
          <ProfitMarginHeatmapModule products={products} sales={sales} />
        )}

        {activeTab === 'customers' && (
          <CustomerKhataModule
            customers={customers}
            currentUser={currentUser}
            settings={settings}
            onRefreshCustomers={reloadData}
          />
        )}

        {activeTab === 'suppliers' && (
          <SupplierKhataModule
            suppliers={suppliers}
            products={products}
            currentUser={currentUser}
            onRefreshData={reloadData}
          />
        )}

        {activeTab === 'returns' && (
          <ReturnsModule
            sales={sales}
            currentUser={currentUser}
            settings={settings}
            onRefreshSales={reloadData}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesClosingModule
            currentUser={currentUser}
            settings={settings}
            sales={sales}
            onRefreshData={reloadData}
          />
        )}

        {activeTab === 'audit' && (
          <SecurityAuditModule
            currentUser={currentUser}
            allUsers={allUsers}
            onRefreshAll={reloadData}
          />
        )}

        {activeTab === 'guide' && <UserGuideModule />}
      </main>

      {/* Global Thermal & A4 Receipt Print Modal */}
      <PrintReceiptModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        sale={printModalSale}
        settings={settings}
      />

      {/* Security Terminal Authentication / Login / Lock Modal */}
      <LoginModal
        isOpen={isLoginModalOpen || isLocked}
        onClose={() => {
          if (!isLocked) setIsLoginModalOpen(false);
        }}
        canDismiss={!isLocked}
        allUsers={allUsers}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
