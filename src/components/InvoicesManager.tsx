import React, { useState, useMemo } from 'react';
import { SaleInvoice, SystemSettings, Language, Customer } from '../types';
import { Receipt, Search, Printer, RotateCcw, Ban, CheckCircle, AlertTriangle, Calendar, User, FileText, X, Check, ShieldAlert, ArrowLeftRight, Download, ExternalLink, Mail, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerSmartPrint, printInNewTab, downloadReceiptHtml } from '../utils/printReceipt';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const downloadInvoicePDF = (invoice: SaleInvoice, settings: SystemSettings, isAr: boolean) => {
  try {
    const doc = new jsPDF();
    const currency = settings.currency || 'SAR';
    const storeName = isAr ? (settings.storeNameAr || 'المتجر') : (settings.storeNameEn || 'Store');

    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(storeName, 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`${isAr ? 'فاتورة ضريبية مبسطة / Invoice #:' : 'Tax Invoice #:'} ${invoice.invoiceNumber}`, 14, 28);
    doc.text(`${isAr ? 'التاريخ:' : 'Date:'} ${new Date(invoice.date).toLocaleString(isAr ? 'ar-SA' : 'en-US')}`, 14, 34);
    doc.text(`${isAr ? 'العميل:' : 'Customer:'} ${invoice.customerName || (isAr ? 'عميل عام' : 'General Customer')}`, 14, 40);
    doc.text(`${isAr ? 'الكاشير:' : 'Cashier:'} ${invoice.cashierName}`, 14, 46);

    if (invoice.status !== 'completed') {
      doc.setFontSize(12);
      doc.setTextColor(220, 50, 50);
      doc.text(`STATUS: ${invoice.status.toUpperCase()}`, 140, 28);
    }

    const tableData = invoice.items.map((item) => [
      isAr ? item.productNameAr : item.productNameEn,
      item.quantity.toString(),
      `${item.unitPrice} ${currency}`,
      `${item.total} ${currency}`
    ]);

    autoTable(doc, {
      startY: 55,
      head: [[
        isAr ? 'الصنف / Item' : 'Item Description',
        isAr ? 'الكمية / Qty' : 'Qty',
        isAr ? 'سعر الوحدة / Price' : 'Unit Price',
        isAr ? 'الإجمالي / Total' : 'Total'
      ]],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 80;

    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`${isAr ? 'المجموع الفرعي:' : 'Subtotal:'} ${invoice.subtotal} ${currency}`, 14, finalY + 12);
    if (invoice.discountTotal > 0) {
      doc.text(`${isAr ? 'الخصم:' : 'Discount:'} -${invoice.discountTotal} ${currency}`, 14, finalY + 18);
    }
    doc.text(`${isAr ? `ضريبة القيمة المضافة (${invoice.taxRate}%):` : `VAT (${invoice.taxRate}%):`} ${invoice.taxAmount} ${currency}`, 14, finalY + (invoice.discountTotal > 0 ? 24 : 18));
    
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(`${isAr ? 'الإجمالي النهائي:' : 'Grand Total:'} ${invoice.grandTotal} ${currency}`, 14, finalY + (invoice.discountTotal > 0 ? 32 : 26));

    const policyText = invoice.returnPolicyText || settings.defaultReturnPolicyAr || settings.receiptFooterAr || 'Returns accepted within 7 days with original receipt.';
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const splitPolicy = doc.splitTextToSize(`Policy: ${policyText}`, 180);
    doc.text(splitPolicy, 14, finalY + (invoice.discountTotal > 0 ? 44 : 38));

    doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    alert(isAr ? 'حدث خطأ أثناء توليد ملف PDF الفاتورة' : 'Error generating PDF invoice');
  }
};

interface InvoicesManagerProps {
  sales: SaleInvoice[];
  settings: SystemSettings;
  lang: Language;
  userRole: 'admin' | 'cashier';
  customers?: Customer[];
  onUpdateInvoiceStatus: (id: string, updates: Partial<SaleInvoice>) => Promise<boolean>;
  onUpdateSettings?: (newSettings: Partial<SystemSettings>) => Promise<boolean>;
}

export const InvoicesManager: React.FC<InvoicesManagerProps> = ({
  sales,
  settings,
  lang,
  userRole,
  customers = [],
  onUpdateInvoiceStatus,
  onUpdateSettings
}) => {
  const isAr = lang === 'ar';
  const [activeView, setActiveView] = useState<'invoices_log' | 'policies_manager'>('invoices_log');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'refunded' | 'partial_refund' | 'cancelled'>('all');

  // Print & View Modal state
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<SaleInvoice | null>(null);
  const [previewFormat, setPreviewFormat] = useState<'80mm' | 'a4'>('80mm');

  const getCustomerEmail = (inv: SaleInvoice): string | undefined => {
    if (inv.customerEmail && inv.customerEmail.trim() !== '') {
      return inv.customerEmail.trim();
    }
    if (customers && customers.length > 0) {
      const cust = customers.find(c => 
        (inv.customerId && c.id === inv.customerId) || 
        (inv.customerName && c.name && c.name.trim().toLowerCase() === inv.customerName.trim().toLowerCase())
      );
      if (cust && cust.email && cust.email.trim() !== '') {
        return cust.email.trim();
      }
    }
    return undefined;
  };

  const handleEmailInvoice = (inv: SaleInvoice) => {
    let email = getCustomerEmail(inv);
    if (!email) {
      const prompted = prompt(isAr ? 'لم يتم العثور على بريد إلكتروني مسجل للعميل. أدخل عنوان البريد لإرسال الفاتورة الآن:' : 'No saved email found for customer. Enter email address to send invoice:', '');
      if (!prompted || !prompted.trim()) return;
      email = prompted.trim();
    }

    const currency = settings.currency || 'SAR';
    const storeName = isAr ? (settings.storeNameAr || 'المتجر') : (settings.storeNameEn || 'Store');
    const subject = isAr ? `فاتورة رقم ${inv.invoiceNumber} - ${storeName}` : `Invoice #${inv.invoiceNumber} - ${storeName}`;
    
    const itemsText = inv.items.map(item => 
      `- ${isAr ? item.productNameAr : item.productNameEn} (x${item.quantity}): ${item.total} ${currency}`
    ).join('\n');

    const body = `${isAr ? `عزيزي العميل: ${inv.customerName || 'عميلنا العزيز'}،` : `Dear ${inv.customerName || 'Customer'},`}

${isAr ? `نرفق لكم تفاصيل الفاتورة الصادرة من ${storeName}:` : `Here are the details of your invoice from ${storeName}:`}

${isAr ? 'رقم الفاتورة:' : 'Invoice #:'} ${inv.invoiceNumber}
${isAr ? 'التاريخ:' : 'Date:'} ${new Date(inv.date).toLocaleString(isAr ? 'ar-SA' : 'en-US')}
${isAr ? 'الكاشير:' : 'Cashier:'} ${inv.cashierName}
${isAr ? 'طريقة الدفع:' : 'Payment Method:'} ${inv.paymentMethod === 'cash' ? (isAr ? 'نقدي' : 'Cash') : inv.paymentMethod === 'card' ? (isAr ? 'شبكة / بطاقة' : 'Card') : (isAr ? 'آجل' : 'Credit')}

--------------------------------------------------
${isAr ? 'قائمة الأصناف والمشتريات:' : 'Purchased Items:'}
${itemsText}
--------------------------------------------------

${isAr ? 'المجموع الفرعي:' : 'Subtotal:'} ${inv.subtotal} ${currency}
${inv.discountTotal > 0 ? `${isAr ? 'الخصم:' : 'Discount:'} -${inv.discountTotal} ${currency}\n` : ''}${isAr ? `ضريبة القيمة المضافة (${inv.taxRate}%):` : `VAT (${inv.taxRate}%):`} ${inv.taxAmount} ${currency}
${isAr ? 'الإجمالي النهائي:' : 'Grand Total:'} ${inv.grandTotal} ${currency}

--------------------------------------------------
${isAr ? 'سياسة الاسترجاع والاستبدال:' : 'Return Policy:'}
${inv.returnPolicyText || settings.defaultReturnPolicyAr || settings.receiptFooterAr || (isAr ? 'البضاعة المباعة ترد وتستبدل خلال 7 أيام بشرط سلامة المنتج.' : 'Returns accepted within 7 days.')}

${isAr ? 'شكراً لتعاملكم معنا!' : 'Thank you for your business!'}
${storeName}`;

    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
  };

  // Cancel / Refund Modal state
  const [invoiceToCancelOrRefund, setInvoiceToCancelOrRefund] = useState<SaleInvoice | null>(null);
  const [actionType, setActionType] = useState<'cancel' | 'refund' | 'partial_refund'>('cancel');
  const [reasonInput, setReasonInput] = useState('');
  const [customPolicyInput, setCustomPolicyInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({});

  // Policies Manager state
  const [policyArInput, setPolicyArInput] = useState(settings.defaultReturnPolicyAr || 'البضاعة المباعة ترد وتستبدل خلال 7 أيام بشرط سلامة المنتج ووجود أصل الفاتورة.');
  const [policyEnInput, setPolicyEnInput] = useState(settings.defaultReturnPolicyEn || 'Returns and exchanges accepted within 7 days with original receipt.');
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policySavedAlert, setPolicySavedAlert] = useState(false);
  const [showPolicyPoster, setShowPolicyPoster] = useState(false);

  // Filter and Sort Sales
  const filteredSales = useMemo(() => {
    return sales
      .filter((s) => {
        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          s.invoiceNumber.toLowerCase().includes(searchLower) ||
          (s.customerName && s.customerName.toLowerCase().includes(searchLower)) ||
          s.cashierName.toLowerCase().includes(searchLower) ||
          s.items.some(i => i.productNameAr.toLowerCase().includes(searchLower) || i.productNameEn.toLowerCase().includes(searchLower));
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, statusFilter, searchTerm]);

  const handleConfirmStatusChange = async () => {
    if (!invoiceToCancelOrRefund) return;
    if (!reasonInput.trim()) {
      alert(isAr ? 'يرجى كتابة سبب الإلغاء أو الاسترجاع أولاً!' : 'Please enter a reason for cancellation or refund!');
      return;
    }

    setIsProcessing(true);
    const newStatus: SaleInvoice['status'] = actionType === 'cancel' ? 'cancelled' : actionType === 'refund' ? 'refunded' : 'partial_refund';
    
    let refundedAmount = 0;
    const refundedItemsList: SaleInvoice['refundedItems'] = [];

    if (actionType === 'partial_refund') {
      let hasSelectedItems = false;
      invoiceToCancelOrRefund.items.forEach((item, idx) => {
        const q = refundQuantities[`${item.productId}-${idx}`] || 0;
        if (q > 0) {
          hasSelectedItems = true;
          const rPrice = item.unitPrice * q;
          refundedAmount += rPrice;
          refundedItemsList.push({
            productId: item.productId,
            barcode: item.barcode,
            productNameAr: item.productNameAr,
            productNameEn: item.productNameEn,
            quantity: q,
            refundPrice: rPrice
          });
        }
      });
      if (!hasSelectedItems) {
        alert(isAr ? 'يرجى تحديد كمية صنف واحد على الأقل للاسترجاع!' : 'Please select at least 1 item quantity to refund!');
        setIsProcessing(false);
        return;
      }
    } else {
      refundedAmount = invoiceToCancelOrRefund.grandTotal;
    }

    const updates: Partial<SaleInvoice> = {
      status: newStatus,
      cancelledReason: reasonInput.trim(),
      cancelledBy: isAr ? (userRole === 'admin' ? 'المدير' : 'الكاشير') : (userRole === 'admin' ? 'Admin' : 'Cashier'),
      returnPolicyText: customPolicyInput.trim() || invoiceToCancelOrRefund.returnPolicyText || settings.defaultReturnPolicyAr || settings.receiptFooterAr,
      refundedAmount: actionType === 'partial_refund' ? refundedAmount : invoiceToCancelOrRefund.grandTotal,
      refundedItems: actionType === 'partial_refund' ? refundedItemsList : undefined,
      notes: actionType === 'partial_refund' ? `${invoiceToCancelOrRefund.notes || ''}\n[استرجاع جزئي بمبلغ ${refundedAmount} ${settings.currency} - السبب: ${reasonInput.trim()}]` : invoiceToCancelOrRefund.notes
    };

    const success = await onUpdateInvoiceStatus(invoiceToCancelOrRefund.id, updates);
    setIsProcessing(false);

    if (success) {
      alert(
        isAr
          ? `تم تسجيل ${actionType === 'cancel' ? 'إلغاء الفاتورة' : actionType === 'refund' ? 'الاسترجاع الكامل' : 'الاسترجاع الجزئي'} بنجاح! تم تحديث كميات المخزون ورصيد العميل. سيتم فتح سند الاسترجاع للطباعة.`
          : `Invoice ${actionType === 'cancel' ? 'cancelled' : actionType === 'refund' ? 'refunded' : 'partially refunded'} successfully! Stock updated. Return voucher will open for printing.`
      );
      const updatedInv = { ...invoiceToCancelOrRefund, ...updates };
      setInvoiceToCancelOrRefund(null);
      setReasonInput('');
      setRefundQuantities({});
      setSelectedInvoiceForPrint(updatedInv);
    }
  };

  const getStatusBadge = (status: SaleInvoice['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAr ? 'مكتملة (مباعة)' : 'Completed'}</span>
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'مسترجعة بالكامل' : 'Fully Refunded'}</span>
          </span>
        );
      case 'partial_refund':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            <span>{isAr ? 'استرجاع جزئي' : 'Partial Refund'}</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Ban className="w-3.5 h-3.5 text-rose-400" />
            <span>{isAr ? 'ملغاة (Void / Cancelled)' : 'Cancelled'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-500/20 text-slate-300">
            <span>{status}</span>
          </span>
        );
    }
  };

  const getItemReturnPolicyText = (policy?: string) => {
    if (!policy) return null;
    if (policy === 'no_return' || policy === 'غير قابل للاسترجاع') {
      return isAr ? '🚫 غير قابل للاسترجاع (استهلاكي)' : '🚫 Non-returnable';
    }
    if (policy === '7_days' || policy === '7 أيام') {
      return isAr ? '🔄 استرجاع خلال 7 أيام' : '🔄 7 Days Return';
    }
    if (policy === '14_days' || policy === '14 يوم') {
      return isAr ? '🔄 استرجاع خلال 14 يوم' : '🔄 14 Days Return';
    }
    if (policy === 'exchange_only' || policy === 'استبدال فقط') {
      return isAr ? '🔀 استبدال فقط (3 أيام)' : '🔀 Exchange Only (3 Days)';
    }
    return `🔄 ${policy}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Receipt className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span>{isAr ? 'سجل الفواتير وسياسات الاسترجاع والإلغاء' : 'Sales Invoices, Returns & Cancellation Log'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isAr
                ? 'استعراض فواتير المبيعات، طباعة الفاتورة مع كتابة سياسة الاسترجاع والاستبدال، وإلغاء الفواتير مع استعادة كميات المخزون تلقائياً.'
                : 'Browse previous invoices, print receipts with return policy details, or void/refund invoices with automatic stock restoration.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-slate-800 text-xs font-bold text-slate-300">
          <ArrowLeftRight className="w-4 h-4 text-purple-400" />
          <span>{isAr ? `إجمالي الفواتير: ${sales.length} فاتورة` : `Total Invoices: ${sales.length}`}</span>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800 backdrop-blur-md max-w-lg">
        <button
          onClick={() => setActiveView('invoices_log')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-2 ${
            activeView === 'invoices_log'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{isAr ? '📄 سجل فواتير المبيعات والإلغاء' : '📄 Sales Invoices Log'}</span>
        </button>
        <button
          onClick={() => setActiveView('policies_manager')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-2 ${
            activeView === 'policies_manager'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{isAr ? '⚖️ إعدادات سياسات الاسترجاع والطباعة' : '⚖️ Return Policies & Poster'}</span>
        </button>
      </div>

      {activeView === 'policies_manager' ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 animate-fadeIn shadow-2xl">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {isAr ? 'لوحة تحكم وسياسات استرجاع واستبدال وإلغاء المبيعات للمتجر' : 'Store Return, Exchange & Cancellation Policies Dashboard'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAr
                  ? 'اختر القواعد والشروط المعتمدة لطباعتها في تذييل الفواتير، واطبع لوحة الشروط المعتمدة لتعليقها داخل المحل لحماية حقوقك الضريبية.'
                  : 'Manage official return policies printed on receipts, and print the store return poster to display at your checkout counter.'}
              </p>
            </div>
          </div>

          {policySavedAlert && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 p-4 rounded-2xl text-emerald-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>{isAr ? 'تم حفظ وتحديث سياسات الاسترجاع والاستبدال بنجاح وتعميمها على جميع الفواتير الجديدة! ✅' : 'Return and exchange policies saved successfully! ✅'}</span>
              </div>
              <button onClick={() => setPolicySavedAlert(false)} className="text-emerald-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Quick Policy Presets */}
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl space-y-3">
            <label className="block text-xs font-black text-emerald-400 flex items-center gap-2">
              <span>⚡</span>
              <span>{isAr ? 'قوالب الشروط الضريبية السريعة (اضغط للتطبيق الفوري):' : 'Quick Tax-Compliant Templates (Click to Apply):'}</span>
            </label>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setPolicyArInput('البضاعة المباعة ترد وتستبدل خلال 7 أيام من تاريخ الشراء بشرط سلامة المنتج ووجود أصل الفاتورة الضريبية.');
                  setPolicyEnInput('Returns and exchanges accepted within 7 days of purchase with original receipt and intact condition.');
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isAr ? '🔄 استرجاع واستبدال 7 أيام' : '🔄 7 Days Return & Exchange'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPolicyArInput('استبدال فقط خلال 14 يوماً من تاريخ الشراء بأصل الفاتورة ولا يوجد استرجاع نقدي حسب شروط المتجر.');
                  setPolicyEnInput('Exchange only within 14 days of purchase with original receipt. No cash refunds.');
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isAr ? '🔀 استبدال فقط (14 يوم)' : '🔀 Exchange Only (14 Days)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPolicyArInput('الأصناف الاستهلاكية والغذائية والإلكترونيات المفتوحة غير قابلة للاسترجاع أو الاستبدال حسب تعليمات وزارة التجارة.');
                  setPolicyEnInput('Consumables, food, and opened electronics cannot be returned or exchanged as per ministry guidelines.');
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isAr ? '🚫 غير قابل للاسترجاع (استهلاكي/مفتوح)' : '🚫 No Returns (Consumables/Opened)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPolicyArInput('ضمان استبدال فوري لمدة 3 أيام في حال وجود عيب مصنعي، مع اشتراط إحضار أصل الفاتورة وكرتون المنتج.');
                  setPolicyEnInput('3 days immediate exchange warranty for manufacturing defects with original invoice and packaging.');
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isAr ? '🛡️ ضمان استبدال عيوب مصنعية (3 أيام)' : '🛡️ 3 Days Defect Exchange Warranty'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                {isAr ? 'سياسة الاسترجاع المعتمدة باللغة العربية (تُطبع على الفواتير):' : 'Official Return Policy (Arabic):'}
              </label>
              <textarea
                rows={4}
                value={policyArInput}
                onChange={(e) => setPolicyArInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium leading-relaxed shadow-inner"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                {isAr ? 'سياسة الاسترجاع المعتمدة باللغة الإنجليزية (Return Policy - English):' : 'Official Return Policy (English):'}
              </label>
              <textarea
                rows={4}
                value={policyEnInput}
                onChange={(e) => setPolicyEnInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium leading-relaxed shadow-inner"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowPolicyPoster(true)}
              className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-purple-500/20 flex items-center gap-2.5 transition"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? '🖨️ طباعة لوحة شروط الاسترجاع والاستبدال لتعليقها بالمحل (Poster)' : '🖨️ Print Store Return Policy Poster'}</span>
            </button>

            <button
              type="button"
              disabled={isSavingPolicy}
              onClick={async () => {
                if (!onUpdateSettings) {
                  alert(isAr ? 'يرجى حفظ الإعدادات من شاشة الإعدادات العامة.' : 'Please save from Store Settings.');
                  return;
                }
                setIsSavingPolicy(true);
                const success = await onUpdateSettings({
                  defaultReturnPolicyAr: policyArInput.trim(),
                  defaultReturnPolicyEn: policyEnInput.trim(),
                  receiptFooterAr: policyArInput.trim(),
                  receiptFooterEn: policyEnInput.trim()
                });
                setIsSavingPolicy(false);
                if (success) {
                  setPolicySavedAlert(true);
                  setTimeout(() => setPolicySavedAlert(false), 5000);
                }
              }}
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition"
            >
              <Check className="w-4 h-4" />
              <span>{isSavingPolicy ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? '💾 حفظ وتحديث سياسات الاسترجاع في المتجر' : '💾 Save Return Policies to Store Settings')}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 backdrop-blur-md">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder={isAr ? 'بحث برقم الفاتورة، العميل، الصنف، الكاشير...' : 'Search by invoice #, customer, item...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-2.5 pl-10 rtl:pr-10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 font-medium transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:right-3 rtl:left-auto top-3" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 rtl:left-3 rtl:right-auto top-3 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex gap-1.5 p-1 bg-slate-800/90 rounded-2xl border border-slate-700/80 w-full md:w-auto overflow-x-auto">
          {(['all', 'completed', 'refunded', 'partial_refund', 'cancelled'] as const).map((status) => {
            const label =
              status === 'all'
                ? (isAr ? 'الكل' : 'All')
                : status === 'completed'
                ? (isAr ? 'مكتملة' : 'Completed')
                : status === 'refunded'
                ? (isAr ? 'مسترجعة بالكامل' : 'Fully Refunded')
                : status === 'partial_refund'
                ? (isAr ? 'استرجاع جزئي' : 'Partial Refund')
                : (isAr ? 'ملغاة' : 'Cancelled');
            const count = status === 'all' ? sales.length : sales.filter((s) => s.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`py-2 px-3.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>{label}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30 text-slate-300 font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold border-b border-slate-700/80">
              <tr>
                <th className="py-4 px-4">{isAr ? 'رقم الفاتورة والتاريخ' : 'Invoice & Date'}</th>
                <th className="py-4 px-4">{isAr ? 'العميل والكاشير' : 'Customer & Cashier'}</th>
                <th className="py-4 px-4">{isAr ? 'الأصناف' : 'Items'}</th>
                <th className="py-4 px-4 text-center">{isAr ? 'الإجمالي النهائي' : 'Grand Total'}</th>
                <th className="py-4 px-4 text-center">{isAr ? 'طريقة الدفع' : 'Payment'}</th>
                <th className="py-4 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="py-4 px-4 text-center">{isAr ? 'إجراءات الفاتورة والطباعة' : 'Actions & Print'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 font-medium">
                    <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-600 opacity-40 animate-pulse" />
                    <p>{isAr ? 'لا توجد فواتير مطابقة للبحث أو الفلتر حالياً' : 'No invoices match your search/filter criteria'}</p>
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                {filteredSales.map((inv) => (
                  <motion.tr layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} key={inv.id} className="hover:bg-slate-800/40 transition group">
                    <td className="py-4 px-4">
                      <div className="font-mono font-extrabold text-white text-sm flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-purple-400" />
                        <span>{inv.invoiceNumber}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{new Date(inv.date).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{inv.customerName || (isAr ? 'عميل عام' : 'General Customer')}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {isAr ? 'الكاشير:' : 'Cashier:'} <span className="text-slate-300 font-semibold">{inv.cashierName}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1 max-w-xs">
                        {inv.items.map((it, idx) => {
                          const itemPolicy = getItemReturnPolicyText(it.returnPolicy);
                          return (
                            <div key={idx} className="text-xs text-slate-300 flex items-center justify-between gap-2">
                              <span className="truncate font-medium">
                                {idx + 1}. {isAr ? it.productNameAr : it.productNameEn} (×{it.quantity})
                              </span>
                              {itemPolicy && (
                                <span className="text-[10px] bg-slate-800 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 whitespace-nowrap">
                                  {itemPolicy}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center font-mono font-black text-emerald-400 text-sm">
                      {inv.grandTotal} {settings.currency}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 font-extrabold text-xs text-slate-300">
                        {inv.paymentMethod === 'cash'
                          ? (isAr ? '💵 نقدي' : '💵 Cash')
                          : inv.paymentMethod === 'card'
                          ? (isAr ? '💳 شبكة' : '💳 Card')
                          : (isAr ? '📝 آجل' : '📝 Credit')}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      {getStatusBadge(inv.status)}
                      {inv.cancelledReason && (
                        <div className="text-[10px] text-rose-300 font-medium mt-1 bg-rose-500/10 p-1 rounded border border-rose-500/20 max-w-[150px] mx-auto truncate" title={inv.cancelledReason}>
                          {isAr ? 'السبب: ' : 'Reason: '} {inv.cancelledReason}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* Visual Print Preview Button */}
                        <button
                          onClick={() => {
                            setSelectedInvoiceForPrint(inv);
                          }}
                          title={isAr ? 'معاينة مرئية للفاتورة والإيصال الحراري قبل الطباعة' : 'Visual Print Preview before sending to printer'}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/50 text-xs font-black shadow-md transition flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4 text-purple-300" />
                          <span>{isAr ? 'معاينة الطباعة' : 'Preview'}</span>
                        </button>

                        {/* Email Invoice Button */}
                        <button
                          onClick={() => handleEmailInvoice(inv)}
                          title={getCustomerEmail(inv) ? (isAr ? `إرسال الفاتورة عبر البريد إلى: ${getCustomerEmail(inv)}` : `Email invoice to: ${getCustomerEmail(inv)}`) : (isAr ? 'إرسال الفاتورة عبر البريد الإلكتروني' : 'Email Invoice')}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-500/50 text-xs font-black shadow-md transition flex items-center gap-1"
                        >
                          <Mail className="w-4 h-4 text-blue-300" />
                          <span>{isAr ? 'إرسال بالبريد' : 'Email'}</span>
                        </button>

                        {/* Download PDF Button */}
                        <button
                          onClick={() => downloadInvoicePDF(inv, settings, isAr)}
                          title={isAr ? 'تحميل نسخة PDF رسمية ومحترفة للفاتورة' : 'Download professional printable PDF version'}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/50 text-xs font-black shadow-md transition flex items-center gap-1"
                        >
                          <Download className="w-4 h-4 text-indigo-300" />
                          <span>{isAr ? 'PDF' : 'PDF'}</span>
                        </button>

                        {/* Cancel / Refund Buttons */}
                        {(inv.status === 'completed' || inv.status === 'partial_refund') && (
                          <>
                            <button
                              onClick={() => {
                                setInvoiceToCancelOrRefund(inv);
                                setActionType('partial_refund');
                                const initQ: Record<string, number> = {};
                                inv.items.forEach((it, i) => {
                                  initQ[`${it.productId}-${i}`] = Math.min(1, it.quantity);
                                });
                                setRefundQuantities(initQ);
                                setReasonInput(isAr ? 'استرجاع أصناف من العميل' : 'Customer Item Refund');
                                setCustomPolicyInput(inv.returnPolicyText || settings.defaultReturnPolicyAr || settings.receiptFooterAr || '');
                              }}
                              title={isAr ? 'استرجاع أصناف أو الفاتورة بالكامل للمخزون' : 'Refund items or full invoice to inventory'}
                              className="px-2.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold transition flex items-center gap-1 shadow-sm"
                            >
                              <RotateCcw className="w-4 h-4 animate-spin-once" />
                              <span>{isAr ? 'استرجاع' : 'Refund'}</span>
                            </button>

                            <button
                              onClick={() => {
                                setInvoiceToCancelOrRefund(inv);
                                setActionType('cancel');
                                setReasonInput(isAr ? 'إلغاء الفاتورة بالكامل / خطأ إدخال' : 'Void Full Invoice');
                                setCustomPolicyInput(inv.returnPolicyText || settings.defaultReturnPolicyAr || settings.receiptFooterAr || '');
                              }}
                              title={isAr ? 'إلغاء الفاتورة بالكامل (Void)' : 'Void entire invoice'}
                              className="px-2.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition flex items-center gap-1 shadow-sm"
                            >
                              <Ban className="w-4 h-4" />
                              <span>{isAr ? 'إلغاء' : 'Void'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* CANCEL OR REFUND INVOICE MODAL */}
      <AnimatePresence>
      {invoiceToCancelOrRefund && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto print:hidden">
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }} transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} className="bg-[#0f172a] border border-slate-700 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 font-black">
                  ⚠️
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {isAr ? `إدارة الفاتورة رقم: ${invoiceToCancelOrRefund.invoiceNumber}` : `Manage Invoice #${invoiceToCancelOrRefund.invoiceNumber}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr ? 'إلغاء الفاتورة بالكامل أو تسجيل استرجاع مع تحديث كميات المخزون' : 'Void entire invoice or log refund with inventory restock'}
                  </p>
                </div>
              </div>
              <button onClick={() => setInvoiceToCancelOrRefund(null)} className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800">
                ✕
              </button>
            </div>

            {/* Select Action Type */}
            <div className="flex gap-1.5 p-1.5 bg-slate-900 rounded-2xl border border-slate-800">
              <button
                onClick={() => setActionType('cancel')}
                className={`flex-1 py-2.5 px-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  actionType === 'cancel'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{isAr ? 'إلغاء كامل (Void)' : 'Void Entire'}</span>
              </button>
              <button
                onClick={() => setActionType('refund')}
                className={`flex-1 py-2.5 px-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  actionType === 'refund'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isAr ? 'استرجاع كامل (Refund)' : 'Full Refund'}</span>
              </button>
              <button
                onClick={() => {
                  setActionType('partial_refund');
                  const initQ: Record<string, number> = {};
                  invoiceToCancelOrRefund.items.forEach((it, i) => {
                    initQ[`${it.productId}-${i}`] = 0;
                  });
                  setRefundQuantities(initQ);
                }}
                className={`flex-1 py-2.5 px-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  actionType === 'partial_refund'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isAr ? 'استرجاع جزئي' : 'Partial Refund'}</span>
              </button>
            </div>

            {/* Partial Refund Item Selector */}
            {actionType === 'partial_refund' && (
              <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-2xl space-y-2 max-h-52 overflow-y-auto">
                <div className="text-xs text-blue-300 font-extrabold pb-1.5 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span>{isAr ? '📦 حدد كمية الأصناف المراد استرجاعها للمخزون:' : '📦 Select item quantities to refund:'}</span>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        const initQ: Record<string, number> = {};
                        invoiceToCancelOrRefund.items.forEach((it, i) => initQ[`${it.productId}-${i}`] = it.quantity);
                        setRefundQuantities(initQ);
                      }}
                      className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600 text-blue-200 text-[10px] border border-blue-500/40 font-bold transition"
                    >
                      {isAr ? '⚡ تحديد الكل' : '⚡ Select All'}
                    </button>
                    <span className="text-[10px] text-emerald-400 font-mono bg-black/30 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      {isAr ? 'المسترجع:' : 'Total:'} {invoiceToCancelOrRefund.items.reduce((acc, it, idx) => acc + (it.unitPrice * (refundQuantities[`${it.productId}-${idx}`] || 0)), 0)} {settings.currency}
                    </span>
                  </div>
                </div>
                {invoiceToCancelOrRefund.items.map((item, idx) => {
                  const key = `${item.productId}-${idx}`;
                  const currentQ = refundQuantities[key] || 0;
                  return (
                    <div key={idx} className="flex items-center justify-between gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-xs text-slate-300 truncate max-w-[200px]" title={isAr ? item.productNameAr : item.productNameEn}>
                        <span className="font-bold">{idx + 1}. {isAr ? item.productNameAr : item.productNameEn}</span>
                        <span className="text-slate-400 block text-[10px] mt-0.5">{isAr ? 'سعر الوحدة:' : 'Price:'} {item.unitPrice} {settings.currency} | {isAr ? 'المباع:' : 'Sold:'} {item.quantity}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRefundQuantities({ ...refundQuantities, [key]: Math.max(0, currentQ - 1) })}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center border border-slate-700"
                        >-</button>
                        <span className="w-8 text-center font-mono font-black text-xs text-blue-400">{currentQ} / {item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setRefundQuantities({ ...refundQuantities, [key]: Math.min(item.quantity, currentQ + 1) })}
                          className="w-7 h-7 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white font-bold flex items-center justify-center border border-blue-500/40"
                        >+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Warning Banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl text-xs text-amber-200 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block mb-0.5">
                  {isAr ? 'تحديث المخزون والمالية تلقائياً 🔄' : 'Automatic Stock & Finance Restocking 🔄'}
                </span>
                <span>
                  {isAr
                    ? 'عند تنفيذ الإلغاء أو الاسترجاع، سيقوم النظام تلقائياً بإعادة كميات الأصناف المباعة أو المسترجعة إلى رصيد المخزون، وتعديل المالية وضريبة القيمة المضافة وإصدار إشعار دائن.'
                    : 'Confirming will automatically restore refunded product quantities back into inventory stock and adjust VAT financial records.'}
                </span>
              </div>
            </div>

            {/* Reason Input */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold block">
                {isAr ? 'سبب الإلغاء أو الاسترجاع (يظهر على سند الاسترجاع):' : 'Reason for Cancellation/Refund (Printed on Voucher):'}
              </label>
              <textarea
                rows={2}
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder={isAr ? 'مثال: خطأ في إدخال الأصناف / رغبة العميل في استبدال أو إرجاع البضاعة...' : 'e.g., Customer requested refund / data entry error...'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Custom Return Policy Note on Invoice */}
            <div className="space-y-1.5">
              <label className="text-xs text-purple-300 font-bold block">
                {isAr ? 'سياسة الاسترجاع المطبوعة على إشعار الاسترجاع:' : 'Return Policy Text Printed on Credit Note:'}
              </label>
              <textarea
                rows={2}
                value={customPolicyInput}
                onChange={(e) => setCustomPolicyInput(e.target.value)}
                placeholder={isAr ? 'اكتب سياسة الاسترجاع التي تود طباعتها في أسفل الفاتورة/السند...' : 'Enter return policy to print on voucher...'}
                className="w-full bg-slate-800/80 border border-purple-500/30 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToCancelOrRefund(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl transition"
              >
                {isAr ? 'إلغاء وتراجع' : 'Close'}
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmStatusChange}
                className={`flex-1 py-3 text-white text-xs font-black rounded-2xl shadow-lg transition flex items-center justify-center gap-2 ${
                  actionType === 'cancel' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20' : actionType === 'refund' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                }`}
              >
                {actionType === 'cancel' ? <Ban className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                <span>
                  {isProcessing
                    ? (isAr ? 'جاري المعالجة...' : 'Processing...')
                    : (isAr ? `تأكيد ${actionType === 'cancel' ? 'إلغاء' : actionType === 'refund' ? 'استرجاع كامل' : 'استرجاع جزئي'} والطباعة` : `Confirm ${actionType === 'cancel' ? 'Void' : actionType === 'refund' ? 'Full Refund' : 'Partial Refund'}`)}
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* POLICY POSTER PRINT MODAL */}
      <AnimatePresence>
      {showPolicyPoster && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block">
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }} transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} className="bg-white text-slate-900 rounded-3xl p-8 max-w-xl w-full shadow-2xl border-4 border-emerald-600 flex flex-col gap-6 print:max-w-none print:w-full print:shadow-none print:border-none print:rounded-none print:p-6">
            <div className="text-center pb-6 border-b-2 border-emerald-600">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3 border-2 border-emerald-500 font-black text-2xl">
                ⚖️
              </div>
              <h2 className="text-2xl font-black text-slate-900">{isAr ? settings.storeNameAr : settings.storeNameEn}</h2>
              <p className="text-sm font-bold text-slate-600 mt-1">{isAr ? 'سياسة وشروط الاسترجاع والاستبدال المعتمدة' : 'Official Return & Exchange Policy'}</p>
              <div className="inline-block mt-2 px-4 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black border border-emerald-300">
                {isAr ? `الرقم الضريبي: ${settings.taxNumber}` : `VAT Number: ${settings.taxNumber}`}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-200">
                <h4 className="font-extrabold text-sm text-emerald-800 mb-2 flex items-center gap-2">
                  <span>📌</span>
                  <span>{isAr ? 'الشروط المعتمدة (باللغة العربية):' : 'Official Terms (Arabic):'}</span>
                </h4>
                <p className="text-sm text-slate-800 font-bold leading-relaxed whitespace-pre-wrap">
                  {policyArInput || settings.defaultReturnPolicyAr}
                </p>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-200">
                <h4 className="font-extrabold text-sm text-emerald-800 mb-2 flex items-center gap-2">
                  <span>📌</span>
                  <span>{isAr ? 'الشروط المعتمدة (باللغة الإنجليزية):' : 'Official Terms (English):'}</span>
                </h4>
                <p className="text-sm text-slate-800 font-bold leading-relaxed whitespace-pre-wrap">
                  {policyEnInput || settings.defaultReturnPolicyEn}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-300 text-xs text-amber-900 font-bold flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p>
                {isAr
                  ? 'يرجى من عملائنا الكرام التأكد من وجود أصل الفاتورة الضريبية ومطابقة المنتج للشروط المذكورة أعلاه لتسهيل إجراءات الاسترجاع أو الاستبدال.'
                  : 'Please ensure you have the original tax invoice and items meet the conditions above for smooth return/exchange processing.'}
              </p>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-500 font-bold pt-4 border-t border-slate-200">
              <span>{isAr ? 'تم الإصدار من نظام POS الضريبي المعتمد' : 'Issued by POS Tax System'}</span>
              <span>{new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</span>
            </div>

            <div className="flex gap-3 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setShowPolicyPoster(false)}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-2xl text-xs transition"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition"
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? '🖨️ طباعة لوحة الشروط الآن' : '🖨️ Print Policy Poster Now'}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* VISUAL PRINT PREVIEW MODAL & PRINT CONTAINER */}
      <AnimatePresence>
      {selectedInvoiceForPrint && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block">
          {/* Modal Container */}
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }} transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} className="bg-slate-900 text-white rounded-3xl border border-slate-700/80 shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden print:max-w-none print:w-full print:max-h-none print:shadow-none print:border-none print:rounded-none print:bg-white print:p-0">
            
            {/* Modal Header Bar (Hidden when printing) */}
            <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                    <span>{isAr ? 'معاينة الفاتورة قبل الطباعة' : 'Visual Print Preview'}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {isAr ? 'وضع المعاينة الحية' : 'Live Mock Display'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAr ? 'تحقق من مظهر الإيصال الحراري الفعلي وترتيب العناصر والخطوط قبل الإرسال إلى طابعة الكاشير.' : 'Check the real-time thermal receipt layout and font formatting before sending to printer.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceForPrint(null)}
                className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Control & Format Selector Bar (Hidden when printing) */}
            <div className="px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">{isAr ? 'شكل العرض:' : 'Receipt Format:'}</span>
                <button
                  onClick={() => setPreviewFormat('80mm')}
                  className={`px-3 py-1.5 rounded-xl font-black transition flex items-center gap-1.5 ${
                    previewFormat === '80mm'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>📜</span>
                  <span>{isAr ? 'إيصال حراري 80 مم (قياسي)' : '80mm Thermal Receipt'}</span>
                </button>
                <button
                  onClick={() => setPreviewFormat('a4')}
                  className={`px-3 py-1.5 rounded-xl font-black transition flex items-center gap-1.5 ${
                    previewFormat === 'a4'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>📄</span>
                  <span>{isAr ? 'فاتورة A4 كاملة' : 'A4 Full Invoice'}</span>
                </button>
              </div>

              {/* Customer Email Status */}
              <div className="flex items-center gap-2">
                {getCustomerEmail(selectedInvoiceForPrint) ? (
                  <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold flex items-center gap-1.5 text-xs">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{isAr ? 'بريد العميل مسجل:' : 'Saved Email:'} {getCustomerEmail(selectedInvoiceForPrint)}</span>
                  </div>
                ) : (
                  <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl font-bold flex items-center gap-1.5 text-xs">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{isAr ? 'لا يوجد بريد مسجل (إضغط إرسال بالبريد للإدخال)' : 'No saved email (click Email Invoice to enter)'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Workspace with Mock Receipt Display */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-950/70 flex justify-center items-start print:p-0 print:bg-white print:overflow-visible">
              
              {/* Printable Receipt Card (Mock Paper Display) */}
              <div className={`print-invoice-container bg-white text-slate-900 shadow-2xl border border-slate-200 transition-all duration-300 flex flex-col gap-4 relative print:max-w-none print:w-full print:shadow-none print:border-none print:rounded-none print:p-4 ${
                previewFormat === '80mm' ? 'max-w-[400px] w-full rounded-sm p-6 font-sans' : 'max-w-[700px] w-full rounded-2xl p-8 font-sans'
              }`}>
                
                {/* Top Perforated Receipt Edge Decoration (Only shown in 80mm preview mode) */}
                {previewFormat === '80mm' && (
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-[linear-gradient(135deg,transparent_50%,#020617_50%),linear-gradient(-135deg,transparent_50%,#020617_50%)] [background-size:12px_6px] bg-repeat-x -mt-1.5 print:hidden opacity-90"></div>
                )}

                {/* Cancelled / Refunded Banner on Printed Receipt */}
                {selectedInvoiceForPrint.status !== 'completed' && (
                  <div className={`p-3 rounded-2xl text-center font-black border-2 my-1 ${
                    selectedInvoiceForPrint.status === 'cancelled'
                      ? 'bg-rose-100 text-rose-800 border-rose-500'
                      : 'bg-amber-100 text-amber-800 border-amber-500'
                  }`}>
                    <div className="text-base uppercase tracking-wider">
                      {selectedInvoiceForPrint.status === 'cancelled'
                        ? (isAr ? '⚠️ [ فاتورة ملغاة / باطلة ] ⚠️' : '⚠️ [ VOID / CANCELLED INVOICE ] ⚠️')
                        : (isAr ? '🔄 [ فاتورة مسترجعة ] 🔄' : '🔄 [ REFUNDED INVOICE ] 🔄')}
                    </div>
                    {selectedInvoiceForPrint.cancelledReason && (
                      <div className="text-xs font-bold mt-1 text-slate-800">
                        {isAr ? 'السبب: ' : 'Reason: '} {selectedInvoiceForPrint.cancelledReason}
                      </div>
                    )}
                    {selectedInvoiceForPrint.cancelledAt && (
                      <div className="text-[10px] text-slate-600 mt-0.5 font-mono">
                        {isAr ? 'تاريخ الإلغاء: ' : 'Date: '} {new Date(selectedInvoiceForPrint.cancelledAt).toLocaleString(isAr ? 'ar-SA' : 'en-US')}
                      </div>
                    )}
                  </div>
                )}

                {/* Store Header */}
                <div className="text-center pb-4 border-b-2 border-dashed border-slate-300">
                  <h3 className="font-extrabold text-xl text-black">{isAr ? settings.storeNameAr : settings.storeNameEn}</h3>
                  <p className="text-xs text-slate-700 mt-1 font-medium">{settings.storeAddress}</p>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">{isAr ? 'هاتف:' : 'Tel:'} {settings.storePhone} | {isAr ? 'الرقم الضريبي:' : 'VAT:'} {settings.taxNumber}</p>
                  <div className="mt-2.5 inline-block px-3.5 py-1 bg-slate-100 rounded-full text-xs font-extrabold text-black border border-slate-300 shadow-sm">
                    {isAr ? 'فاتورة ضريبية مبسطة (ZATCA Compliant)' : 'Simplified Tax Invoice'}
                  </div>
                </div>

                {/* Invoice Meta */}
                <div className="flex justify-between text-xs text-slate-700 font-bold bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <p><strong className="text-black">{isAr ? 'رقم الفاتورة:' : 'Invoice #:'}</strong> <span className="font-mono text-purple-900">{selectedInvoiceForPrint.invoiceNumber}</span></p>
                    <p className="mt-1"><strong className="text-black">{isAr ? 'التاريخ:' : 'Date:'}</strong> {new Date(selectedInvoiceForPrint.date).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</p>
                  </div>
                  <div className="text-right">
                    <p><strong className="text-black">{isAr ? 'طريقة الدفع:' : 'Payment:'}</strong> {
                      selectedInvoiceForPrint.paymentMethod === 'cash' ? (isAr ? '💵 نقدي' : 'Cash') :
                      selectedInvoiceForPrint.paymentMethod === 'card' ? (isAr ? '💳 شبكة' : 'Card') :
                      (isAr ? '📝 آجل' : 'Credit')
                    }</p>
                    <p className="mt-1"><strong className="text-black">{isAr ? 'العميل:' : 'Customer:'}</strong> {selectedInvoiceForPrint.customerName || (isAr ? 'عميل عام' : 'General Customer')}</p>
                    {getCustomerEmail(selectedInvoiceForPrint) && (
                      <p className="mt-0.5 text-[10px] text-blue-800 font-mono"><strong className="text-black">{isAr ? 'البريد:' : 'Email:'}</strong> {getCustomerEmail(selectedInvoiceForPrint)}</p>
                    )}
                    <p className="mt-1"><strong className="text-black">{isAr ? 'الكاشير:' : 'Cashier:'}</strong> {selectedInvoiceForPrint.cashierName}</p>
                  </div>
                </div>

                {/* Items Table with Return Policy Tags */}
                <table className="w-full text-xs text-left rtl:text-right border-y-2 border-slate-300 my-1">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-black font-extrabold bg-slate-100">
                      <th className="py-2 px-2">{isAr ? 'الصنف وسياسة الارجاع' : 'Item & Policy'}</th>
                      <th className="py-2 px-1 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                      <th className="py-2 px-1 text-right">{isAr ? 'السعر' : 'Price'}</th>
                      <th className="py-2 px-2 text-right">{isAr ? 'الإجمالي' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedInvoiceForPrint.items.map((item, idx) => {
                      const itemPolicy = getItemReturnPolicyText(item.returnPolicy);
                      return (
                        <tr key={idx} className="py-2">
                          <td className="py-2 px-2">
                            <div className="font-extrabold text-black">{isAr ? item.productNameAr : item.productNameEn}</div>
                            {itemPolicy && (
                              <div className="text-[10px] text-purple-900 font-extrabold mt-0.5 bg-purple-50 inline-block px-1.5 py-0.5 rounded border border-purple-200">
                                {itemPolicy}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-1 text-center font-mono font-bold text-black">{item.quantity}</td>
                          <td className="py-2 px-1 text-right font-mono text-slate-700">{item.unitPrice}</td>
                          <td className="py-2 px-2 text-right font-mono font-black text-black">{item.total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Financial Totals */}
                <div className="flex flex-col gap-1.5 text-xs text-slate-800 font-bold p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex justify-between">
                    <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                    <span className="font-mono text-black">{selectedInvoiceForPrint.subtotal} {settings.currency}</span>
                  </div>
                  {selectedInvoiceForPrint.discountTotal > 0 && (
                    <div className="flex justify-between text-amber-800 font-extrabold">
                      <span>{isAr ? 'إجمالي الخصم:' : 'Discount:'}</span>
                      <span className="font-mono">-{selectedInvoiceForPrint.discountTotal} {settings.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{isAr ? `ضريبة القيمة المضافة (${selectedInvoiceForPrint.taxRate}%):` : `VAT (${selectedInvoiceForPrint.taxRate}%):`}</span>
                    <span className="font-mono text-black">{selectedInvoiceForPrint.taxAmount} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 mt-1 border-t-2 border-slate-300 text-base font-black text-black">
                    <span>{isAr ? 'الإجمالي النهائي:' : 'Grand Total:'}</span>
                    <span className="font-mono">{selectedInvoiceForPrint.grandTotal} {settings.currency}</span>
                  </div>
                </div>

                {/* EXPLICIT RETURN POLICY ON INVOICE */}
                <div className="p-3.5 bg-purple-50/80 border-2 border-purple-200 rounded-2xl text-slate-900 text-xs">
                  <div className="font-black text-purple-950 flex items-center gap-1.5 mb-1.5 text-sm border-b border-purple-200 pb-1">
                    <span>📋</span>
                    <span>{isAr ? 'سياسة الاسترجاع والاستبدال (Return & Exchange Policy):' : 'Return & Exchange Policy:'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-800 font-extrabold whitespace-pre-line">
                    {selectedInvoiceForPrint.returnPolicyText || settings.defaultReturnPolicyAr || settings.receiptFooterAr || (isAr ? 'البضاعة المباعة ترد وتستبدل خلال 7 أيام بشرط سلامة المنتج ووجود أصل الفاتورة.' : 'Returns accepted within 7 days with original receipt.')}
                  </p>
                </div>

                {/* Simulated QR Code / Barcode footer for Saudi ZATCA compliance feel */}
                <div className="text-center pt-3 border-t-2 border-dashed border-slate-300 flex flex-col items-center gap-2">
                  <div className="p-2 border-2 border-black rounded-xl bg-white flex items-center justify-center w-28 h-28 shadow-sm">
                    <div className="w-full h-full bg-[radial-gradient(#000_2px,transparent_2px)] [background-size:6px_6px] flex items-center justify-center">
                      <div className="w-10 h-10 bg-black text-white font-mono text-[9px] font-black flex items-center justify-center rounded">
                        ZATCA
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-black font-extrabold text-center tracking-wide">
                    {isAr ? settings.receiptFooterAr : settings.receiptFooterEn}
                  </p>
                </div>

                {/* Bottom Perforated Receipt Edge Decoration (Only shown in 80mm preview mode) */}
                {previewFormat === '80mm' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[linear-gradient(135deg,#020617_50%,transparent_50%),linear-gradient(-135deg,#020617_50%,transparent_50%)] [background-size:12px_6px] bg-repeat-x -mb-1.5 print:hidden opacity-90"></div>
                )}
              </div>
            </div>

            {/* Footer Action Bar (Hidden when printing) */}
            <div className="bg-slate-900 p-4 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <button
                  onClick={() => triggerSmartPrint(selectedInvoiceForPrint, settings, isAr)}
                  className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-purple-500/30 transition transform active:scale-95"
                >
                  <Printer className="w-4 h-4 animate-bounce" />
                  <span>{isAr ? 'إرسال إلى الطابعة الآن' : 'Send to Printer Now'}</span>
                </button>

                <button
                  onClick={() => printInNewTab(selectedInvoiceForPrint, settings, isAr)}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-lg transition"
                  title={isAr ? 'افتح في تبويب جديد لتجنب قيود المتصفح' : 'Open in new tab to bypass iframe restrictions'}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{isAr ? 'طباعة في نافذة جديدة' : 'Print in New Tab'}</span>
                </button>

                <button
                  onClick={() => handleEmailInvoice(selectedInvoiceForPrint)}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-lg transition"
                  title={getCustomerEmail(selectedInvoiceForPrint) ? (isAr ? `إرسال إلى: ${getCustomerEmail(selectedInvoiceForPrint)}` : `Email to: ${getCustomerEmail(selectedInvoiceForPrint)}`) : (isAr ? 'إرسال الفاتورة عبر البريد' : 'Email Invoice')}
                >
                  <Mail className="w-4 h-4" />
                  <span>{isAr ? 'إرسال الفاتورة بالبريد' : 'Email Invoice'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadInvoicePDF(selectedInvoiceForPrint, settings, isAr)}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 border border-slate-700 transition"
                  title={isAr ? 'تنزيل نسخة PDF رسمية ومحترفة للفاتورة' : 'Download official PDF version'}
                >
                  <Download className="w-4 h-4" />
                  <span>{isAr ? 'PDF' : 'PDF'}</span>
                </button>

                <button
                  onClick={() => downloadReceiptHtml(selectedInvoiceForPrint, settings, isAr)}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 border border-slate-700 transition"
                  title={isAr ? 'تنزيل الفاتورة كملف جاهز للطباعة على أي طابعة' : 'Download standalone printable file'}
                >
                  <Download className="w-4 h-4" />
                  <span>{isAr ? 'HTML' : 'HTML'}</span>
                </button>

                <button
                  onClick={() => setSelectedInvoiceForPrint(null)}
                  className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold rounded-2xl text-xs transition"
                >
                  {isAr ? 'إغلاق المعاينة' : 'Close Preview'}
                </button>
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
