import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Product, CartItem, Customer, SaleInvoice, UserProfile, ShopSettings } from '../../types';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { CameraBarcodeScannerModal } from '../CameraBarcodeScannerModal';

interface POSModuleProps {
  products: Product[];
  customers: Customer[];
  currentUser: UserProfile;
  settings: ShopSettings;
  onCompleteSale: (sale: SaleInvoice) => void;
  onOpenCustomerModal: () => void;
}

export const POSModule: React.FC<POSModuleProps> = ({
  products,
  customers,
  currentUser,
  settings,
  onCompleteSale,
  onOpenCustomerModal,
}) => {
  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Cart State with LocalStorage Persistence
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('NSZ_POS_SAVED_CART');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Automatically persist cart changes to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('NSZ_POS_SAVED_CART', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  // Last Completed Sale Toast State
  const [lastSale, setLastSale] = useState<SaleInvoice | null>(null);
  const [showPrintToast, setShowPrintToast] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in');
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // Discount & Payment
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit'>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');

  // Voice Search Hook
  const handleVoiceTranscript = useCallback((transcript: string) => {
    setSearchQuery(transcript);
  }, []);

  const { isListening, isSupported: isSpeechSupported, toggleListening } =
    useSpeechRecognition(handleVoiceTranscript);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.urduName && p.urduName.includes(q)) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId === 'walk-in') return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

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
    setAmountTendered('');
    try {
      localStorage.removeItem('NSZ_POS_SAVED_CART');
    } catch {
      // ignore
    }
  };

  // Calculations
  const grossSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotal, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (grossSubtotal <= 0 || discountValue <= 0) return 0;
    if (discountType === 'percentage') {
      return Math.round((grossSubtotal * Math.min(100, discountValue)) / 100);
    }
    return Math.min(grossSubtotal, discountValue);
  }, [grossSubtotal, discountType, discountValue]);

  const netTotal = Math.max(0, grossSubtotal - discountAmount);

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
      discountAmount,
      netTotal,
      paymentMethod,
      amountTendered: paymentMethod === 'cash' ? tenderedNumber || netTotal : netTotal,
      changeGiven: paymentMethod === 'cash' ? changeDue : 0,
      previousBalance: selectedCustomer ? prevBalance : undefined,
      newBalance: selectedCustomer ? newBalance : undefined,
      status: 'completed',
    };

    // Trigger celebration effects
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#fbbf24', '#34d399', '#f59e0b'],
    });

    setLastSale(saleRecord);
    setShowPrintToast(true);
    onCompleteSale(saleRecord);
    clearCart();
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-900">
      {/* ================= LEFT PANEL: PRODUCT SELECTOR ================= */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800 bg-slate-900/60 overflow-hidden">
        {/* Top Controls: Search, Category Pills, Voice & Scanner */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 space-y-3 shrink-0">
          {/* Search Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Zari threads, laces, borders, SKU or barcode..."
                className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-10 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
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
                className={`p-2.5 rounded-xl border transition ${
                  isListening
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse shadow-lg shadow-red-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={isListening ? 'Listening... Speak product name' : 'Voice Search (Urdu / English)'}
              >
                <Mic className="w-4 h-4" />
              </button>
            )}

            {/* Camera Barcode Scanner Trigger */}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-semibold transition"
              title="Open Camera Barcode Scanner"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Scan Barcode</span>
            </button>
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
        </div>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <ShoppingBag className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-base font-semibold text-slate-300">No products match your search</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Try searching by different keywords, clearing the category filter, or scanning a barcode.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
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
          )}
        </div>
      </div>

      {/* ================= RIGHT PANEL: CART & BILLING DRAWER ================= */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col bg-slate-950/80 border-t lg:border-t-0 border-slate-800 overflow-hidden shrink-0">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Active Cart</h3>
            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-full border border-slate-700">
              {cart.reduce((acc, i) => acc + i.quantity, 0)} items
            </span>
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

        {/* Customer Khata Selector */}
        <div className="p-3 bg-slate-900/60 border-b border-slate-800 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-amber-400" /> Customer Khata:
            </label>
            <button
              onClick={onOpenCustomerModal}
              className="text-[11px] text-amber-400 hover:text-amber-300 underline"
            >
              + New Customer
            </button>
          </div>

          <div className="flex gap-2">
            <select
              aria-label="Customer Selection"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="walk-in">Walk-in Customer (General Cash)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.shopName ? `(${c.shopName})` : ''} - Bal: Rs {c.currentBalance}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Debt / Balance Alert Banner */}
          {selectedCustomer && (
            <div
              className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                selectedCustomer.currentBalance > selectedCustomer.creditLimit
                  ? 'bg-red-500/10 text-red-300 border-red-500/30'
                  : selectedCustomer.currentBalance > 0
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              }`}
            >
              <div>
                <span className="font-semibold">Udhaar Debt: </span>
                <span className="font-bold">Rs {selectedCustomer.currentBalance.toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Limit: Rs {selectedCustomer.creditLimit.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Itemized Cart List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <ShoppingBag className="w-10 h-10 stroke-1 mb-2 opacity-50" />
              <p className="text-sm font-medium">Your cart is empty</p>
              <p className="text-xs text-slate-500 mt-1">
                Click any product on the left or scan a barcode to begin billing.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h5 className="text-xs font-semibold text-white leading-tight">
                      {item.product.name}
                    </h5>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      SKU: {item.product.sku} | Unit: {item.product.unit}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Price, Stepper & Line Discount */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                  {/* Unit Price Editable input */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400">Rate:</span>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateUnitPrice(item.product.id, parseFloat(e.target.value) || 0)}
                      className="w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white text-right focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400">
                      Rs {item.subtotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Summary, Discount Toggle & Checkout Form */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0 space-y-3">
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

          {/* Totals Breakdown */}
          <div className="space-y-1 text-xs text-slate-300 pt-1 border-t border-slate-850">
            <div className="flex justify-between">
              <span>Gross Subtotal:</span>
              <span className="font-semibold text-white">Rs {grossSubtotal.toLocaleString()}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Special Discount:</span>
                <span>-Rs {discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-amber-400 pt-1 border-t border-slate-800">
              <span>Net Payable:</span>
              <span>Rs {netTotal.toLocaleString()}</span>
            </div>
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
