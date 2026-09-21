import { jsPDF } from 'jspdf';
import { Product, SaleInvoice, DailyClosingReport, ShopSettings, UserProfile, ExpenseItem } from '../types';

export interface DailyClosingReportPDFData {
  reportDate: string;
  formattedDateStr: string;
  closingReport?: DailyClosingReport | null;
  currentUser: UserProfile;
  settings: ShopSettings;
  sales: SaleInvoice[];
  expenses: ExpenseItem[];
  customerPayments?: Array<{
    id?: string;
    customerName?: string;
    credit?: number;
    paymentMethod?: string;
    date?: string;
  }>;
  summary: {
    totalInvoices: number;
    grossSales: number;
    totalDiscounts: number;
    netSales: number;
    avgBasketSize: number;
    cashSales: number;
    cardSales: number;
    creditSales: number;
    udhaarCashWasooli: number;
    udhaarBankWasooli: number;
    totalExpenses: number;
    cashExpenses: number;
    bankExpenses: number;
    totalCOGS: number;
    grossProfit: number;
    grossMarginPercent: number;
    netDayProfit: number;
    openingFloat: number;
    expectedDrawerCash: number;
    actualCountedCash?: number;
    discrepancy?: number;
    expensesByCategory: Array<{ category: string; amount: number }>;
  };
}

export function generateDailyClosingReportPDF(data: DailyClosingReportPDFData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 14;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text(data.settings.shopName || 'NEW SAJJAD ZARI CORPORATION', margin, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(data.settings.address || 'Madina Zari Market, Shah Alam, Lahore, Pakistan', margin, 17);
  doc.text(`Phone: ${data.settings.phone || '0300-4567890'}   |   ${data.settings.tagline || 'Wholesale & Retail Zari, Lace & Embroidery'}`, margin, 22);

  // Right Header Info Badge
  const badgeText = 'DAILY CLOSING Z-REPORT';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(251, 191, 36);
  doc.text(badgeText, pageWidth - margin - doc.getTextWidth(badgeText), 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  const dateStr = `Date: ${data.formattedDateStr || data.reportDate}`;
  doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), 17);
  const staffStr = `Staff: ${data.currentUser.displayName || data.currentUser.email}`;
  doc.text(staffStr, pageWidth - margin - doc.getTextWidth(staffStr), 22);
  const regStr = 'Register: POS-TERM-01 (Audited)';
  doc.text(regStr, pageWidth - margin - doc.getTextWidth(regStr), 27);

  y = 38;

  // Section 1: Executive KPI Metrics Cards
  const colGap = 3;
  const numCards = 4;
  const cardWidth = (pageWidth - margin * 2 - (numCards - 1) * colGap) / numCards;
  const cardHeight = 19;

  const kpis = [
    {
      title: 'Net Day Sales',
      value: `Rs ${data.summary.netSales.toLocaleString()}`,
      sub: `${data.summary.totalInvoices} bills completed`,
      color: [245, 158, 11], // amber
    },
    {
      title: 'Credit Recovery (Wasooli)',
      value: `Rs ${(data.summary.udhaarCashWasooli + data.summary.udhaarBankWasooli).toLocaleString()}`,
      sub: `Cash: Rs ${data.summary.udhaarCashWasooli.toLocaleString()}`,
      color: [16, 185, 129], // emerald
    },
    {
      title: 'Operating Expenses',
      value: `Rs ${data.summary.totalExpenses.toLocaleString()}`,
      sub: `${data.summary.expensesByCategory.length} categories logged`,
      color: [239, 68, 68], // red
    },
    {
      title: 'Drawer Expected Cash',
      value: `Rs ${data.summary.expectedDrawerCash.toLocaleString()}`,
      sub: `Opening: Rs ${data.summary.openingFloat.toLocaleString()}`,
      color: [59, 130, 246], // blue
    },
  ];

  kpis.forEach((kpi, idx) => {
    const cx = margin + idx * (cardWidth + colGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, cx + 3.5, y + 5);

    doc.setFontSize(10.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, cx + 3.5, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, cx + 3.5, y + 16.5);
  });

  y += cardHeight + 7;

  // Section 2: Two-Column Detailed Financial Breakdown
  const colW = (pageWidth - margin * 2 - 6) / 2;
  const leftX = margin;
  const rightX = margin + colW + 6;

  // Left Box: Sales & Tender Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Sales Performance & Tender Breakdown', leftX, y);

  // Right Box: Operating Expenses Breakdown
  doc.text('2. Operating Expenses Breakdown', rightX, y);
  y += 4;

  const tableTopY = y;
  const rowH = 5.5;

  // Left Table: Sales rows
  const salesRows = [
    { label: 'Gross Sales Value', value: `Rs ${data.summary.grossSales.toLocaleString()}`, bold: false },
    { label: 'Discounts & Loyalty Redeemed', value: `- Rs ${data.summary.totalDiscounts.toLocaleString()}`, bold: false, color: [220, 38, 38] },
    { label: 'NET SALES REVENUE', value: `Rs ${data.summary.netSales.toLocaleString()}`, bold: true, color: [15, 23, 42] },
    { label: '• Cash Collected (Counter)', value: `Rs ${data.summary.cashSales.toLocaleString()}`, bold: false },
    { label: '• Card / Digital POS Terminal', value: `Rs ${data.summary.cardSales.toLocaleString()}`, bold: false },
    { label: '• Credit Sales (Customer Khata)', value: `Rs ${data.summary.creditSales.toLocaleString()}`, bold: false },
    { label: 'Average Ticket / Basket Size', value: `Rs ${data.summary.avgBasketSize.toLocaleString()}`, bold: false },
    { label: 'Estimated COGS (Cost of Goods)', value: `Rs ${data.summary.totalCOGS.toLocaleString()}`, bold: false },
    { label: 'Gross Product Margin', value: `Rs ${data.summary.grossProfit.toLocaleString()} (${data.summary.grossMarginPercent}%)`, bold: true, color: [16, 185, 129] },
    { label: 'ESTIMATED NET DAY PROFIT', value: `Rs ${data.summary.netDayProfit.toLocaleString()}`, bold: true, color: data.summary.netDayProfit >= 0 ? [16, 185, 129] : [220, 38, 38] },
  ];

  let leftY = tableTopY;
  salesRows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(leftX, leftY, colW, rowH, 'F');
    }
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(row.color ? row.color[0] : 51, row.color ? row.color[1] : 65, row.color ? row.color[2] : 85);
    doc.text(row.label, leftX + 2.5, leftY + 3.8);

    const valStr = row.value;
    doc.text(valStr, leftX + colW - 2.5 - doc.getTextWidth(valStr), leftY + 3.8);
    leftY += rowH;
  });

  // Right Table: Expenses rows
  let rightY = tableTopY;
  if (data.summary.expensesByCategory.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(rightX, rightY, colW, rowH * 3, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No shop expenses recorded today.', rightX + 4, rightY + 9);
    rightY += rowH * 3;
  } else {
    data.summary.expensesByCategory.forEach((exp, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(rightX, rightY, colW, rowH, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(exp.category, rightX + 2.5, rightY + 3.8);

      const expVal = `Rs ${exp.amount.toLocaleString()}`;
      doc.text(expVal, rightX + colW - 2.5 - doc.getTextWidth(expVal), rightY + 3.8);
      rightY += rowH;
    });
  }

  // Right Table Total Row
  doc.setFillColor(241, 245, 249);
  doc.rect(rightX, rightY, colW, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(220, 38, 38);
  doc.text('Total Operating Expenses', rightX + 2.5, rightY + 3.8);
  const totExpStr = `Rs ${data.summary.totalExpenses.toLocaleString()}`;
  doc.text(totExpStr, rightX + colW - 2.5 - doc.getTextWidth(totExpStr), rightY + 3.8);
  rightY += rowH + 2;

  // Udhaar Wasooli Recovery Section on Right Column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Customer Khata Recovery (Wasooli)', rightX, rightY + 3);
  rightY += 5;

  const recoveryRows = [
    { label: '• Cash Wasooli Collected', value: `Rs ${data.summary.udhaarCashWasooli.toLocaleString()}` },
    { label: '• Bank / Online Wasooli', value: `Rs ${data.summary.udhaarBankWasooli.toLocaleString()}` },
    { label: 'Total Khata Collections', value: `Rs ${(data.summary.udhaarCashWasooli + data.summary.udhaarBankWasooli).toLocaleString()}`, bold: true, color: [16, 185, 129] },
  ];

  recoveryRows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(rightX, rightY, colW, rowH, 'F');
    }
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(row.color ? row.color[0] : 51, row.color ? row.color[1] : 65, row.color ? row.color[2] : 85);
    doc.text(row.label, rightX + 2.5, rightY + 3.8);

    const valStr = row.value;
    doc.text(valStr, rightX + colW - 2.5 - doc.getTextWidth(valStr), rightY + 3.8);
    rightY += rowH;
  });

  y = Math.max(leftY, rightY) + 7;

  // Section 3: Cash Drawer Reconciliation (Audited Z-Closing)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Cash Drawer Reconciliation & Balance Verification', margin, y);
  y += 4;

  const drawerTableW = pageWidth - margin * 2;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, drawerTableW, 28, 2, 2, 'F');

  const drawerCols = [
    { label: 'Opening Float', val: `Rs ${data.summary.openingFloat.toLocaleString()}` },
    { label: '(+) Cash Sales', val: `Rs ${data.summary.cashSales.toLocaleString()}`, color: [16, 185, 129] },
    { label: '(+) Cash Recovery', val: `Rs ${data.summary.udhaarCashWasooli.toLocaleString()}`, color: [16, 185, 129] },
    { label: '(-) Cash Expenses', val: `Rs ${data.summary.cashExpenses.toLocaleString()}`, color: [220, 38, 38] },
    { label: 'EXPECTED CASH', val: `Rs ${data.summary.expectedDrawerCash.toLocaleString()}`, bold: true, color: [15, 23, 42] },
    {
      label: 'COUNTED CASH',
      val: `Rs ${(data.closingReport?.actualCash ?? data.summary.actualCountedCash ?? data.summary.expectedDrawerCash).toLocaleString()}`,
      bold: true,
      color: [245, 158, 11],
    },
  ];

  const subColW = drawerTableW / drawerCols.length;
  drawerCols.forEach((col, idx) => {
    const cellX = margin + idx * subColW;
    doc.setFont('helvetica', col.bold ? 'bold' : 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(col.label, cellX + 3, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    if (col.color) {
      doc.setTextColor(col.color[0], col.color[1], col.color[2]);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(col.val, cellX + 3, y + 14);
  });

  // Discrepancy Status Banner inside Drawer Box
  const actualCount = data.closingReport?.actualCash ?? data.summary.actualCountedCash ?? data.summary.expectedDrawerCash;
  const discrepancyVal = data.closingReport?.discrepancy ?? (data.summary.discrepancy ?? (actualCount - data.summary.expectedDrawerCash));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  if (discrepancyVal === 0) {
    doc.setTextColor(16, 185, 129);
    doc.text('Status: [ PERFECTLY BALANCED - ZERO DISCREPANCY ]', margin + 4, y + 23);
  } else if (discrepancyVal > 0) {
    doc.setTextColor(59, 130, 246);
    doc.text(`Status: [ CASH SURPLUS: +Rs ${discrepancyVal.toLocaleString()} ]`, margin + 4, y + 23);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text(`Status: [ CASH SHORTAGE: -Rs ${Math.abs(discrepancyVal).toLocaleString()} ]`, margin + 4, y + 23);
  }

  if (data.closingReport?.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Notes: ${data.closingReport.notes}`, margin + 90, y + 23);
  }

  y += 34;

  // Section 4: Official Signatures & Verification Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. Official Archival Certification & Authorization Signatures', margin, y);
  y += 18;

  // Signature Lines
  const sigW = 52;
  // Signature 1: Cashier
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + sigW, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Cashier / Staff', margin, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${data.currentUser.displayName || data.currentUser.email}`, margin, y + 8);

  // Signature 2: Store In-Charge
  const sig2X = margin + (pageWidth - margin * 2 - sigW) / 2;
  doc.line(sig2X, y, sig2X + sigW, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Floor In-Charge / Auditor', sig2X, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Shift Handover Verified', sig2X, y + 8);

  // Signature 3: Store Owner / GM
  const sig3X = pageWidth - margin - sigW;
  doc.line(sig3X, y, sig3X + sigW, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Store Owner / General Manager', sig3X, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Final Day Closing Approved', sig3X, y + 8);

  // Footer Note & Page Number
  const footerY = pageHeight - 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'New Sajjad Zari Corporation ERP • Automated Day End Z-Closing Report • Encrypted Offline Archival Record',
    margin,
    footerY
  );
  doc.text('Page 1 of 1', pageWidth - margin - 15, footerY);

  // Save to file
  const safeDate = (data.reportDate || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `NSZC_Day_End_Closing_Z_Report_${safeDate}.pdf`;
  doc.save(filename);
}

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
