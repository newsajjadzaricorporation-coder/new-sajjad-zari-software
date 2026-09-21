import React, { useState, useEffect } from 'react';
import { Delete, Check, X, Calculator } from 'lucide-react';

interface POSNumericKeypadProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialValue?: string | number;
  unitLabel?: string;
  onApply: (value: string) => void;
}

export const POSNumericKeypad: React.FC<POSNumericKeypadProps> = React.memo(({
  isOpen,
  onClose,
  title = 'Numeric Touch Keypad',
  initialValue = '',
  unitLabel = 'Rs',
  onApply,
}) => {
  const [value, setValue] = useState<string>(String(initialValue ?? ''));

  useEffect(() => {
    if (isOpen) {
      setValue(String(initialValue ?? ''));
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleKeyPress = (digit: string) => {
    if (digit === '.') {
      if (value.includes('.')) return;
      setValue((prev) => (prev === '' ? '0.' : prev + '.'));
      return;
    }
    if (digit === '00') {
      if (value === '0' || value === '') return;
      setValue((prev) => prev + '00');
      return;
    }
    if (value === '0') {
      setValue(digit);
    } else {
      setValue((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setValue((prev) => (prev.length <= 1 ? '' : prev.slice(0, -1)));
  };

  const handleClear = () => {
    setValue('');
  };

  const handleQuickAdd = (amount: number) => {
    const currentNum = parseFloat(value) || 0;
    setValue(String(currentNum + amount));
  };

  const handleConfirm = () => {
    onApply(value);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xs sm:max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display Screen */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex flex-col items-end justify-center min-h-[72px]">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Target Value ({unitLabel})
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400 tracking-tight truncate max-w-full">
            {value || '0'} <span className="text-xs text-slate-500 font-sans font-normal">{unitLabel}</span>
          </div>
        </div>

        {/* Quick Denominations (if currency mode) */}
        {unitLabel === 'Rs' && (
          <div className="grid grid-cols-4 gap-1.5 p-3 bg-slate-900/80 border-b border-slate-800">
            {[50, 100, 500, 1000].map((amt) => (
              <button
                key={`add-${amt}`}
                type="button"
                onClick={() => handleQuickAdd(amt)}
                className="py-1.5 px-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 transition active:scale-95 cursor-pointer"
              >
                +{amt}
              </button>
            ))}
          </div>
        )}

        {/* Keypad Grid */}
        <div className="p-3.5 grid grid-cols-3 gap-2 bg-slate-900">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '00', '.'].map((key) => (
            <button
              key={`key-${key}`}
              type="button"
              onClick={() => handleKeyPress(key)}
              className="h-13 sm:h-14 bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/80 rounded-2xl text-xl sm:text-2xl font-black text-slate-100 shadow-sm transition active:scale-95 flex items-center justify-center cursor-pointer select-none"
            >
              {key}
            </button>
          ))}
        </div>

        {/* Action Row */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="py-3 px-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-2xl text-xs font-extrabold uppercase transition cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="py-3 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <Delete className="w-4 h-4 text-amber-400" />
            <span>Delete</span>
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="py-3 px-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-2xl text-xs uppercase shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
});
