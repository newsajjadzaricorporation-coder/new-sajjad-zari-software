import React, { useState, useEffect } from 'react';
import { X, Trash2, Sparkles, Check, Barcode } from 'lucide-react';
import { Product, UnitType } from '../../types';

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Partial<Product> | null;
  isAdmin: boolean;
  onSave: (product: Partial<Product>) => void;
  onDelete?: () => void;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  isOpen,
  onClose,
  product,
  isAdmin,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    urduName: '',
    category: 'Zari & Tilla Threads',
    sku: '',
    barcode: '',
    costPrice: 100,
    sellingPrice: 150,
    stock: 50,
    minStockAlert: 15,
    unit: 'roll',
    notes: '',
  });

  // Sync form data when modal opens or initial product changes
  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        ...product,
        costPrice: product.costPrice ?? 100,
        sellingPrice: product.sellingPrice ?? 150,
        stock: product.stock ?? 50,
        minStockAlert: product.minStockAlert ?? 15,
        unit: product.unit || 'roll',
        category: product.category || 'Zari & Tilla Threads',
      });
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const isNewProduct = !product.createdAt || product.id?.startsWith('prod-');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.sku?.trim()) return;
    onSave(formData);
  };

  const handleGenerateSKU = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prefix = formData.category?.substring(0, 3).toUpperCase() || 'ZAR';
    setFormData((prev) => ({ ...prev, sku: `${prefix}-${randomSuffix}` }));
  };

  const handleGenerateBarcode = () => {
    const randomBarcode = `890${Math.floor(10000000 + Math.random() * 90000000)}`;
    setFormData((prev) => ({ ...prev, barcode: randomBarcode }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 my-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>{isNewProduct ? 'Add New Zari Product' : 'Edit Product Details'}</span>
              {isNewProduct && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Instant Save
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isNewProduct ? 'Fill in product specs to add to real-time inventory' : `Updating SKU: ${product.sku}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
          {/* Product Name (English) */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Product Name (English) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Pure Gold Tilla Reel 500m"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition"
              autoFocus
            />
          </div>

          {/* Product Urdu Title */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Product Urdu Title (اردو نام)</label>
            <input
              type="text"
              value={formData.urduName || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, urduName: e.target.value }))}
              placeholder="مثال: خالص گولڈ تلہ ریل ۵۰۰ میٹر"
              className="w-full font-urdu bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-amber-300 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Category</label>
              <input
                type="text"
                value={formData.category || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="e.g. Zari & Tilla Threads"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Unit of Measure</label>
              <select
                aria-label="Unit of Measure"
                value={formData.unit || 'piece'}
                onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value as UnitType }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400 transition cursor-pointer"
              >
                <option value="meter">Meter</option>
                <option value="yard">Yard (Ghaz)</option>
                <option value="roll">Roll / Reel</option>
                <option value="piece">Piece (Thaan)</option>
                <option value="packet">Packet</option>
                <option value="dozen">Dozen</option>
                <option value="box">Box</option>
              </select>
            </div>
          </div>

          {/* SKU & Barcode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">
                  SKU / Item Code <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSKU}
                  className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer"
                  title="Generate random SKU"
                >
                  <Sparkles className="w-3 h-3" /> Auto
                </button>
              </div>
              <input
                type="text"
                required
                value={formData.sku || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                className="w-full font-mono bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400 transition"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">Barcode</label>
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer"
                  title="Generate EAN-13 style Barcode"
                >
                  <Barcode className="w-3 h-3" /> Auto
                </button>
              </div>
              <input
                type="text"
                value={formData.barcode || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
                className="w-full font-mono bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          </div>

          {/* Cost Price & Selling Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Purchase Cost Price (Rs) {isAdmin ? '' : '(Hidden)'}
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={formData.costPrice ?? 0}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400 disabled:opacity-50 transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Selling Price (Rs) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                value={formData.sellingPrice ?? 0}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }))
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold text-amber-400 focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          </div>

          {/* Stock Qty & Min Stock Alert */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Current Stock Qty</label>
              <input
                type="number"
                value={formData.stock ?? 0}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stock: parseFloat(e.target.value) || 0 }))
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Low-Stock Alert Level</label>
              <input
                type="number"
                value={formData.minStockAlert ?? 10}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, minStockAlert: parseFloat(e.target.value) || 10 }))
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Notes / Specifications</label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Material specs, manufacturer, origin, etc."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-800">
            {!isNewProduct && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Permanently remove this product from inventory"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Product
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 text-xs cursor-pointer transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Save Product
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
