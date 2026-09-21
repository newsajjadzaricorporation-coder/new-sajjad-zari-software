import React, { useState } from 'react';
import { motion, PanInfo } from 'motion/react';
import { Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';
import { CartItem } from '../../types';

interface SwipeableCartItemProps {
  item: CartItem;
  onRemove: (productId: string) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onUpdateUnitPrice: (productId: string, price: number) => void;
}

export const SwipeableCartItem: React.FC<SwipeableCartItemProps> = React.memo(({
  item,
  onRemove,
  onUpdateQuantity,
  onUpdateUnitPrice,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragOffset(info.offset.x);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // If dragged sufficiently left (e.g., past -75px or rapid left flick)
    if (info.offset.x < -75 || info.velocity.x < -400) {
      setIsDeleting(true);
      setTimeout(() => {
        onRemove(item.product.id);
      }, 200);
    } else {
      setDragOffset(0);
    }
  };

  const isTriggerThreshold = dragOffset < -60;

  return (
    <div className="relative overflow-hidden rounded-xl group select-none touch-pan-y">
      {/* Background Revealed on Swipe Left */}
      <div
        className={`absolute inset-0 flex items-center justify-end px-4 transition-colors rounded-xl ${
          isTriggerThreshold ? 'bg-red-600' : 'bg-red-900/60'
        }`}
        aria-hidden="true"
      >
        <div className="flex items-center gap-2 text-white font-bold text-xs tracking-wide">
          <span className="hidden sm:inline">
            {isTriggerThreshold ? 'Release to Delete' : 'Swipe left to remove'}
          </span>
          <span className="sm:hidden font-urdu text-sm">حذف کریں</span>
          <Trash2
            className={`w-5 h-5 transition-transform duration-200 ${
              isTriggerThreshold ? 'scale-125 text-white animate-pulse' : 'text-red-300'
            }`}
          />
        </div>
      </div>

      {/* Foreground Swipeable Item Card */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={{ left: 0.2, right: 0.05 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={isDeleting ? { x: -400, opacity: 0 } : { x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="relative z-10 bg-slate-900/95 hover:bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 shadow-sm cursor-grab active:cursor-grabbing transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-semibold text-white leading-tight truncate">
              {item.product.name}
            </h5>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
              <span>SKU: {item.product.sku}</span>
              <span>•</span>
              <span>Unit: {item.product.unit}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.product.id);
              }}
              className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition"
              title="Remove item (or swipe left)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Price, Stepper & Subtotal */}
        <div
          className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/60"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Unit Price Editable input */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 text-[11px]">Rate:</span>
            <input
              type="number"
              aria-label="Unit Price"
              value={item.unitPrice}
              onChange={(e) =>
                onUpdateUnitPrice(item.product.id, parseFloat(e.target.value) || 0)
              }
              onPointerDown={(e) => e.stopPropagation()}
              className="w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white text-right focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>

          {/* Quantity Stepper */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQuantity(item.product.id, -1);
              }}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white active:scale-95 transition"
              title="Decrease quantity"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-8 text-center text-xs font-bold text-white select-none">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQuantity(item.product.id, 1);
              }}
              disabled={item.quantity >= item.product.stock}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40 active:scale-95 transition"
              title="Increase quantity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Subtotal */}
          <div className="text-right">
            <span className="text-xs font-bold text-amber-400 font-mono">
              Rs {item.subtotal.toLocaleString()}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
});
