import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  ScanLine,
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
  Package,
  ArrowRight,
  Sparkles,
  Link,
  Tag,
  Layers,
  CornerDownLeft,
} from 'lucide-react';
import { Product } from '../../types';
import { fuzzyProductMatch } from '../../utils/loyalty';

interface ManualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  initialQuery?: string;
  failedBarcode?: string | null;
  products: Product[];
  onLinkBarcodeAndAdd?: (product: Product, barcode: string) => void;
}

export const ManualSearchModal: React.FC<ManualSearchModalProps> = React.memo(({
  isOpen,
  onClose,
  onSelectProduct,
  initialQuery = '',
  failedBarcode = null,
  products,
  onLinkBarcodeAndAdd,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync initial query when modal opens or failedBarcode changes
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery || '');
      setHighlightedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialQuery, failedBarcode]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false;
      }
      if (inStockOnly && p.stock <= 0) {
        return false;
      }
      if (!query.trim()) {
        return true;
      }
      return fuzzyProductMatch(query, p);
    });
  }, [products, selectedCategory, inStockOnly, query]);

  // Reset highlight index if filter count changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, selectedCategory, inStockOnly]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }

      if (e.key === 'Enter') {
        if (filteredProducts.length > 0 && highlightedIndex < filteredProducts.length) {
          e.preventDefault();
          const target = filteredProducts[highlightedIndex];
          onSelectProduct(target);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredProducts, highlightedIndex, onSelectProduct, onClose]);

  // Auto scroll highlighted item into view
  useEffect(() => {
    if (!listContainerRef.current) return;
    const container = listContainerRef.current;
    const itemEl = container.querySelector(`[data-index="${highlightedIndex}"]`) as HTMLElement;
    if (itemEl) {
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const itemTop = itemEl.offsetTop;
      const itemBottom = itemTop + itemEl.clientHeight;

      if (itemTop < containerTop) {
        container.scrollTop = itemTop;
      } else if (itemBottom > containerBottom) {
        container.scrollTop = itemBottom - container.clientHeight;
      }
    }
  }, [highlightedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              failedBarcode
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-blue-500/20 border-blue-500/40 text-blue-400'
            }`}>
              {failedBarcode ? <ScanLine className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {failedBarcode ? 'Manual Product Search & Barcode Lookup' : 'Manual Product Search & Quick Lookup'}
                </h3>
                <span className="text-xs text-amber-400/90 font-medium">
                  (دستی پروڈکٹ تلاش)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {failedBarcode
                  ? 'Barcode scanner could not find an exact match. Select or search an item manually.'
                  : 'Search by English or Urdu product name, SKU, category, or barcode tag.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* UNRECOGNIZED BARCODE NOTIFICATION BANNER */}
        {failedBarcode && (
          <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white">Scanned Code Not Found:</span>
                <span className="font-mono bg-slate-900/90 px-2 py-0.5 rounded border border-amber-500/40 text-amber-300 font-bold">
                  {failedBarcode}
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80">
                Select the intended product below to add it directly to cart, or click <strong>"Link Barcode & Add"</strong> to permanently register this barcode code with the catalog item.
              </p>
            </div>
          </div>
        )}

        {/* SEARCH & FILTERS BAR */}
        <div className="p-4 sm:p-5 space-y-3 shrink-0 border-b border-slate-800/80 bg-slate-900/50">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by product name, Urdu (تلہ, گوٹہ, لیس), SKU, or category..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-20 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 placeholder-slate-500 transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category & Stock Filter Badges */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
              {categories.slice(0, 7).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
              {categories.length > 7 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-800 text-slate-300 rounded-lg px-2 py-1 text-xs border border-slate-700 focus:outline-none"
                >
                  <option value="All">More Categories...</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <label className="flex items-center gap-1.5 text-slate-300 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>In-stock only</span>
            </label>
          </div>
        </div>

        {/* RESULTS SUMMARY BAR */}
        <div className="px-4 sm:px-5 py-2 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <div>
            Showing <strong className="text-white">{filteredProducts.length}</strong> matching product(s)
          </div>
          <div className="flex items-center gap-3 text-slate-500 hidden sm:flex">
            <span>Use <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">↓</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">Enter</kbd> to add</span>
          </div>
        </div>

        {/* RESULTS LIST CONTAINER */}
        <div
          ref={listContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 custom-scrollbar bg-slate-950/20"
        >
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500">
                <Package className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">No products found</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {query
                    ? `No catalog items matched "${query}". Try searching with shorter terms or check spelling.`
                    : 'No items available with current filter settings.'}
                </p>
              </div>
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold transition"
                >
                  Clear Search Query
                </button>
              )}
            </div>
          ) : (
            filteredProducts.map((product, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const isLowStock = product.stock > 0 && product.stock <= product.minStockAlert;
              const isOutOfStock = product.stock <= 0;

              return (
                <div
                  key={product.id}
                  data-index={idx}
                  onClick={() => setHighlightedIndex(idx)}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isHighlighted
                      ? 'bg-slate-800/90 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                      : 'bg-slate-900/80 hover:bg-slate-800/50 border-slate-800'
                  }`}
                >
                  {/* Product Details Column */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                      <Tag className="w-5 h-5 text-amber-400/80" />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm truncate">
                          {product.name}
                        </span>
                        {product.urduName && (
                          <span className="text-xs text-amber-300 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {product.urduName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                        <span className="font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300 text-[11px]">
                          SKU: {product.sku}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                          {product.category}
                        </span>
                        {product.barcode && (
                          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                            <ScanLine className="w-3 h-3 text-slate-500" />
                            {product.barcode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Stock Status Column */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    <div className="text-left sm:text-right space-y-0.5">
                      <div className="text-base font-black text-amber-400 font-mono">
                        Rs {product.sellingPrice.toLocaleString()}
                        <span className="text-xs font-normal text-slate-400 ml-1">/{product.unit}</span>
                      </div>
                      <div>
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                            Out of Stock (0 {product.unit})
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            Low Stock: {product.stock} {product.unit}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            {product.stock} {product.unit} available
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {failedBarcode && onLinkBarcodeAndAdd && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLinkBarcodeAndAdd(product, failedBarcode);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          title={`Link barcode ${failedBarcode} to this product and add to cart`}
                        >
                          <Link className="w-3.5 h-3.5 text-blue-400" />
                          <span className="hidden md:inline">Link & Add</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProduct(product);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Cart</span>
                        {isHighlighted && <CornerDownLeft className="w-3 h-3 ml-0.5 text-slate-900 opacity-60" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-400 text-[11px] flex items-center gap-2">
            <span className="hidden sm:inline">Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Esc</kbd> to dismiss</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
