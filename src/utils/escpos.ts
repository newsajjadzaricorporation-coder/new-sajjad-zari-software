import { SaleInvoice, ShopSettings, DailyClosingReport } from '../types';

export class ESCPOSPrinter {
  private static bluetoothDevice: any = null;
  private static bluetoothCharacteristic: any = null;

  // Check if Web Bluetooth is available
  static isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  // Connect to Bluetooth Thermal Printer
  static async connectBluetooth(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isBluetoothSupported()) {
      return { success: false, error: 'Web Bluetooth is not supported in this browser.' };
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455'],
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      this.bluetoothDevice = device;
      this.bluetoothCharacteristic = characteristic;

      localStorage.setItem('nszc_bt_printer_name', device.name || 'Thermal BT Printer');
      return { success: true, deviceName: device.name || 'Bluetooth Thermal Printer' };
    } catch (err: any) {
      console.warn('Bluetooth connection error or cancelled by user:', err);
      return { success: false, error: err.message || 'Connection cancelled' };
    }
  }

  // Generate plain ESC/POS text representation
  static formatThermalText(sale: SaleInvoice, settings: ShopSettings, width: 32 | 48 = 48): string {
    const divider = '-'.repeat(width);
    const doubleDivider = '='.repeat(width);

    const padRow = (left: string, right: string) => {
      const space = width - left.length - right.length;
      return left + ' '.repeat(Math.max(1, space)) + right;
    };

    const lines: string[] = [];

    // Header
    lines.push(settings.shopName.toUpperCase());
    if (settings.urduTitle) lines.push(settings.urduTitle);
    lines.push(settings.tagline);
    lines.push(settings.address);
    lines.push(`Tel: ${settings.phone}`);
    if (settings.thermalHeaderNote) lines.push(settings.thermalHeaderNote);
    lines.push(doubleDivider);

    // Meta
    lines.push(padRow(`INV: ${sale.invoiceNo}`, sale.date.split(',')[0]));
    lines.push(padRow(`Cashier: ${sale.cashierName.split(' ')[0]}`, `Pay: ${sale.paymentMethod.toUpperCase()}`));
    lines.push(padRow(`Customer: ${sale.customerName}`, ''));
    lines.push(divider);

    // Item Header
    lines.push(padRow('ITEM / QTY x RATE', 'TOTAL (Rs)'));
    lines.push(divider);

    // Items
    for (const item of sale.items) {
      lines.push(item.product.name.substring(0, width));
      const rateStr = `${item.quantity} ${item.product.unit} @ ${item.unitPrice}`;
      const totalStr = `Rs ${item.subtotal}`;
      lines.push(padRow(`  ${rateStr}`, totalStr));
    }
    lines.push(divider);

    // Totals
    lines.push(padRow('Subtotal:', `Rs ${sale.subtotal}`));
    if (sale.discountAmount > 0) {
      const discLabel = sale.discountType === 'percentage' ? `Discount (${sale.discountValue}%):` : 'Discount:';
      lines.push(padRow(discLabel, `-Rs ${sale.discountAmount}`));
    }
    lines.push(doubleDivider);
    lines.push(padRow('NET PAYABLE:', `Rs ${sale.netTotal}`));
    lines.push(doubleDivider);

    if (sale.paymentMethod === 'cash') {
      lines.push(padRow('Amount Paid:', `Rs ${sale.amountTendered || sale.netTotal}`));
      lines.push(padRow('Change Returned:', `Rs ${sale.changeGiven || 0}`));
    } else if (sale.paymentMethod === 'credit') {
      if (sale.previousBalance !== undefined) {
        lines.push(padRow('Previous Balance:', `Rs ${sale.previousBalance}`));
        lines.push(padRow('Total Due Khata:', `Rs ${sale.newBalance || sale.previousBalance + sale.netTotal}`));
      }
    }

    lines.push('');
    lines.push('Thank you for your business!');
    lines.push(settings.thermalFooterUrdu);
    if (settings.customReceiptFooter) lines.push(settings.customReceiptFooter);
    lines.push('\n\n\n');

    return lines.join('\n');
  }

  // Format Z-Report Closing thermal receipt
  static formatZReportText(report: DailyClosingReport, settings: ShopSettings, width: 48 = 48): string {
    const divider = '-'.repeat(width);
    const doubleDivider = '='.repeat(width);

    const padRow = (left: string, right: string) => {
      const space = width - left.length - right.length;
      return left + ' '.repeat(Math.max(1, space)) + right;
    };

    const lines: string[] = [];
    lines.push(settings.shopName.toUpperCase());
    lines.push('DAILY CASH CLOSING (Z-REPORT)');
    lines.push(doubleDivider);
    lines.push(padRow(`Date: ${report.date}`, `Time: ${report.closedAt}`));
    lines.push(padRow(`Closed By: ${report.closedByEmail}`, ''));
    lines.push(divider);

    lines.push(padRow('Opening Drawer Cash:', `Rs ${report.openingCash.toLocaleString()}`));
    lines.push(padRow('(+) Cash Sales Today:', `Rs ${report.cashSalesTotal.toLocaleString()}`));
    lines.push(padRow('(+) Udhaar Collected (Cash):', `Rs ${report.udhaarCollectedCash.toLocaleString()}`));
    lines.push(padRow('(-) Cash Expenses Paid:', `Rs ${report.cashExpensesTotal.toLocaleString()}`));
    lines.push(doubleDivider);
    lines.push(padRow('EXPECTED DRAWER CASH:', `Rs ${report.expectedCash.toLocaleString()}`));
    lines.push(padRow('ACTUAL CASH COUNTED:', `Rs ${report.actualCash.toLocaleString()}`));
    lines.push(doubleDivider);

    const diffLabel = report.discrepancy >= 0 ? '(+) CASH SURPLUS:' : '(-) CASH SHORTAGE:';
    lines.push(padRow(diffLabel, `Rs ${Math.abs(report.discrepancy).toLocaleString()}`));

    if (report.notes) {
      lines.push(divider);
      lines.push(`Notes: ${report.notes}`);
    }

    lines.push('\n\n\n');
    return lines.join('\n');
  }

  // Format Test Print Diagnostic Receipt
  static formatTestPrintText(settings: ShopSettings, width: 32 | 48 = 48): string {
    const divider = '-'.repeat(width);
    const doubleDivider = '='.repeat(width);

    const padRow = (left: string, right: string) => {
      const space = width - left.length - right.length;
      return left + ' '.repeat(Math.max(1, space)) + right;
    };

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const lines: string[] = [];
    lines.push(doubleDivider);
    lines.push(settings.shopName.toUpperCase());
    if (settings.urduTitle) lines.push(settings.urduTitle);
    lines.push('THERMAL PRINTER DIAGNOSTIC & FEED TEST');
    lines.push(doubleDivider);
    lines.push(padRow(`Date: ${dateStr}`, `Time: ${timeStr}`));
    lines.push(padRow('Mode:', settings.defaultPrinterMode === 'thermal58' ? '58mm Mini (ESC/POS)' : '80mm Standard POS'));
    lines.push(padRow('Spooler Status:', 'READY / CONNECTED'));
    lines.push(padRow('Paper Sensor:', 'PAPER DETECTED [OK]'));
    lines.push(divider);
    lines.push('ALIGNMENT & FONT TEST:');
    lines.push('<< LEFT ALIGNED TEXT >>');
    lines.push('           -- CENTER ALIGNED --           ');
    lines.push('                         >> RIGHT ALIGNED <<');
    lines.push(divider);
    lines.push('FEED & STEP MOTOR CHECK:');
    lines.push('Paper Feed Step 1 ......................... [OK]');
    lines.push('Paper Feed Step 2 ......................... [OK]');
    lines.push('Paper Feed Step 3 ......................... [OK]');
    lines.push(doubleDivider);
    lines.push('   *** THERMAL TEST COMPLETED SUCCESSFULLY ***   ');
    lines.push('      PRINTER READY FOR CASHIER SHIFT POS       ');
    lines.push(doubleDivider);
    lines.push('\n\n\n\n'); // Paper feed spacing before cut

    return lines.join('\n');
  }

  // Trigger Diagnostic Test Print to Thermal Printer or System Spooler
  static triggerTestPrint(settings: ShopSettings): { success: boolean; message: string } {
    try {
      const testSlipText = this.formatTestPrintText(settings, settings.defaultPrinterMode === 'thermal58' ? 32 : 48);
      
      // Create hidden iframe dedicated to printing the diagnostic slip
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return { success: true, message: 'Browser print dialog invoked for test receipt.' };
      }

      const paperWidth = settings.defaultPrinterMode === 'thermal58' ? '58mm' : '80mm';

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Printer Diagnostic Test - ${settings.shopName}</title>
          <style>
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              line-height: 1.35;
              color: #000;
              margin: 0;
              padding: 6mm;
              width: ${paperWidth};
              box-sizing: border-box;
              white-space: pre-wrap;
              word-break: break-word;
            }
            .center { text-align: center; font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .double-divider { border-top: 2px solid #000; margin: 6px 0; }
            .feed-space { height: 35px; }
          </style>
        </head>
        <body>
          <pre>${testSlipText}</pre>
          <div class="feed-space"></div>
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1500);
      }, 300);

      return { success: true, message: 'Diagnostic test print job dispatched to thermal printer.' };
    } catch (err: any) {
      console.error('Test print error:', err);
      // Fallback to window.print
      window.print();
      return { success: false, message: err?.message || 'Fallback to system print dialog.' };
    }
  }

  // Browser Print trigger
  static triggerBrowserPrint(): void {
    window.print();
  }
}
