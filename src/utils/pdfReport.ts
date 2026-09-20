import { jsPDF } from 'jspdf';
import { Product, SaleInvoice } from '../types';

export interface ProfitReportData {
  products: Product[];
  sales: SaleInvoice[];
  productMargins: Array<{
    id: string;
    name: string;
    category?: string;
    cost: number;
    selling: number;
    profitRs: number;
    marginPct: number;
    isLoss: boolean;
    stock: number;
    unit?: string;
  }>;
  analyticsSummary: {
    highCount: number;
    moderateCount: number;
    lossCount: number;
    avgMargin: number;
    estimatedMonthlyRunRate: number;
    projectedProfit: number;
  };
  shopName?: string;
}

export function generateProfitReportPDF(data: ProfitReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text(data.shopName || 'NEW SAJJAD ZARI CORPORATION', margin, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('INVENTORY PROFITABILITY & TRENDS EXECUTIVE REPORT', margin, 18);

  const reportDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${reportDate}`, pageWidth - margin - doc.getTextWidth(`Generated: ${reportDate}`), 18);

  y = 36;

  // Section: Executive Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Executive Margin & Revenue Summary', margin, y);
  y += 5;

  // Summary Metrics Grid (Boxes)
  const boxWidth = (pageWidth - margin * 2 - 9) / 4;
  const boxHeight = 18;

  const summaryBoxes = [
    { label: 'Avg Profit Margin', value: `${data.analyticsSummary.avgMargin}%`, color: [16, 185, 129] },
    { label: 'High Margin (>=25%)', value: `${data.analyticsSummary.highCount} items`, color: [245, 158, 11] },
    { label: 'Moderate Margin (5-24%)', value: `${data.analyticsSummary.moderateCount} items`, color: [59, 130, 246] },
    { label: 'Loss / Thin Margin (<5%)', value: `${data.analyticsSummary.lossCount} items`, color: [239, 68, 68] },
  ];

  summaryBoxes.forEach((b, i) => {
    const bx = margin + i * (boxWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(bx, y, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(b.label, bx + 3, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.text(b.value, bx + 3, y + 14);
  });

  y += boxHeight + 8;

  // Valuation Details
  const totalStockUnits = data.products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalCostVal = data.products.reduce((sum, p) => sum + (p.stock || 0) * (p.costPrice || 0), 0);
  const totalRetailVal = data.products.reduce((sum, p) => sum + (p.stock || 0) * (p.sellingPrice || 0), 0);
  const totalGrossProfit = totalRetailVal - totalCostVal;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total Active Products: ${data.products.length}   |   Total Stock Units: ${totalStockUnits.toLocaleString()}`, margin + 4, y + 6);
  doc.text(
    `Stock Cost: Rs ${totalCostVal.toLocaleString()}   |   Stock Retail Value: Rs ${totalRetailVal.toLocaleString()}   |   Projected Stock Profit: Rs ${totalGrossProfit.toLocaleString()}`,
    margin + 4,
    y + 11.5
  );

  y += 24;

  // Section: Top Margin Drivers (Table)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Top High-Margin Product Drivers', margin, y);
  y += 5;

  // Table Headers
  const colX = {
    name: margin + 2,
    cat: margin + 70,
    cost: margin + 105,
    sell: margin + 125,
    profit: margin + 145,
    margin: margin + 165,
  };

  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Product Name', colX.name, y + 4.5);
  doc.text('Category', colX.cat, y + 4.5);
  doc.text('Cost (Rs)', colX.cost, y + 4.5);
  doc.text('Sell (Rs)', colX.sell, y + 4.5);
  doc.text('Profit (Rs)', colX.profit, y + 4.5);
  doc.text('Margin %', colX.margin, y + 4.5);
  y += 7;

  // Sort top items by margin percentage descending
  const sortedTop = [...data.productMargins]
    .filter((p) => !p.isLoss)
    .sort((a, b) => b.marginPct - a.marginPct)
    .slice(0, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  sortedTop.forEach((item, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
    }

    doc.setTextColor(15, 23, 42);
    // Truncate long name if necessary
    const truncatedName = item.name.length > 38 ? `${item.name.slice(0, 35)}...` : item.name;
    doc.text(truncatedName, colX.name, y + 4.2);

    doc.setTextColor(100, 116, 139);
    doc.text((item.category || 'General').slice(0, 18), colX.cat, y + 4.2);

    doc.text(item.cost.toLocaleString(), colX.cost, y + 4.2);
    doc.text(item.selling.toLocaleString(), colX.sell, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`+${item.profitRs.toLocaleString()}`, colX.profit, y + 4.2);

    doc.text(`${item.marginPct}%`, colX.margin, y + 4.2);
    doc.setFont('helvetica', 'normal');

    y += 6;
  });

  y += 6;

  // Section 3: Low or Negative Margin Warning List
  const warningItems = data.productMargins.filter((p) => p.marginPct < 10 || p.isLoss).slice(0, 8);
  if (warningItems.length > 0 && y < 250) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text('3. Margin Attention Items (Thin or Negative Margins)', margin, y);
    y += 5;

    doc.setFillColor(254, 242, 242);
    doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(153, 27, 27);
    doc.text('Product Name', colX.name, y + 4);
    doc.text('Cost', colX.cost, y + 4);
    doc.text('Sell', colX.sell, y + 4);
    doc.text('Profit', colX.profit, y + 4);
    doc.text('Status / Margin', colX.margin, y + 4);
    y += 6;

    warningItems.forEach((w) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(185, 28, 28);
      doc.text(w.name.slice(0, 40), colX.name, y + 4);
      doc.text(w.cost.toLocaleString(), colX.cost, y + 4);
      doc.text(w.selling.toLocaleString(), colX.sell, y + 4);
      doc.text(w.profitRs.toLocaleString(), colX.profit, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.text(w.isLoss ? `LOSS (${w.marginPct}%)` : `${w.marginPct}% Thin`, colX.margin, y + 4);
      y += 5.5;
    });
  }

  // Footer Note & Page Number
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'New Sajjad Zari Corporation • Confidential Internal Business Intelligence Report • Stored Offline & Encrypted',
    margin,
    footerY
  );
  doc.text('Page 1 of 1', pageWidth - margin - 15, footerY);

  // Save to file
  const filename = `NSZC_Profit_Trends_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
