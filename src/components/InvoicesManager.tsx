import React, { useState, useMemo } from 'react';
import { SaleInvoice, SystemSettings, Language } from '../types';
import { Receipt, Search, Printer, RotateCcw, Ban, CheckCircle, AlertTriangle, Calendar, User, FileText, X, Check, ShieldAlert, ArrowLeftRight, Download, ExternalLink } from 'lucide-react';
import { triggerSmartPrint, printInNewTab, downloadReceiptHtml } from '../utils/printReceipt';

interface InvoicesManagerProps {
  sales: SaleInvoice[];
  settings: SystemSettings;
  lang: Language;
  userRole: 'admin' | 'cashier';
  onUpdateInvoiceStatus: (id: string, updates: Partial<SaleInvoice>) => Promise<boolean>;
}

export const InvoicesManager: React.FC<InvoicesManagerProps> = ({
  sales,
  settings,
  lang,
  userRole,
  onUpdateInvoiceStatus
}) => {
  const isAr = lang === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'refunded' | 'cancelled'>('all');

  // Print & View Modal state
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<SaleInvoice | null>(null);

  // Cancel / Refund Modal state
  const [invoiceToCancelOrRefund, setInvoiceToCancelOrRefund] = useState<SaleInvoice | null>(null);
  const [actionType, setActionType] = useState<'cancel' | 'refund'>('cancel');
  const [reasonInput, setReasonInput] = useState('');
  const [customPolicyInput, setCustomPolicyInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
    const newStatus = actionType === 'cancel' ? 'cancelled' : 'refunded';
    const updates: Partial<SaleInvoice> = {
      status: newStatus,
      cancelledReason: reasonInput.trim(),
      cancelledBy: isAr ? (userRole === 'admin' ? 'المدير' : 'الكاشير') : (userRole === 'admin' ? 'Admin' : 'Cashier'),
      returnPolicyText: customPolicyInput.trim() || invoiceToCancelOrRefund.returnPolicyText || settings.defaultReturnPolicyAr || settings.receiptFooterAr
    };

    const success = await onUpdateInvoiceStatus(invoiceToCancelOrRefund.id, updates);
    setIsProcessing(false);

    if (success) {
      alert(
        isAr
          ? `تم ${actionType === 'cancel' ? 'إلغاء' : 'استرجاع'} الفاتورة بنجاح! تم استعادة كميات الأصناف في المخزون تلقائياً. 📦✨`
          : `Invoice ${actionType === 'cancel' ? 'cancelled' : 'refunded'} successfully! Inventory stock has been restored. 📦✨`
      );
      setInvoiceToCancelOrRefund(null);
      setReasonInput('');
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
            <span>{isAr ? 'مسترجعة (Refunded)' : 'Refunded'}</span>
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
          {(['all', 'completed', 'refunded', 'cancelled'] as const).map((status) => {
            const label =
              status === 'all'
                ? (isAr ? 'الكل' : 'All')
                : status === 'completed'
                ? (isAr ? 'مكتملة' : 'Completed')
                : status === 'refunded'
                ? (isAr ? 'مسترجعة' : 'Refunded')
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
                filteredSales.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition group">
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
                      <div className="flex items-center justify-center gap-2">
                        {/* Print Invoice Button */}
                        <button
                          onClick={() => {
                            setSelectedInvoiceForPrint(inv);
                          }}
                          title={isAr ? 'معاينة وطباعة الفاتورة مع سياسة الاسترجاع' : 'View & Print Invoice with Return Policy'}
                          className="px-3 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/50 text-xs font-black shadow-md transition flex items-center gap-1.5"
                        >
                          <Printer className="w-4 h-4 animate-bounce" />
                          <span>{isAr ? 'طباعة' : 'Print'}</span>
                        </button>

                        {/* Cancel / Refund Button */}
                        {inv.status === 'completed' && (
                          <button
                            onClick={() => {
                              setInvoiceToCancelOrRefund(inv);
                              setActionType('cancel');
                              setReasonInput('');
                              setCustomPolicyInput(inv.returnPolicyText || settings.defaultReturnPolicyAr || settings.receiptFooterAr || '');
                            }}
                            title={isAr ? 'إلغاء الفاتورة أو استرجاع الأصناف للمخزون' : 'Void invoice or refund items to inventory'}
                            className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition flex items-center gap-1"
                          >
                            <Ban className="w-4 h-4" />
                            <span>{isAr ? 'إلغاء / استرجاع' : 'Void / Refund'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CANCEL OR REFUND INVOICE MODAL */}
      {invoiceToCancelOrRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn print:hidden">
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl flex flex-col gap-5">
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
            <div className="flex gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800">
              <button
                onClick={() => setActionType('cancel')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                  actionType === 'cancel'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Ban className="w-4 h-4" />
                <span>{isAr ? 'إلغاء كامل الفاتورة (Void)' : 'Void / Cancel Invoice'}</span>
              </button>
              <button
                onClick={() => setActionType('refund')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                  actionType === 'refund'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isAr ? 'استرجاع الفاتورة (Refund)' : 'Refund Invoice'}</span>
              </button>
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl text-xs text-amber-200 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block mb-0.5">
                  {isAr ? 'تحديث المخزون والمالية تلقائياً 🔄' : 'Automatic Stock & Finance Restocking 🔄'}
                </span>
                <span>
                  {isAr
                    ? 'عند تنفيذ الإلغاء أو الاسترجاع، سيقوم النظام تلقائياً بإعادة كميات الأصناف المباعة في هذه الفاتورة إلى رصيد المخزون، وخصم قيمتها من رصيد العميل الآجل إذا وجد.'
                    : 'Confirming will automatically restore all product items from this invoice back into inventory stock quantities.'}
                </span>
              </div>
            </div>

            {/* Reason Input */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold block">
                {isAr ? 'سبب الإلغاء أو الاسترجاع (يظهر على الفاتورة المطبوعة):' : 'Reason for Cancellation/Refund (Printed on Invoice):'}
              </label>
              <textarea
                rows={2}
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder={isAr ? 'مثال: خطأ في إدخال الأصناف / رغبة العميل في إرجاع البضاعة...' : 'e.g., Customer requested return / data entry error...'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Custom Return Policy Note on Invoice */}
            <div className="space-y-1.5">
              <label className="text-xs text-purple-300 font-bold block">
                {isAr ? 'سياسة الاسترجاع المطبوعة على هذه الفاتورة:' : 'Return Policy Text Printed on this Invoice:'}
              </label>
              <textarea
                rows={3}
                value={customPolicyInput}
                onChange={(e) => setCustomPolicyInput(e.target.value)}
                placeholder={isAr ? 'اكتب سياسة الاسترجاع والاستبدال التي تود طباعتها في أسفل الفاتورة...' : 'Enter return policy to print on receipt...'}
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
                  actionType === 'cancel' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
                }`}
              >
                {actionType === 'cancel' ? <Ban className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                <span>
                  {isProcessing
                    ? (isAr ? 'جاري المعالجة...' : 'Processing...')
                    : (isAr ? `تأكيد ${actionType === 'cancel' ? 'إلغاء' : 'استرجاع'} الفاتورة والطباعة` : `Confirm ${actionType === 'cancel' ? 'Void' : 'Refund'} & Update Stock`)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE RECEIPT MODAL & PRINT CONTAINER */}
      {selectedInvoiceForPrint && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block">
          {/* Printable Receipt Card */}
          <div className="print-invoice-container bg-white text-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-300 max-h-[90vh] overflow-y-auto flex flex-col gap-4 animate-in fade-in zoom-in duration-200 print:max-w-none print:w-full print:max-h-none print:shadow-none print:border-none print:rounded-none print:p-4">
            
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

            {/* EXPLICIT RETURN POLICY ON INVOICE (سياسة الاسترجاع والاستبدال المطبوعة على الفاتورة) */}
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

            {/* Action Buttons (Hidden when printing) */}
            <div className="flex flex-col gap-2 pt-2 print:hidden">
              <div className="flex gap-2">
                <button
                  onClick={() => triggerSmartPrint(selectedInvoiceForPrint, settings, isAr)}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/30 transition transform active:scale-95"
                >
                  <Printer className="w-4 h-4 animate-bounce" />
                  <span>{isAr ? 'طباعة مباشرة' : 'Direct Print'}</span>
                </button>
                <button
                  onClick={() => printInNewTab(selectedInvoiceForPrint, settings, isAr)}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition"
                  title={isAr ? 'افتح في تبويب جديد لتجنب قيود المتصفح' : 'Open in new tab to bypass iframe restrictions'}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{isAr ? 'طباعة في نافذة جديدة' : 'Print in New Tab'}</span>
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadReceiptHtml(selectedInvoiceForPrint, settings, isAr)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                  title={isAr ? 'تنزيل الفاتورة كملف جاهز للطباعة على أي طابعة' : 'Download standalone printable file'}
                >
                  <Download className="w-4 h-4" />
                  <span>{isAr ? 'تنزيل ملف الفاتورة للطباعة (مضمون 100%)' : 'Download Printable File (100% Guaranteed)'}</span>
                </button>
                <button
                  onClick={() => setSelectedInvoiceForPrint(null)}
                  className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-2xl text-xs transition"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
