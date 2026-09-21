import React, { useRef, useEffect } from 'react';
import { SaleInvoice, ShopSettings } from '../types';

interface ReceiptCanvasProps {
  sale: SaleInvoice;
  settings: ShopSettings;
  width?: number;
  layout?: 'thermal80' | 'thermal58' | 'a4';
  showLogo?: boolean;
  showUrduDetails?: boolean;
}

export const ReceiptCanvas: React.FC<ReceiptCanvasProps> = ({
  sale,
  settings,
  width = 384,
  layout = 'thermal80',
  showLogo = true,
  showUrduDetails = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasWidth = layout === 'thermal58' ? 280 : layout === 'thermal80' ? 384 : 595;
    const itemHeight = 24;
    const headerHeight = showLogo ? 160 : 120;
    const footerHeight = 180;
    const estimatedHeight = headerHeight + (sale.items ? sale.items.length * itemHeight : 0) + footerHeight;

    canvas.width = canvasWidth;
    canvas.height = estimatedHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, estimatedHeight);

    // Styling
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    let y = 30;

    // Header Shop Name
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(settings.shopName || 'NEW SAJJAD ZARI CORP', canvasWidth / 2, y);
    y += 20;

    if (showUrduDetails && settings.urduTitle) {
      ctx.font = '14px sans-serif';
      ctx.fillText(settings.urduTitle, canvasWidth / 2, y);
      y += 18;
    }

    ctx.font = '11px sans-serif';
    if (settings.phone) {
      ctx.fillText(`Phone: ${settings.phone}`, canvasWidth / 2, y);
      y += 16;
    }
    if (settings.address) {
      ctx.fillText(settings.address, canvasWidth / 2, y);
      y += 18;
    }

    // Divider
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(canvasWidth - 10, y);
    ctx.stroke();
    y += 18;

    // Invoice Meta
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`Invoice: #${sale.invoiceNo}`, 12, y);
    ctx.textAlign = 'right';
    ctx.fillText(`Date: ${sale.date ? sale.date.slice(0, 10) : ''}`, canvasWidth - 12, y);
    y += 20;

    if (sale.customerName) {
      ctx.textAlign = 'left';
      ctx.font = '11px sans-serif';
      ctx.fillText(`Customer: ${sale.customerName}`, 12, y);
      y += 18;
    }

    // Table Header
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(canvasWidth - 10, y);
    ctx.stroke();
    y += 16;

    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Item', 12, y);
    ctx.textAlign = 'center';
    ctx.fillText('Qty', canvasWidth - 90, y);
    ctx.textAlign = 'right';
    ctx.fillText('Amount', canvasWidth - 12, y);
    y += 10;

    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(canvasWidth - 10, y);
    ctx.stroke();
    y += 16;

    // Items
    ctx.font = '11px sans-serif';
    if (sale.items) {
      for (let i = 0; i < sale.items.length; i++) {
        const item = sale.items[i];
        const nameStr = item.product?.name ? item.product.name.slice(0, 20) : 'Item';
        ctx.textAlign = 'left';
        ctx.fillText(nameStr, 12, y);

        ctx.textAlign = 'center';
        ctx.fillText(`${item.quantity}`, canvasWidth - 90, y);

        ctx.textAlign = 'right';
        ctx.fillText(`Rs ${(item.subtotal || 0).toLocaleString()}`, canvasWidth - 12, y);

        y += itemHeight;
      }
    }

    // Divider
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(canvasWidth - 10, y);
    ctx.stroke();
    y += 20;

    // Totals
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Subtotal:', canvasWidth - 160, y);
    ctx.textAlign = 'right';
    ctx.fillText(`Rs ${(sale.subtotal || 0).toLocaleString()}`, canvasWidth - 12, y);
    y += 16;

    if (sale.discountAmount && sale.discountAmount > 0) {
      ctx.textAlign = 'left';
      ctx.fillText('Discount:', canvasWidth - 160, y);
      ctx.textAlign = 'right';
      ctx.fillText(`-Rs ${(sale.discountAmount || 0).toLocaleString()}`, canvasWidth - 12, y);
      y += 16;
    }

    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Grand Total:', canvasWidth - 160, y);
    ctx.textAlign = 'right';
    ctx.fillText(`Rs ${(sale.netTotal || 0).toLocaleString()}`, canvasWidth - 12, y);
    y += 22;

    // Footer
    ctx.textAlign = 'center';
    ctx.font = 'italic 11px sans-serif';
    ctx.fillText(settings.thermalFooterUrdu || 'Thank you for shopping with us!', canvasWidth / 2, y);
  }, [sale, settings, width, layout, showLogo, showUrduDetails]);

  return (
    <div className="flex justify-center items-center my-2 overflow-auto">
      <canvas
        ref={canvasRef}
        className="rounded shadow-md border border-slate-700 bg-white max-w-full"
      />
    </div>
  );
};
