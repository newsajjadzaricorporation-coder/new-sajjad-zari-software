import React from 'react';
import { Plus } from 'lucide-react';
import { Product } from '../../types';

interface POSProductCardProps {
  product: Product;
  searchQuery: string;
  inCartQuantity?: number;
  onAddToCart: (product: Product) => void;
  highlightPOSMatch: (text?: string | null, query?: string) => React.ReactNode;
}

export const POSProductCard: React.FC<POSProductCardProps> = React.memo(({
  product,
  searchQuery,
  inCartQuantity,
  onAddToCart,
  highlightPOSMatch,
}) => {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= product.minStockAlert;

  return (
    <button
      type="button"
      onClick={() => onAddToCart(product)}
      disabled={isOutOfStock}
      className={`relative text-left p-3.5 rounded-xl border transition flex flex-col justify-between group cursor-pointer ${
        isOutOfStock
          ? 'bg-slate-900/40 border-slate-800/60 opacity-60 cursor-not-allowed'
          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-amber-400/50 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Top badging */}
      <div className="flex items-start justify-between gap-1.5 w-full mb-2">
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
          {highlightPOSMatch(product.sku, searchQuery)}
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
          {highlightPOSMatch(product.name, searchQuery)}
        </h4>
        {product.urduName && (
          <p className="font-urdu text-xs text-amber-300/80 mt-0.5 line-clamp-1">
            {highlightPOSMatch(product.urduName, searchQuery)}
          </p>
        )}
        {searchQuery && product.category && (
          <span className="inline-block mt-1 text-[10px] text-slate-400 bg-slate-900/70 px-1.5 py-0.2 rounded border border-slate-800/80">
            {highlightPOSMatch(product.category, searchQuery)}
          </span>
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

        {inCartQuantity ? (
          <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center shadow">
            {inCartQuantity}
          </span>
        ) : (
          <div className="w-6 h-6 rounded-full bg-slate-700/60 group-hover:bg-amber-500/20 text-slate-400 group-hover:text-amber-400 flex items-center justify-center transition">
            <Plus className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </button>
  );
});
