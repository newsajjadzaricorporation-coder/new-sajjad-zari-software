import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Search,
  Mic,
  Camera,
  Plus,
  Minus,
  Trash2,
  Tag,
  CreditCard,
  Banknote,
  BookOpen,
  User,
  ShoppingBag,
  Percent,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Printer,
  ScanLine,
  X,
  Target,
  Wrench,
  Award,
  Crown,
  Gift,
  Coins,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Check,
  Star,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Product,
  CartItem,
  Customer,
  SaleInvoice,
  UserProfile,
  ShopSettings,
  Supplier,
  LoyaltyTier,
} from '../../types';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { CameraBarcodeScannerModal } from '../CameraBarcodeScannerModal';
import { OfflineDB } from '../../services/db';
import {
  fuzzyProductMatch,
  calculatePointsEarned,
  calculatePointsDiscount,
  LOYALTY_TIERS,
  getCustomerLoyaltyTier,
} from '../../utils/loyalty';
import { PaginationControls } from '../common/PaginationControls';
import { SwipeableCartItem } from './SwipeableCartItem';

interface POSModuleProps {
  products: Product[];
  customers: Customer[];
  currentUser: UserProfile;
  settings: ShopSettings;
  onCompleteSale: (sale: SaleInvoice) => void;
  onOpenCustomerModal: () => void;
}

interface SavedPOSSession {
  cart?: CartItem[];
  selectedCustomerId?: string;
  discountType?: 'flat' | 'percentage';
  discountValue?: number;
  isServiceFeeEnabled?: boolean;
  serviceFeeType?: 'flat' | 'percentage';
  serviceFeeValue?: number;
  paymentMethod?: 'cash' | 'card' | 'credit';
  amountTendered?: string;
  isRedeemingPoints?: boolean;
  pointsToRedeemInput?: string;
}

const getInitialPOSSession = (): SavedPOSSession => {
  try {
    const rawSession = sessionStorage.getItem('NSZ_POS_SESSION_TRANSACTION');
    if (rawSession) {
      return JSON.parse(rawSession);
    }
    const savedLocal = localStorage.getItem('NSZ_POS_SAVED_CART');
    if (savedLocal) {
      return { cart: JSON.parse(savedLocal) };
    }
  } catch {
    // ignore
  }
  return {};
};

const POSModuleComponent: React.FC<POSModuleProps> = ({
  products,
  customers,
  currentUser,
  settings,
  onCompleteSale,
  onOpenCustomerModal,
}) => {
  const initialSession = useMemo(() => getInitialPOSSession(), []);

  // Search input auto-focus ref
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus search on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  // Filters & Search State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'name_asc' | 'stock_desc'>('default');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showLoyaltyInfoModal, setShowLoyaltyInfoModal] = useState(false);

  // Pagination for POS Product Catalog
  const [posPage, setPosPage] = useState(1);
  const [posPageSize, setPosPageSize] = useState(24);

  // Suppliers for filter
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => OfflineDB.getSuppliers());

  useEffect(() => {
    const handleSuppliersUpdate = (event: CustomEvent<Supplier[]>) => {
      setSuppliers(event.detail);
    };
    window.addEventListener('SUPPLIERS_UPDATED' as any, handleSuppliersUpdate);
    return () => {
      window.removeEventListener('SUPPLIERS_UPDATED' as any, handleSuppliersUpdate);
    };
  }, []);

  // Cart State with Session & LocalStorage Persistence
  const [cart, setCart] = useState<CartItem[]>(() => initialSession.cart || []);

  // Last Completed Sale Toast State
  const [lastSale, setLastSale] = useState<SaleInvoice | null>(null);
  const [showPrintToast, setShowPrintToast] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialSession.selectedCustomerId || 'walk-in'
  );

  // Discount, Service Fee & Payment
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>(
    initialSession.discountType || 'flat'
  );
  const [discountValue, setDiscountValue] = useState<number>(
    initialSession.discountValue !== undefined ? initialSession.discountValue : 0
  );
  const [isServiceFeeEnabled, setIsServiceFeeEnabled] = useState<boolean>(
    initialSession.isServiceFeeEnabled !== undefined
      ? initialSession.isServiceFeeEnabled
      : Boolean(settings.defaultServiceFee && settings.defaultServiceFee > 0)
  );
  const [serviceFeeType, setServiceFeeType] = useState<'flat' | 'percentage'>(
    initialSession.serviceFeeType || settings.defaultServiceFeeType || 'flat'
  );
  const [serviceFeeValue, setServiceFeeValue] = useState<number>(
    initialSession.serviceFeeValue !== undefined ? initialSession.serviceFeeValue : (settings.defaultServiceFee || 0)
  );
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit'>(
    initialSession.paymentMethod || 'cash'
  );
  const [amountTendered, setAmountTendered] = useState<string>(
    initialSession.amountTendered || ''
  );

  // Loyalty Program Redemption State
  const [isRedeemingPoints, setIsRedeemingPoints] = useState<boolean>(
    initialSession.isRedeemingPoints || false
  );
  const [pointsToRedeemInput, setPointsToRedeemInput] = useState<string>(
    initialSession.pointsToRedeemInput || ''
  );

  // Automatically persist ongoing transaction to sessionStorage and cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('NSZ_POS_SAVED_CART', JSON.stringify(cart));
      const sessionData: SavedPOSSession = {
        cart,
        selectedCustomerId,
        discountType,
        discountValue,
        isServiceFeeEnabled,
        serviceFeeType,
        serviceFeeValue,
        paymentMethod,
        amountTendered,
        isRedeemingPoints,
        pointsToRedeemInput,
      };
      sessionStorage.setItem('NSZ_POS_SESSION_TRANSACTION', JSON.stringify(sessionData));
    } catch {
      // ignore storage errors
    }
  }, [
    cart,
    selectedCustomerId,
    discountType,
    discountValue,
    isServiceFeeEnabled,
    serviceFeeType,
    serviceFeeValue,
    paymentMethod,
    amountTendered,
    isRedeemingPoints,
    pointsToRedeemInput,
  ]);

  // Today's Sales Target Calculation
  const todaySalesTotal = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const sales = OfflineDB.getSales();
    return sales
      .filter((s) => {
        const dateStr = new Date(s.timestamp).toISOString().slice(0, 10);
        return dateStr === todayStr && s.status === 'completed';
      })
      .reduce((sum, s) => sum + (s.netTotal || 0), 0);
  }, [lastSale, products]);

  const dailySalesGoal = settings.dailySalesGoal || 75000;
  const goalProgressPercent = Math.min(100, Math.round((todaySalesTotal / dailySalesGoal) * 100));

  // Voice Search Hook with Real-time & Final Transcript
  const handleVoiceTranscript = useCallback((transcript: string, isFinal: boolean) => {
    const cleaned = transcript.trim();
    if (cleaned) {
      setSearchQuery(cleaned);
      if (isFinal) {
        // Attempt exact matching on final speech result
        const exactMatch = products.find(
          (p) =>
            p.name.toLowerCase() === cleaned.toLowerCase() ||
            p.sku.toLowerCase() === cleaned.toLowerCase() ||
            p.barcode === cleaned
        );
        if (exactMatch && exactMatch.stock > 0) {
          playKeyAudio(660);
        }
      }
    }
  }, [products]);

  const {
    isListening,
    isSupported: isSpeechSupported,
    interimText,
    lastError: speechError,
    toggleListening,
  } = useSpeechRecognition(handleVoiceTranscript, { interimResults: true });

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId === 'walk-in') return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Customer Loyalty Tier & Available Points
  const customerLoyaltyInfo = useMemo(() => {
    if (!selectedCustomer) return null;
    const currentPoints = selectedCustomer.loyaltyPoints ?? 0;
    const lifetime = selectedCustomer.lifetimePoints ?? currentPoints;
    const tier = selectedCustomer.loyaltyTier || getCustomerLoyaltyTier(lifetime);
    const tierConfig = LOYALTY_TIERS[tier] || LOYALTY_TIERS.Bronze;
    return {
      points: currentPoints,
      lifetime,
      tier,
      tierConfig,
    };
  }, [selectedCustomer]);

  // Reset loyalty points redemption when switching customers
  useEffect(() => {
    setIsRedeemingPoints(false);
    setPointsToRedeemInput('');
  }, [selectedCustomerId]);

  // Advanced Filtered & Sorted Products (Fuzzy Search + Categories + Stock Status + Supplier + Sort)
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      // 1. Category Filter
      if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false;
      }

      // 2. Stock Availability Filter
      if (stockFilter === 'in_stock' && p.stock <= p.minStockAlert) {
        return false;
      }
      if (stockFilter === 'low_stock' && (p.stock <= 0 || p.stock > p.minStockAlert)) {
        return false;
      }
      if (stockFilter === 'out_of_stock' && p.stock > 0) {
        return false;
      }

      // 3. Supplier Filter
      if (selectedSupplierId !== 'all' && p.supplierId !== selectedSupplierId) {
        return false;
      }

      // 4. Fuzzy & Partial Match Search
      if (searchQuery.trim()) {
        const matches = fuzzyProductMatch(searchQuery, p);
        if (!matches) return false;
      }

      return true;
    });

    // 5. Sorting
    if (sortBy === 'price_asc') {
      result.sort((a, b) => a.sellingPrice - b.sellingPrice);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.sellingPrice - a.sellingPrice);
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'stock_desc') {
      result.sort((a, b) => b.stock - a.stock);
    }

    return result;
  }, [products, selectedCategory, stockFilter, selectedSupplierId, searchQuery, sortBy]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'All') count++;
    if (stockFilter !== 'all') count++;
    if (selectedSupplierId !== 'all') count++;
    if (sortBy !== 'default') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedCategory, stockFilter, selectedSupplierId, sortBy, searchQuery]);

  // Reset pagination when search / filters change
  useEffect(() => {
    setPosPage(1);
  }, [selectedCategory, stockFilter, selectedSupplierId, sortBy, searchQuery]);

  // Paginated product slice for POS rendering
  const paginatedFilteredProducts = useMemo(() => {
    const start = (posPage - 1) * posPageSize;
    return filteredProducts.slice(start, start + posPageSize);
  }, [filteredProducts, posPage, posPageSize]);

  const clearAllFilters = () => {
    setSelectedCategory('All');
    setStockFilter('all');
    setSelectedSupplierId('all');
    setSortBy('default');
    setSearchQuery('');
    setPosPage(1);
  };

  // Add Item to Cart
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;

    playKeyAudio(600);
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const existing = prev[idx];
        const newQty = Math.min(product.stock, existing.quantity + 1);
        const updated = [...prev];
        updated[idx] = {
          ...existing,
          quantity: newQty,
          subtotal: newQty * existing.unitPrice - existing.itemDiscount,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: product.sellingPrice,
            itemDiscount: 0,
            subtotal: product.sellingPrice,
          },
        ];
      }
    });
  };

  // Barcode scanned callback
  const handleBarcodeScanned = (barcode: string) => {
    const found = products.find(
      (p) => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase()
    );
    if (found) {
      handleAddToCart(found);
    } else {
      alert(`Product with barcode/SKU "${barcode}" not found in inventory.`);
    }
  };

  // Cart item updates
  const updateQuantity = (productId: string, delta: number) => {
    playKeyAudio(520);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const maxStock = item.product.stock;
            const newQty = Math.max(1, Math.min(maxStock, item.quantity + delta));
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.unitPrice - item.itemDiscount,
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const updateUnitPrice = (productId: string, price: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const safePrice = Math.max(0, price);
          return {
            ...item,
            unitPrice: safePrice,
            subtotal: item.quantity * safePrice - item.itemDiscount,
          };
        }
        return item;
      })
    );
  };

  const updateItemDiscount = (productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const safeDisc = Math.max(0, discount);
          return {
            ...item,
            itemDiscount: safeDisc,
            subtotal: Math.max(0, item.quantity * item.unitPrice - safeDisc),
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    playKeyAudio(350);
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setServiceFeeValue(settings.defaultServiceFee || 0);
    setIsServiceFeeEnabled(Boolean(settings.defaultServiceFee && settings.defaultServiceFee > 0));
    setAmountTendered('');
    setIsRedeemingPoints(false);
    setPointsToRedeemInput('');
    try {
      localStorage.removeItem('NSZ_POS_SAVED_CART');
      sessionStorage.removeItem('NSZ_POS_SESSION_TRANSACTION');
    } catch {
      // ignore
    }
  };

  // Calculations
  const grossSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotal, 0);
  }, [cart]);

  const standardDiscountAmount = useMemo(() => {
    if (grossSubtotal <= 0 || discountValue <= 0) return 0;
    if (discountType === 'percentage') {
      return Math.round((grossSubtotal * Math.min(100, discountValue)) / 100);
    }
    return Math.min(grossSubtotal, discountValue);
  }, [grossSubtotal, discountType, discountValue]);

  // Subtotal after manual invoice discount
  const subtotalAfterDiscount = Math.max(0, grossSubtotal - standardDiscountAmount);

  // Loyalty Points Redemption calculation
  const customerAvailablePoints = customerLoyaltyInfo?.points ?? 0;
  const pointRedemptionRate = settings.pointRedemptionRate || 1; // Rs per point
  const minPointsRequired = settings.minPointsToRedeem || 20;

  const pointsRedeemedNumber = useMemo(() => {
    if (!isRedeemingPoints || !customerLoyaltyInfo || customerAvailablePoints < minPointsRequired) {
      return 0;
    }
    const requested = parseInt(pointsToRedeemInput, 10) || 0;
    const maxRedeemableForBill = Math.floor(subtotalAfterDiscount / pointRedemptionRate);
    const safePoints = Math.max(0, Math.min(requested, customerAvailablePoints, maxRedeemableForBill));
    return safePoints;
  }, [
    isRedeemingPoints,
    customerLoyaltyInfo,
    customerAvailablePoints,
    minPointsRequired,
    pointsToRedeemInput,
    subtotalAfterDiscount,
    pointRedemptionRate,
  ]);

  const loyaltyDiscountAmount = useMemo(() => {
    return calculatePointsDiscount(pointsRedeemedNumber, settings);
  }, [pointsRedeemedNumber, settings]);

  const totalDiscountAmount = standardDiscountAmount + loyaltyDiscountAmount;

  const calculatedServiceFee = useMemo(() => {
    if (!isServiceFeeEnabled || serviceFeeValue <= 0) return 0;
    if (serviceFeeType === 'percentage') {
      const taxable = Math.max(0, grossSubtotal - totalDiscountAmount);
      return Math.round((taxable * Math.min(100, serviceFeeValue)) / 100);
    }
    return Math.max(0, serviceFeeValue);
  }, [isServiceFeeEnabled, serviceFeeType, serviceFeeValue, grossSubtotal, totalDiscountAmount]);

  const netTotal = Math.max(0, grossSubtotal - totalDiscountAmount + calculatedServiceFee);

  // Loyalty points that will be earned on this purchase
  const pointsEarnedOnSale = useMemo(() => {
    if (!settings.loyaltyEnabled) return 0;
    const tier = customerLoyaltyInfo?.tier || 'Bronze';
    return calculatePointsEarned(netTotal, tier, settings);
  }, [netTotal, customerLoyaltyInfo, settings]);

  const tenderedNumber = parseFloat(amountTendered) || 0;
  const changeDue = Math.max(0, tenderedNumber - netTotal);

  // Audio tone helper
  const playKeyAudio = (freq: number) => {
    if (!settings.enableSoundEffects) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // ignore
    }
  };

  // Complete Checkout Transaction
  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'credit' && !selectedCustomer) {
      alert('Please link an existing customer for Credit / Udhaar sales.');
      return;
    }

    const timestamp = Date.now();
    const invoiceNo = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(
      Math.floor(1000 + Math.random() * 9000)
    )}`;

    const prevBalance = selectedCustomer ? selectedCustomer.currentBalance : 0;
    const newBalance =
      paymentMethod === 'credit' && selectedCustomer
        ? prevBalance + netTotal
        : prevBalance;

    const saleRecord: SaleInvoice = {
      id: `sale-${timestamp}`,
      invoiceNo,
      date: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      timestamp,
      cashierId: currentUser.uid,
      cashierName: currentUser.displayName,
      cashierEmail: currentUser.email,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      customerPhone: selectedCustomer?.phone,
      items: [...cart],
      subtotal: grossSubtotal,
      discountType,
      discountValue,
      discountAmount: totalDiscountAmount,
      serviceFee: calculatedServiceFee,
      serviceFeeType: isServiceFeeEnabled ? serviceFeeType : undefined,
      serviceFeeValue: isServiceFeeEnabled ? serviceFeeValue : 0,
      netTotal,
      paymentMethod,
      amountTendered: paymentMethod === 'cash' ? tenderedNumber || netTotal : netTotal,
      changeGiven: paymentMethod === 'cash' ? changeDue : 0,
      previousBalance: selectedCustomer ? prevBalance : undefined,
      newBalance: selectedCustomer ? newBalance : undefined,
      loyaltyPointsEarned: pointsEarnedOnSale,
      loyaltyPointsRedeemed: pointsRedeemedNumber,
      loyaltyDiscountAmount: loyaltyDiscountAmount,
      customerTier: customerLoyaltyInfo?.tier,
      status: 'completed',
    };

    // Trigger celebration effects
    confetti({
      particleCount: 55,
      spread: 65,
      origin: { y: 0.8 },
      colors: ['#fbbf24', '#34d399', '#f59e0b', '#a855f7'],
    });

    setLastSale(saleRecord);
    setShowPrintToast(true);
    onCompleteSale(saleRecord);

    // Auto-Print Receipt if enabled in settings
    if (settings.autoPrintReceipt) {
      setTimeout(() => {
        window.print();
      }, 400);
    }

    clearCart();
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-900">
      {/* ================= LEFT PANEL: PRODUCT SELECTOR ================= */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800 bg-slate-900/60 overflow-hidden">
        {/* Top Controls: Target, Advanced Search, Filters & Sorters */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/50 space-y-2.5 shrink-0">
          {/* Daily Sales Goal Progress Bar */}
          <div className="p-2.5 sm:p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-xs flex-wrap gap-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Today's Sales Target:</span>
                <span className="text-white font-bold">Rs {todaySalesTotal.toLocaleString()}</span>
                <span className="text-slate-500 font-normal">/ Rs {dailySalesGoal.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`font-mono text-xs font-black ${
                    goalProgressPercent >= 100 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {goalProgressPercent}%
                </span>
                {goalProgressPercent >= 100 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Goal Reached!
                  </span>
                )}
              </div>
            </div>
            <div className="w-full bg-slate-800/90 h-2 rounded-full overflow-hidden border border-slate-700/50">
              <div
                className={`h-full transition-all duration-700 rounded-full ${
                  goalProgressPercent >= 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/40'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-sm shadow-amber-500/40'
                }`}
                style={{ width: `${Math.min(100, goalProgressPercent)}%` }}
              />
            </div>
          </div>

          {/* Primary Search Bar Row with Voice & Camera Scanner */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Fuzzy search: Zari threads, laces, borders, Urdu (تلہ), SKU, barcode..."
                className={`w-full bg-slate-800/90 border rounded-xl pl-9 pr-10 py-2 text-sm text-white placeholder-slate-400 focus:outline-none transition ${
                  isListening
                    ? 'border-red-500/80 ring-2 ring-red-500/30'
                    : 'border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Voice Search Button */}
            {isSpeechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 ${
                  isListening
                    ? 'bg-red-500 text-white border-red-400 animate-pulse shadow-lg shadow-red-500/30 font-bold text-xs px-3'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={isListening ? 'Stop listening' : 'Voice-to-Text Search (Urdu / English)'}
              >
                <Mic className="w-4 h-4" />
                {isListening && <span>Listening...</span>}
              </button>
            )}

            {/* Camera Barcode Scanner Trigger */}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-semibold transition shrink-0"
              title="Open Camera Barcode Scanner"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Scan Barcode</span>
            </button>
          </div>

          {/* Live Voice Search Transcription Banner */}
          {isListening && (
            <div className="flex items-center justify-between px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                <span className="font-semibold text-white shrink-0">Speak Product Name or Urdu:</span>
                <span className="italic truncate text-slate-200">{interimText || 'Say "Silver Tilla", "Gota", "تلہ"...'}</span>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                className="text-[11px] font-bold text-red-400 hover:text-red-300 underline ml-2 shrink-0"
              >
                Done
              </button>
            </div>
          )}

          {speechError && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
              <span>{speechError}</span>
            </div>
          )}

          {/* Secondary Filter Controls: Stock Availability, Supplier & Sorter */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Stock Availability Pill Switcher */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setStockFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  stockFilter === 'all'
                    ? 'bg-slate-750 text-white font-bold bg-slate-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Stock
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('in_stock')}
                className={`px-2 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                  stockFilter === 'in_stock'
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                In Stock
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('low_stock')}
                className={`px-2 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                  stockFilter === 'low_stock'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Low Stock
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('out_of_stock')}
                className={`px-2 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                  stockFilter === 'out_of_stock'
                    ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Out of Stock
              </button>
            </div>

            {/* Supplier and Sorting Selectors */}
            <div className="flex items-center gap-2">
              {/* Supplier Filter Dropdown */}
              <select
                aria-label="Filter by Supplier"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
              >
                <option value="all">🏢 All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName}
                  </option>
                ))}
              </select>

              {/* Sort By Dropdown */}
              <select
                aria-label="Sort Products"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
              >
                <option value="default">⚡ Default Sort</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="stock_desc">Stock: High to Low</option>
              </select>
            </div>
          </div>

          {/* Category Navigation Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-750'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Active Filter Chips & Counter Bar */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center justify-between text-xs pt-1 text-slate-400 border-t border-slate-850">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">
                  Showing <span className="text-amber-400 font-bold">{filteredProducts.length}</span> of {products.length} products
                </span>
                {searchQuery && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px]">
                    "{searchQuery}"
                  </span>
                )}
                {stockFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px] capitalize">
                    {stockFilter.replace('_', ' ')}
                  </span>
                )}
                {selectedCategory !== 'All' && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                    {selectedCategory}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <ShoppingBag className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-base font-semibold text-slate-300">No products match your criteria</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Try partial keywords, clearing active category/stock filters, or scanning the item barcode.
              </p>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-3 px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {paginatedFilteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = product.stock > 0 && product.stock <= product.minStockAlert;
                  const inCart = cart.find((i) => i.product.id === product.id);

                  return (
                    <button
                      key={product.id}
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock}
                      className={`relative text-left p-3.5 rounded-xl border transition flex flex-col justify-between group ${
                        isOutOfStock
                          ? 'bg-slate-900/40 border-slate-800/60 opacity-60 cursor-not-allowed'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-amber-400/50 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {/* Top badging */}
                      <div className="flex items-start justify-between gap-1.5 w-full mb-2">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                          {product.sku}
                        </span>
                        {isOutOfStock ? (
                          <span className="text-[10px] font-bold text-red-400 bg-red-500/15 border border-red-500/20 px-1.5 py-0.5 rounded">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/20 px-1.5 py-0.5 rounded">
                            Only {product.stock} {product.unit} left
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {product.stock} {product.unit}
                          </span>
                        )}
                      </div>

                      {/* Product Title */}
                      <div className="flex-1 my-1">
                        <h4 className="text-sm font-semibold text-white group-hover:text-amber-400 transition leading-snug line-clamp-2">
                          {product.name}
                        </h4>
                        {product.urduName && (
                          <p className="font-urdu text-xs text-amber-300/80 mt-0.5 line-clamp-1">
                            {product.urduName}
                          </p>
                        )}
                      </div>

                      {/* Bottom Price & Add Indicator */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/40 w-full">
                        <div>
                          <span className="text-xs text-slate-400">Rs </span>
                          <span className="text-base font-bold text-white">
                            {product.sellingPrice.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400"> /{product.unit}</span>
                        </div>

                        {inCart ? (
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center shadow">
                            {inCart.quantity}
                          </span>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-700/60 group-hover:bg-amber-500/20 text-slate-400 group-hover:text-amber-400 flex items-center justify-center transition">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredProducts.length > 12 && (
                <div className="pt-2">
                  <PaginationControls
                    currentPage={posPage}
                    totalItems={filteredProducts.length}
                    pageSize={posPageSize}
                    onPageChange={setPosPage}
                    onPageSizeChange={setPosPageSize}
                    pageSizeOptions={[12, 24, 48, 96]}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= RIGHT PANEL: CART & BILLING DRAWER ================= */}
      <div className="w-full lg:w-[430px] xl:w-[470px] flex flex-col bg-slate-950/85 border-t lg:border-t-0 border-slate-800 overflow-hidden shrink-0">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Active Cart</h3>
            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-full border border-slate-700">
              {cart.reduce((acc, i) => acc + i.quantity, 0)} items
            </span>
            {cart.length > 0 && (
              <span className="hidden md:inline-block text-[10px] text-slate-500 font-medium">
                • Swipe left ← to delete
              </span>
            )}
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Customer Khata & Loyalty Profile Selector */}
        <div className="p-3 bg-slate-900/70 border-b border-slate-800 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-amber-400" /> Customer / Loyalty Account:
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLoyaltyInfoModal(true)}
                className="text-[11px] text-amber-400/90 hover:text-amber-300 flex items-center gap-0.5"
                title="View Loyalty Tiers & Benefits"
              >
                <Award className="w-3 h-3" />
                <span>Tier Perks</span>
              </button>
              <button
                onClick={onOpenCustomerModal}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline"
              >
                + New Customer
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <select
              aria-label="Customer Selection"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="walk-in">Walk-in Customer (General Cash)</option>
              {customers.map((c) => {
                const tier = c.loyaltyTier || getCustomerLoyaltyTier(c.lifetimePoints || c.loyaltyPoints || 0);
                const pts = c.loyaltyPoints ?? 0;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.shopName ? `(${c.shopName})` : ''} • [{tier} | {pts} pts] • Bal: Rs {c.currentBalance}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Customer Loyalty Tier & Khata Info Card */}
          {selectedCustomer && customerLoyaltyInfo && (
            <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${customerLoyaltyInfo.tierConfig.badgeColor}`}
                  >
                    <Crown className="w-3 h-3" />
                    {customerLoyaltyInfo.tier} Tier
                  </span>
                  <span className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    {customerLoyaltyInfo.points.toLocaleString()} Points
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Worth: <strong className="text-white">Rs {(customerLoyaltyInfo.points * pointRedemptionRate).toLocaleString()}</strong>
                </span>
              </div>

              {/* Perk highlight */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">
                  Perk: <span className="text-slate-200">{customerLoyaltyInfo.tierConfig.perks}</span>
                </span>
                <span className="text-amber-400/90 font-mono text-[10px]">
                  {customerLoyaltyInfo.tierConfig.pointsMultiplier}x Points Mult.
                </span>
              </div>

              {/* Debt Alert */}
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                <div>
                  <span className="text-slate-400">Udhaar Debt: </span>
                  <span
                    className={`font-bold ${
                      selectedCustomer.currentBalance > selectedCustomer.creditLimit
                        ? 'text-red-400'
                        : selectedCustomer.currentBalance > 0
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    Rs {selectedCustomer.currentBalance.toLocaleString()}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Limit: Rs {selectedCustomer.creditLimit.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Itemized Cart List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <ShoppingBag className="w-10 h-10 stroke-1 mb-2 opacity-50" />
              <p className="text-sm font-medium">Your cart is empty</p>
              <p className="text-xs text-slate-500 mt-1">
                Click any product on the left or scan a barcode to begin billing.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <SwipeableCartItem
                key={item.product.id}
                item={item}
                onRemove={removeFromCart}
                onUpdateQuantity={updateQuantity}
                onUpdateUnitPrice={updateUnitPrice}
              />
            ))
          )}
        </div>

        {/* Bill Summary, Loyalty Redemption, Discount Toggle & Checkout Form */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950 shrink-0 space-y-2.5">
          {/* Customer Loyalty Points Redemption Section (When customer has points) */}
          {selectedCustomer && customerLoyaltyInfo && customerLoyaltyInfo.points >= minPointsRequired && (
            <div className="p-2.5 bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-900 rounded-xl border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isRedeemingPoints;
                      setIsRedeemingPoints(next);
                      if (next && !pointsToRedeemInput) {
                        // default to max eligible points for this bill
                        const maxRedeem = Math.min(
                          customerLoyaltyInfo.points,
                          Math.floor(subtotalAfterDiscount / pointRedemptionRate)
                        );
                        setPointsToRedeemInput(String(maxRedeem));
                      }
                    }}
                    className={`w-7 h-4 flex items-center rounded-full p-0.5 transition ${
                      isRedeemingPoints ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-white block shadow-sm" />
                  </button>
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
                    <Gift className="w-3.5 h-3.5" />
                    <span>Redeem Loyalty Points</span>
                  </div>
                </div>

                <span className="text-[11px] text-amber-200/90 font-mono">
                  Avail: {customerLoyaltyInfo.points} pts
                </span>
              </div>

              {isRedeemingPoints && (
                <div className="pt-1.5 border-t border-amber-500/20 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {[50, 100, 250, 500].map((pt) => {
                        if (pt > customerLoyaltyInfo.points) return null;
                        return (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => setPointsToRedeemInput(String(pt))}
                            className="px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded text-[10px] font-bold"
                          >
                            {pt} pts
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          const maxRedeem = Math.min(
                            customerLoyaltyInfo.points,
                            Math.floor(subtotalAfterDiscount / pointRedemptionRate)
                          );
                          setPointsToRedeemInput(String(maxRedeem));
                        }}
                        className="px-1.5 py-0.5 bg-amber-500 text-slate-950 rounded text-[10px] font-black"
                      >
                        Max
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max={customerLoyaltyInfo.points}
                        value={pointsToRedeemInput}
                        onChange={(e) => setPointsToRedeemInput(e.target.value)}
                        placeholder="Points"
                        className="w-16 bg-slate-900 border border-amber-500/40 rounded px-1.5 py-0.5 text-xs text-right font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                      />
                      <span className="text-[10px] text-amber-400 font-bold">pts</span>
                    </div>
                  </div>

                  {loyaltyDiscountAmount > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-1 rounded border border-emerald-500/30">
                      <span>Instant Loyalty Savings:</span>
                      <span>-Rs {loyaltyDiscountAmount.toLocaleString()} ({pointsRedeemedNumber} pts)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Invoice-Level Discount Toggle (Flat Rs vs Percentage %) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setDiscountType('flat')}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  discountType === 'flat'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Flat (Rs)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('percentage')}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  discountType === 'percentage'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                % Percent
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-1 max-w-[150px]">
              <input
                type="number"
                min="0"
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder="Discount..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-right text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <span className="text-xs text-slate-400">
                {discountType === 'flat' ? 'Rs' : '%'}
              </span>
            </div>
          </div>

          {/* Service Fee / Stitching / Alteration Fee Section */}
          <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsServiceFeeEnabled(!isServiceFeeEnabled)}
                  className={`w-7 h-4 flex items-center rounded-full p-0.5 transition ${
                    isServiceFeeEnabled ? 'bg-blue-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                  title={isServiceFeeEnabled ? 'Disable Service Fee' : 'Enable Service Fee'}
                >
                  <span className="w-3 h-3 rounded-full bg-white block shadow-sm" />
                </button>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <Wrench className="w-3.5 h-3.5 text-blue-400" />
                  <span>Service / Alteration Fee</span>
                </div>
              </div>

              {isServiceFeeEnabled && (
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setServiceFeeType('flat')}
                    className={`px-2 py-0.5 text-[10px] rounded font-bold transition ${
                      serviceFeeType === 'flat'
                        ? 'bg-blue-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rs Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceFeeType('percentage')}
                    className={`px-2 py-0.5 text-[10px] rounded font-bold transition ${
                      serviceFeeType === 'percentage'
                        ? 'bg-blue-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    % Percent
                  </button>
                </div>
              )}
            </div>

            {isServiceFeeEnabled && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-1 flex-wrap">
                  {serviceFeeType === 'flat' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setServiceFeeValue((prev) => prev + 50)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold"
                      >
                        +50
                      </button>
                      <button
                        type="button"
                        onClick={() => setServiceFeeValue((prev) => prev + 100)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold"
                      >
                        +100
                      </button>
                      <button
                        type="button"
                        onClick={() => setServiceFeeValue((prev) => prev + 200)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold"
                      >
                        +200
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setServiceFeeValue(5)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold"
                      >
                        5%
                      </button>
                      <button
                        type="button"
                        onClick={() => setServiceFeeValue(10)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold"
                      >
                        10%
                      </button>
                    </>
                  )}
                  {serviceFeeValue > 0 && (
                    <button
                      type="button"
                      onClick={() => setServiceFeeValue(0)}
                      className="px-1.5 py-0.5 text-red-400 hover:text-red-300 rounded text-[10px]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={serviceFeeValue || ''}
                    onChange={(e) => setServiceFeeValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right font-bold text-white focus:outline-none focus:border-blue-400"
                  />
                  <span className="text-[11px] text-slate-400 font-bold">
                    {serviceFeeType === 'flat' ? 'Rs' : '%'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Totals Breakdown & Loyalty Points Preview */}
          <div className="space-y-1 text-xs text-slate-300 pt-1 border-t border-slate-850">
            <div className="flex justify-between">
              <span>Gross Subtotal:</span>
              <span className="font-semibold text-white">Rs {grossSubtotal.toLocaleString()}</span>
            </div>
            {standardDiscountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Special Discount ({discountType === 'percentage' ? `${discountValue}%` : 'Flat'}):</span>
                <span>-Rs {standardDiscountAmount.toLocaleString()}</span>
              </div>
            )}
            {loyaltyDiscountAmount > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Loyalty Points Discount ({pointsRedeemedNumber} pts):</span>
                <span>-Rs {loyaltyDiscountAmount.toLocaleString()}</span>
              </div>
            )}
            {calculatedServiceFee > 0 && (
              <div className="flex justify-between text-blue-400">
                <span>
                  Service / Alteration Fee {serviceFeeType === 'percentage' ? `(${serviceFeeValue}%)` : ''}:
                </span>
                <span>+Rs {calculatedServiceFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-amber-400 pt-1 border-t border-slate-800">
              <span>Net Payable:</span>
              <span>Rs {netTotal.toLocaleString()}</span>
            </div>

            {/* Points Earned Preview */}
            {settings.loyaltyEnabled && selectedCustomer && (
              <div className="flex justify-between text-[11px] text-amber-300/90 pt-0.5">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Points to earn on this sale:
                </span>
                <span className="font-bold">+{pointsEarnedOnSale} pts</span>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition ${
                paymentMethod === 'cash'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Banknote className="w-4 h-4" />
              Cash
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition ${
                paymentMethod === 'card'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Online / Card
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('credit')}
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition ${
                paymentMethod === 'credit'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Credit (Udhaar)
            </button>
          </div>

          {/* Cash Tendered & Change Row (Only in Cash mode) */}
          {paymentMethod === 'cash' && cart.length > 0 && (
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Cash Received:</span>
                <input
                  type="number"
                  placeholder={String(netTotal)}
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-right text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <span className="text-slate-400">Change: </span>
                <span className="font-bold text-emerald-400">Rs {changeDue.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Complete Transaction Button */}
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Complete Transaction (Rs {netTotal.toLocaleString()})
          </button>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Loyalty Tiers & Benefits Info Modal */}
      {showLoyaltyInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Award className="w-6 h-6" />
                <h3 className="text-lg font-bold text-white">Customer Loyalty Program</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLoyaltyInfoModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                Customers earn <strong className="text-amber-400">{settings.pointsPerHundredRupees || 1} point</strong> for every Rs 100 spent. Points can be redeemed at <strong className="text-emerald-400">1 point = Rs {settings.pointRedemptionRate || 1}</strong> discount!
              </p>
            </div>

            {/* Tier Levels Matrix */}
            <div className="space-y-2.5">
              {(Object.keys(LOYALTY_TIERS) as LoyaltyTier[]).map((tierKey) => {
                const tier = LOYALTY_TIERS[tierKey];
                return (
                  <div
                    key={tierKey}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${tier.badgeColor}`}>
                          {tier.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {tier.minPoints === 0
                            ? '0+ pts'
                            : `${tier.minPoints.toLocaleString()} - ${tier.maxPoints ? tier.maxPoints.toLocaleString() + ' pts' : 'Unlimited'}`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{tier.perks}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {tier.pointsMultiplier}x Points
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowLoyaltyInfoModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
              >
                Close & Return to POS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) for Quick Operations */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {isFabMenuOpen && (
          <div className="flex flex-col items-end gap-2 mb-1 animate-in fade-in slide-in-from-bottom-3 duration-200">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  setIsFabMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-xl border border-red-400/30 transition"
              >
                <Trash2 className="w-4 h-4" />
                Clear Cart ({cart.length})
              </button>
            )}

            {lastSale && (
              <button
                type="button"
                onClick={() => {
                  onCompleteSale(lastSale);
                  setIsFabMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold shadow-xl border border-slate-700 transition"
              >
                <Printer className="w-4 h-4" />
                Print Last Receipt ({lastSale.invoiceNo})
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsScannerOpen(true);
                setIsFabMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-xl border border-slate-700 transition"
            >
              <ScanLine className="w-4 h-4 text-amber-400" />
              Scan Barcode
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-slate-950 font-bold shadow-xl transition transform active:scale-95 ${
            isFabMenuOpen
              ? 'bg-slate-800 text-slate-200 border border-slate-700 rotate-45'
              : 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30'
          }`}
          title="Quick Actions Menu (FAB)"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Non-Intrusive Sale Finalized Toast with Immediate Print Button */}
      {showPrintToast && lastSale && (
        <div className="fixed bottom-6 left-6 z-50 max-w-md bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Sale Finalized:</span>
                <span className="text-emerald-400 font-mono">{lastSale.invoiceNo}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Rs {lastSale.netTotal.toLocaleString()} • {lastSale.paymentMethod.toUpperCase()}
                {lastSale.loyaltyPointsEarned ? ` • +${lastSale.loyaltyPointsEarned} pts earned` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onCompleteSale(lastSale);
                setShowPrintToast(false);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1.5 shadow transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Immediate Print
            </button>
            <button
              type="button"
              onClick={() => setShowPrintToast(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const POSModule = React.memo(POSModuleComponent);
