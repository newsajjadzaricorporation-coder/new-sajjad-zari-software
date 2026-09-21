import React from 'react';
import { Edit2, Trash2, Layers } from 'lucide-react';
import { Product } from '../../types';

interface InventoryProductRowProps {
  product: Product;
  isAdmin: boolean;
  isSelected: boolean;
  searchQuery: string;
  onToggleSelect: (id: string) => void;
  onQuickStock: (id: string, delta: number) => void;
  onOpenQuickAdjust: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  highlightMatch: (text?: string | null, query?: string) => React.ReactNode;
}

export const InventoryProductRow: React.FC<InventoryProductRowProps> = React.memo(({
  product: p,
  isAdmin,
  isSelected,
  searchQuery,
  onToggleSelect,
  onQuickStock,
  onOpenQuickAdjust,
  onEditProduct,
  onDeleteProduct,
  highlightMatch,
}) => {
  const isOutOfStock = p.stock <= 0;
  const isLow = p.stock > 0 && p.stock <= p.minStockAlert;
  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <tr
      className={`transition group ${
        isSelected
          ? 'bg-amber-500/20 hover:bg-amber-500/25'
          : isSearchActive
          ? 'bg-amber-500/10 border-l-4 border-l-amber-400 hover:bg-amber-500/15 shadow-sm'
          : 'hover:bg-slate-900/50'
      }`}
    >
      {/* Checkbox */}
      <td className="p-3.5 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(p.id)}
          aria-label={`Select ${p.name}`}
          className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 w-4 h-4 bg-slate-800 cursor-pointer"
        />
      </td>

      {/* Name */}
      <td className="p-3.5">
        <div className="font-bold text-white text-sm">
          {highlightMatch(p.name, searchQuery)}
        </div>
        {p.urduName && (
          <div className="font-urdu text-amber-400/90 text-xs mt-0.5">
            {highlightMatch(p.urduName, searchQuery)}
          </div>
        )}
        {p.notes && <div className="text-[11px] text-slate-500 italic mt-0.5">{p.notes}</div>}
      </td>

      {/* Category */}
      <td className="p-3.5 text-slate-300 font-medium">{p.category}</td>

      {/* SKU & Barcode */}
      <td className="p-3.5 font-mono">
        <div className="text-amber-300/90 font-semibold">
          {highlightMatch(p.sku, searchQuery)}
        </div>
        <div className="text-[11px] text-slate-500">
          {highlightMatch(p.barcode, searchQuery)}
        </div>
      </td>

      {/* Cost (Admin Only) */}
      {isAdmin && (
        <td className="p-3.5 text-right text-slate-400 font-medium">
          Rs {p.costPrice.toLocaleString()}
        </td>
      )}

      {/* Selling Price */}
      <td className="p-3.5 text-right font-bold text-white">
        Rs {p.sellingPrice.toLocaleString()}
        <span className="text-[10px] text-slate-500 font-normal"> /{p.unit}</span>
      </td>

      {/* Stock Level Badge */}
      <td className="p-3.5 text-center">
        <span
          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
            isOutOfStock
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : isLow
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-400'
          }`}
        >
          {p.stock} {p.unit}
        </span>
      </td>

      {/* Quick Stock Controls & Popover */}
      <td className="p-3.5 text-center">
        <div className="inline-flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => onQuickStock(p.id, -1)}
            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
            title="Quick -1 unit"
          >
            -1
          </button>
          <button
            type="button"
            onClick={() => onQuickStock(p.id, 1)}
            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
            title="Quick +1 unit"
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => onOpenQuickAdjust(p)}
            className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
            title="Open Quick Adjust stock dialog"
          >
            <Layers className="w-3 h-3" />
            Adjust
          </button>
        </div>
      </td>

      {/* Edit & Delete Actions */}
      <td className="p-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onEditProduct(p)}
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Edit Product"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteProduct(p)}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition border border-transparent hover:border-red-500/20 cursor-pointer"
            title="Delete Product"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});
