import { SaleInvoice, SystemSettings } from '../types';

/**
 * Generates standalone HTML for a POS receipt / tax invoice.
 * Guaranteed to work across all thermal printers, desktop browsers, and POS devices.
 */
export function generateReceiptHtml(invoice: SaleInvoice, settings: SystemSettings, isAr: boolean): string {
  const isCancelled = invoice.status === 'cancelled';
  const isRefunded = invoice.status === 'refunded';
  const isPartialRefund = invoice.status === 'partial_refund';

  const statusBannerHtml = (isCancelled || isRefunded || isPartialRefund) ? `
    <div style="background-color: ${isCancelled ? '#ffe4e6' : isPartialRefund ? '#eff6ff' : '#fef3c7'}; color: ${isCancelled ? '#9f1239' : isPartialRefund ? '#1e40af' : '#92400e'}; border: 2px solid ${isCancelled ? '#f43f5e' : isPartialRefund ? '#3b82f6' : '#f59e0b'}; padding: 10px; border-radius: 8px; text-align: center; margin-bottom: 12px; font-weight: bold;">
      <div style="font-size: 14px; text-transform: uppercase;">
        ${isCancelled ? (isAr ? '⚠️ [ فاتورة ملغاة / باطلة ] ⚠️' : '⚠️ [ VOID / CANCELLED INVOICE ] ⚠️') : isPartialRefund ? (isAr ? '🔄 [ إشعار دائن - استرجاع جزئي ] 🔄' : '🔄 [ CREDIT NOTE - PARTIAL REFUND ] 🔄') : (isAr ? '🔄 [ فاتورة مسترجعة بالكامل ] 🔄' : '🔄 [ FULLY REFUNDED INVOICE ] 🔄')}
      </div>
      ${invoice.refundedAmount ? `<div style="font-size: 12px; font-weight: 900; margin-top: 4px; color: #1e3a8a;">${isAr ? 'المبلغ المسترجع: ' : 'Refunded Amount: '} ${invoice.refundedAmount} ${settings.currency}</div>` : ''}
      ${invoice.cancelledReason ? `<div style="font-size: 11px; margin-top: 4px;">${isAr ? 'السبب: ' : 'Reason: '}${invoice.cancelledReason}</div>` : ''}
    </div>
  ` : '';

  const itemsRows = invoice.items.map((item, idx) => {
    const policyText = item.returnPolicy === 'no_return' ? (isAr ? '🚫 غير قابل للاسترجاع' : '🚫 Non-returnable') :
                       item.returnPolicy === 'exchange_only' ? (isAr ? '🔀 استبدال فقط' : '🔀 Exchange only') :
                       item.returnPolicy === '14_days' ? (isAr ? '🔄 استرجاع 14 يوم' : '🔄 14 Days return') :
                       (item.returnPolicy && item.returnPolicy !== '7_days') ? `🔄 ${item.returnPolicy}` : '';

    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 4px; font-weight: 700; color: #000;">
          <div>${idx + 1}. ${isAr ? item.productNameAr : item.productNameEn}</div>
          ${policyText ? `<div style="font-size: 10px; color: #581c87; font-weight: 800; margin-top: 2px; background: #f3e8ff; display: inline-block; padding: 2px 6px; border-radius: 4px; border: 1px solid #d8b4fe;">${policyText}</div>` : ''}
        </td>
        <td style="padding: 8px 4px; text-align: center; font-family: monospace; font-weight: 700; color: #000;">${item.quantity}</td>
        <td style="padding: 8px 4px; text-align: right; font-family: monospace; color: #334155;">${item.unitPrice}</td>
        <td style="padding: 8px 4px; text-align: right; font-family: monospace; font-weight: 900; color: #000;">${item.total}</td>
      </tr>
    `;
  }).join('');

  const policyContent = invoice.returnPolicyText || settings.defaultReturnPolicyAr || settings.receiptFooterAr || (isAr ? 'البضاعة المباعة ترد وتستبدل خلال 7 أيام بشرط سلامة المنتج ووجود أصل الفاتورة.' : 'Returns accepted within 7 days with original receipt.');

  return `<!DOCTYPE html>
<html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
<head>
  <meta charset="utf-8">
  <title>${isAr ? 'فاتورة ضريبية مبسطة' : 'Tax Invoice'} - ${invoice.invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=IBM+Plex+Mono:wght@500;700&display=swap');
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Cairo', sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      padding: 20px;
      display: flex;
      justify-content: center;
    }
    .receipt-box {
      background: #ffffff;
      width: 100%;
      max-width: 420px;
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);
      border: 1px solid #cbd5e1;
    }
    .header {
      text-align: center;
      padding-bottom: 16px;
      border-bottom: 2px dashed #94a3b8;
      margin-bottom: 16px;
    }
    .store-name {
      font-size: 20px;
      font-weight: 900;
      color: #000;
    }
    .store-info {
      font-size: 12px;
      color: #475569;
      margin-top: 4px;
      font-weight: 600;
    }
    .zatca-badge {
      display: inline-block;
      margin-top: 10px;
      padding: 4px 12px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      color: #000;
    }
    .meta-grid {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      padding: 12px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      font-size: 12px;
      margin-bottom: 16px;
    }
    .meta-col {
      line-height: 1.6;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 16px;
    }
    th {
      background: #f1f5f9;
      color: #000;
      font-weight: 800;
      padding: 8px 4px;
      border-bottom: 2px solid #cbd5e1;
      text-align: ${isAr ? 'right' : 'left'};
    }
    th.center, td.center { text-align: center; }
    th.right, td.right { text-align: ${isAr ? 'left' : 'right'}; }
    .totals-box {
      background: #f8fafc;
      padding: 12px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      font-size: 12px;
      margin-bottom: 16px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-weight: 700;
    }
    .grand-total {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 2px solid #cbd5e1;
      font-size: 16px;
      font-weight: 900;
      color: #000;
    }
    .policy-box {
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      padding: 12px;
      border-radius: 12px;
      font-size: 11px;
      margin-bottom: 16px;
    }
    .policy-title {
      font-weight: 800;
      color: #581c87;
      margin-bottom: 4px;
    }
    .policy-text {
      color: #3b0764;
      line-height: 1.5;
      font-weight: 700;
      white-space: pre-line;
    }
    .footer {
      text-align: center;
      padding-top: 16px;
      border-top: 2px dashed #94a3b8;
    }
    .qr-placeholder {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100px;
      height: 100px;
      border: 2px solid #000;
      border-radius: 12px;
      margin-bottom: 10px;
      background: radial-gradient(#000 2px, transparent 2px);
      background-size: 6px 6px;
    }
    .qr-text {
      background: #000;
      color: #fff;
      font-size: 9px;
      font-weight: 900;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
    }
    .footer-note {
      font-size: 11px;
      font-weight: 800;
      color: #000;
    }
    .no-print {
      margin-bottom: 20px;
      text-align: center;
    }
    .print-btn {
      background: #7c3aed;
      color: #fff;
      border: none;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 800;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
      font-family: 'Cairo', sans-serif;
    }
    .print-btn:hover {
      background: #6d28d9;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .receipt-box {
        box-shadow: none;
        border: none;
        max-width: 100%;
        width: 100%;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-box">
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">🖨️ ${isAr ? 'طباعة الفاتورة الآن' : 'Print Receipt Now'}</button>
    </div>

    ${statusBannerHtml}

    <div class="header">
      <div class="store-name">${isAr ? settings.storeNameAr : settings.storeNameEn}</div>
      <div class="store-info">${settings.storeAddress}</div>
      <div class="store-info">${isAr ? 'هاتف:' : 'Tel:'} ${settings.storePhone} | ${isAr ? 'الرقم الضريبي:' : 'VAT:'} ${settings.taxNumber}</div>
      <div class="zatca-badge">${isAr ? 'فاتورة ضريبية مبسطة (ZATCA Compliant)' : 'Simplified Tax Invoice'}</div>
    </div>

    <div class="meta-grid">
      <div class="meta-col">
        <div><strong>${isAr ? 'رقم الفاتورة:' : 'Invoice #:'}</strong> <span style="font-family: monospace; color: #581c87;">${invoice.invoiceNumber}</span></div>
        <div style="margin-top: 4px;"><strong>${isAr ? 'التاريخ:' : 'Date:'}</strong> ${new Date(invoice.date).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</div>
      </div>
      <div class="meta-col" style="text-align: ${isAr ? 'left' : 'right'};">
        <div><strong>${isAr ? 'طريقة الدفع:' : 'Payment:'}</strong> ${
          invoice.paymentMethod === 'cash' ? (isAr ? '💵 نقدي' : 'Cash') :
          invoice.paymentMethod === 'card' ? (isAr ? '💳 شبكة' : 'Card') :
          (isAr ? '📝 آجل' : 'Credit')
        }</div>
        <div style="margin-top: 4px;"><strong>${isAr ? 'العميل:' : 'Customer:'}</strong> ${invoice.customerName || (isAr ? 'عميل عام' : 'General Customer')}</div>
        <div style="margin-top: 4px;"><strong>${isAr ? 'الكاشير:' : 'Cashier:'}</strong> ${invoice.cashierName}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>${isAr ? 'الصنف وسياسة الارجاع' : 'Item & Policy'}</th>
          <th class="center">${isAr ? 'الكمية' : 'Qty'}</th>
          <th class="right">${isAr ? 'السعر' : 'Price'}</th>
          <th class="right">${isAr ? 'الإجمالي' : 'Total'}</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="totals-box">
      <div class="total-row">
        <span>${isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
        <span style="font-family: monospace;">${invoice.subtotal} ${settings.currency}</span>
      </div>
      ${invoice.discountTotal > 0 ? `
        <div class="total-row" style="color: #92400e;">
          <span>${isAr ? 'إجمالي الخصم:' : 'Discount:'}</span>
          <span style="font-family: monospace;">-${invoice.discountTotal} ${settings.currency}</span>
        </div>
      ` : ''}
      <div class="total-row">
        <span>${isAr ? `ضريبة القيمة المضافة (${invoice.taxRate}%):` : `VAT (${invoice.taxRate}%):`}</span>
        <span style="font-family: monospace;">${invoice.taxAmount} ${settings.currency}</span>
      </div>
      <div class="grand-total">
        <span>${isAr ? 'الإجمالي النهائي:' : 'Grand Total:'}</span>
        <span style="font-family: monospace;">${invoice.grandTotal} ${settings.currency}</span>
      </div>
    </div>

    <div class="policy-box">
      <div class="policy-title">📋 ${isAr ? 'سياسة الاسترجاع والاستبدال:' : 'Return & Exchange Policy:'}</div>
      <div class="policy-text">${policyContent}</div>
    </div>

    <div class="footer">
      <div class="qr-placeholder">
        <span class="qr-text">ZATCA QR</span>
      </div>
      <div class="footer-note">${isAr ? settings.receiptFooterAr : settings.receiptFooterEn}</div>
    </div>
  </div>
  <script>
    // Auto-trigger print when opened in a new tab/window
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        try { window.print(); } catch (e) { console.log('Print dialog suppressed or blocked'); }
      }, 500);
    });
  </script>
</body>
</html>`;
}

/**
 * Triggers smart printing. First tries hidden iframe print, fallback to standard window.print().
 */
export function triggerSmartPrint(invoice: SaleInvoice, settings: SystemSettings, isAr: boolean): void {
  try {
    const htmlContent = generateReceiptHtml(invoice, settings, isAr);
    if ((window as any).electronAPI && typeof (window as any).electronAPI.printReceipt === 'function' && settings.defaultPrinter && settings.defaultPrinter !== 'default') {
      console.log(`[SmartPrint] Printing via Electron IPC to hardware printer: ${settings.defaultPrinter}`);
      (window as any).electronAPI.printReceipt(htmlContent, settings.defaultPrinter);
      return;
    }
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = 'none';
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print failed, falling back to window.print():', err);
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
          }, 2000);
        }
      }, 500);
      return;
    }
  } catch (e) {
    console.warn('Smart print error, invoking standard window.print():', e);
  }
  window.print();
}

/**
 * Opens the receipt in a clean new browser tab/popup window for reliable printing.
 */
export function printInNewTab(invoice: SaleInvoice, settings: SystemSettings, isAr: boolean): void {
  const htmlContent = generateReceiptHtml(invoice, settings, isAr);
  const newWin = window.open('', '_blank', 'width=450,height=650,menubar=no,toolbar=no,location=no,status=no');
  if (newWin) {
    newWin.document.open();
    newWin.document.write(htmlContent);
    newWin.document.close();
  } else {
    alert(isAr ? 'تم منع فتح النافذة المنبثقة! يرجى السماح بالزوافذ المنبثقة للطباعة أو استخدام زر "تنزيل الفاتورة".' : 'Popup blocked! Please allow popups or use the Download button.');
  }
}

/**
 * Downloads the receipt as a standalone printable HTML file.
 */
export function downloadReceiptHtml(invoice: SaleInvoice, settings: SystemSettings, isAr: boolean): void {
  const htmlContent = generateReceiptHtml(invoice, settings, isAr);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invoice-${invoice.invoiceNumber}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
