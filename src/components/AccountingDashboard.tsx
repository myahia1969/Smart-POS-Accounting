/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DollarSign, Plus, TrendingUp, TrendingDown, Wallet, CreditCard, FileText, ArrowUpRight, ArrowDownRight, Tag, Calendar, Receipt, Edit, Trash2 } from 'lucide-react';
import { Expense, FinancialSummary, SystemSettings, Language } from '../types';

interface AccountingDashboardProps {
  summary: FinancialSummary | null;
  expenses: Expense[];
  settings: SystemSettings;
  lang: Language;
  userRole?: 'admin' | 'cashier';
  onSaveExpense: (expense: Expense) => Promise<boolean>;
  onDeleteExpense?: (id: string) => Promise<boolean>;
}

export const AccountingDashboard: React.FC<AccountingDashboardProps> = ({
  summary,
  expenses,
  settings,
  lang,
  userRole,
  onSaveExpense,
  onDeleteExpense
}) => {
  const isAr = lang === 'ar';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    title: '',
    category: 'utilities',
    amount: 100,
    notes: '',
    receiptNumber: '',
    loggedBy: isAr ? 'المحاسب المالي' : 'Accountant'
  });

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) {
      alert(isAr ? 'يرجى كتابة عنوان المصروف والمبلغ' : 'Please enter title and amount');
      return;
    }
    const expObj: Expense = {
      id: newExpense.id || `exp-${Date.now()}`,
      title: newExpense.title,
      category: newExpense.category || 'utilities',
      amount: Number(newExpense.amount) || 0,
      date: newExpense.date || new Date().toISOString(),
      notes: newExpense.notes || '',
      receiptNumber: newExpense.receiptNumber || `REC-${Math.floor(100 + Math.random() * 900)}`,
      loggedBy: newExpense.loggedBy || 'المدير'
    };
    await onSaveExpense(expObj);
    setIsModalOpen(false);
    setNewExpense({ title: '', category: 'utilities', amount: 100, notes: '', receiptNumber: '', loggedBy: isAr ? 'المحاسب المالي' : 'Accountant' });
  };

  const catMap: Record<string, { ar: string; en: string; color: string }> = {
    rent: { ar: 'إيجار المحل', en: 'Store Rent', color: 'bg-rose-100 text-rose-700 border-rose-200 shadow-xs font-semibold' },
    salaries: { ar: 'رواتب وأجور', en: 'Salaries', color: 'bg-amber-100 text-amber-700 border-amber-200 shadow-xs font-semibold' },
    utilities: { ar: 'كهرباء وماء واتصالات', en: 'Utilities', color: 'bg-blue-100 text-blue-700 border-blue-200 shadow-xs font-semibold' },
    supplies: { ar: 'مستلزمات وتغليف', en: 'Supplies', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-xs font-semibold' },
    maintenance: { ar: 'صيانة وإصلاحات', en: 'Maintenance', color: 'bg-purple-100 text-purple-700 border-purple-200 shadow-xs font-semibold' },
    marketing: { ar: 'تسويق وإعلانات', en: 'Marketing', color: 'bg-pink-100 text-pink-700 border-pink-200 shadow-xs font-semibold' },
    other: { ar: 'مصروفات أخرى', en: 'Other', color: 'bg-slate-100 text-slate-700 border-slate-200 shadow-xs font-semibold' }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            <span>{isAr ? 'المحاسبة العامة وإدارة المصروفات التشغيلية' : 'General Accounting & Operating Expenses'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isAr ? 'تتبع التدفقات النقدية، حصر الأرباح والخسائر، وتسجيل منصرفات النشاط' : 'Track cash flow, profit/loss statement, and log operating expenses'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-200 border border-emerald-500 transition transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'تسجيل مصروف تشغيلي جديد' : 'Log Operating Expense'}</span>
        </button>
      </div>

      {/* Financial Overview Grid (Soft Glass Neumorphism Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white/40 backdrop-blur-md p-5 rounded-3xl border border-white/60 shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'إجمالي الإيرادات (Revenue)' : 'Total Revenue'}</span>
            <div className="p-2 rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm"><TrendingUp className="w-5 h-5" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-800">{summary?.totalRevenue || 0} <span className="text-xs font-normal text-emerald-600">{settings.currency}</span></h3>
            <p className="text-[11px] text-slate-500 mt-1">{isAr ? `من إجمالي ${summary?.salesCount || 0} عملية بيع` : `From ${summary?.salesCount || 0} total sales`}</p>
          </div>
        </div>

        {/* Cost of Goods Sold (COGS) */}
        <div className="bg-white/40 backdrop-blur-md p-5 rounded-3xl border border-white/60 shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'تكلفة البضاعة المباعة (COGS)' : 'Cost of Goods Sold'}</span>
            <div className="p-2 rounded-2xl bg-blue-100 text-blue-600 border border-blue-200 shadow-sm"><TrendingDown className="w-5 h-5" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-800">{summary?.totalCOGS || 0} <span className="text-xs font-normal text-blue-600">{settings.currency}</span></h3>
            <p className="text-[11px] text-slate-500 mt-1">{isAr ? `مجمل الربح: ${summary?.grossProfit || 0} ${settings.currency}` : `Gross Profit: ${summary?.grossProfit || 0} ${settings.currency}`}</p>
          </div>
        </div>

        {/* Total Operating Expenses */}
        <div className="bg-white/40 backdrop-blur-md p-5 rounded-3xl border border-white/60 shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'المصروفات التشغيلية' : 'Operating Expenses'}</span>
            <div className="p-2 rounded-2xl bg-amber-100 text-amber-600 border border-amber-200 shadow-sm"><ArrowDownRight className="w-5 h-5" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-amber-700">{summary?.totalExpenses || 0} <span className="text-xs font-normal text-amber-600">{settings.currency}</span></h3>
            <p className="text-[11px] text-slate-500 mt-1">{isAr ? `إيجار، رواتب، كهرباء، وصيانة` : `Rent, salaries, utilities, supplies`}</p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white/60 backdrop-blur-md p-5 rounded-3xl border border-indigo-200 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col justify-between relative">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-indigo-700 uppercase">{isAr ? 'صافي الربح الفعلي (Net Profit)' : 'Net Profit Statement'}</span>
            <div className="p-2 rounded-2xl bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm"><ArrowUpRight className="w-5 h-5" /></div>
          </div>
          <div className="mt-4">
            <h3 className={`text-3xl font-black ${ (summary?.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {summary?.netProfit || 0} <span className="text-xs font-normal text-indigo-600">{settings.currency}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">{isAr ? 'بعد خصم تكلفة البضاعة والمصروفات التشغيلية' : 'After deducting COGS and expenses'}</p>
          </div>
        </div>
      </div>

      {/* Cash Drawer Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/60 shadow-[4px_4px_8px_#d1d9e6,-4px_-4px_8px_#ffffff] flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm"><Wallet className="w-6 h-6" /></div>
          <div>
            <span className="text-[11px] text-slate-500 block font-semibold">{isAr ? 'النقد الفعلي بالصندوق (Cash Drawer)' : 'Cash in Drawer'}</span>
            <span className="text-lg font-bold text-slate-800">{summary?.cashInDrawer || 0} {settings.currency}</span>
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/60 shadow-[4px_4px_8px_#d1d9e6,-4px_-4px_8px_#ffffff] flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm"><CreditCard className="w-6 h-6" /></div>
          <div>
            <span className="text-[11px] text-slate-500 block font-semibold">{isAr ? 'مدفوعات نقاط البيع (Card/POS)' : 'Card Payments'}</span>
            <span className="text-lg font-bold text-slate-800">{summary?.cardPayments || 0} {settings.currency}</span>
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/60 shadow-[4px_4px_8px_#d1d9e6,-4px_-4px_8px_#ffffff] flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-100 text-amber-600 border border-amber-200 shadow-sm"><FileText className="w-6 h-6" /></div>
          <div>
            <span className="text-[11px] text-slate-500 block font-semibold">{isAr ? 'المستحقات على العملاء (Receivables)' : 'Total Receivables'}</span>
            <span className="text-lg font-bold text-amber-700">{summary?.totalReceivables || 0} {settings.currency}</span>
          </div>
        </div>
      </div>

      {/* Expenses List Table */}
      <div className="bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] overflow-hidden">
        <div className="p-5 border-b border-slate-200/60 flex justify-between items-center">
          <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            <span>{isAr ? 'سجل المصروفات التشغيلية المسجلة' : 'Logged Operating Expenses History'}</span>
          </h3>
          <span className="text-xs text-slate-500 font-semibold">{expenses.length} {isAr ? 'عملية مسجلة' : 'records'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-sm">
            <thead className="bg-white/60 text-slate-500 text-xs uppercase border-b border-slate-200/60 font-bold">
              <tr>
                <th className="py-3.5 px-4 font-bold">{isAr ? 'عنوان المصروف' : 'Title'}</th>
                <th className="py-3.5 px-4 font-bold">{isAr ? 'التصنيف' : 'Category'}</th>
                <th className="py-3.5 px-4 text-center font-bold">{isAr ? 'المبلغ' : 'Amount'}</th>
                <th className="py-3.5 px-4 font-bold">{isAr ? 'رقم الإيصال' : 'Receipt #'}</th>
                <th className="py-3.5 px-4 font-bold">{isAr ? 'التاريخ والمسؤول' : 'Date & User'}</th>
                <th className="py-3.5 px-4 font-bold text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">{isAr ? 'لا توجد مصروفات مسجلة حالياً' : 'No expenses recorded yet'}</td>
                </tr>
              ) : (
                expenses.map(exp => {
                  const catInfo = catMap[exp.category] || catMap['other'];
                  return (
                    <tr key={exp.id} className="hover:bg-white/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{exp.title}</div>
                        {exp.notes && <div className="text-xs text-slate-500 mt-0.5">{exp.notes}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-xl text-xs border ${catInfo.color}`}>
                          {isAr ? catInfo.ar : catInfo.en}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-amber-700 text-base">
                        {exp.amount} <span className="text-xs font-normal text-slate-500">{settings.currency}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-indigo-600 font-semibold">{exp.receiptNumber || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                        <div>{new Date(exp.date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</div>
                        <div className="text-[10px] text-slate-400">{exp.loggedBy}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {confirmDeleteId === exp.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-150">
                              <button
                                type="button"
                                onClick={async () => {
                                  await onDeleteExpense?.(exp.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition"
                              >
                                {isAr ? 'تأكيد الحذف' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="p-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => { setNewExpense(exp); setIsModalOpen(true); }}
                                className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-xs transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(exp.id)}
                                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 shadow-xs transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOG EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSaveForm} className="bg-white text-slate-800 rounded-3xl p-6 max-w-md w-full shadow-[12px_12px_24px_#d1d9e6,-12px_-12px_24px_#ffffff] border border-white flex flex-col gap-4">
            <h3 className="text-lg font-bold border-b border-slate-200/60 pb-3 flex justify-between text-slate-800">
              <span>{isAr ? 'تسجيل مصروف تشغيلي' : 'Log Operating Expense'}</span>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </h3>

            <div>
              <label className="text-xs text-slate-600 block mb-1 font-semibold">{isAr ? 'عنوان المصروف والبيان:' : 'Expense Title & Description:'}</label>
              <input type="text" required placeholder={isAr ? 'مثال: إيجار شهر أغسطس...' : 'e.g., August Rent...'} value={newExpense.title} onChange={e => setNewExpense({ ...newExpense, title: e.target.value })} className="w-full bg-[#f4f7fb] border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition shadow-inner" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 block mb-1 font-semibold">{isAr ? 'التصنيف البند:' : 'Category:'}</label>
                <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })} className="w-full bg-[#f4f7fb] border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition shadow-inner font-semibold">
                  <option value="rent">{isAr ? 'إيجار المحل' : 'Store Rent'}</option>
                  <option value="salaries">{isAr ? 'رواتب وأجور' : 'Salaries'}</option>
                  <option value="utilities">{isAr ? 'كهرباء وماء واتصالات' : 'Utilities'}</option>
                  <option value="supplies">{isAr ? 'مستلزمات وتغليف' : 'Supplies'}</option>
                  <option value="maintenance">{isAr ? 'صيانة وإصلاحات' : 'Maintenance'}</option>
                  <option value="marketing">{isAr ? 'تسويق وإعلانات' : 'Marketing'}</option>
                  <option value="other">{isAr ? 'مصروفات أخرى' : 'Other'}</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600 block mb-1 font-semibold">{isAr ? 'المبلغ:' : 'Amount:'}</label>
                <input type="number" step="0.01" required value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })} className="w-full bg-[#f4f7fb] border border-slate-200 rounded-xl p-2.5 text-sm text-amber-700 font-extrabold focus:outline-none focus:border-indigo-500 transition shadow-inner" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 block mb-1 font-semibold">{isAr ? 'رقم الإيصال / السند:' : 'Receipt #:'}</label>
                <input type="text" value={newExpense.receiptNumber} onChange={e => setNewExpense({ ...newExpense, receiptNumber: e.target.value })} className="w-full bg-[#f4f7fb] border border-slate-200 rounded-xl p-2 text-xs font-mono text-indigo-600 font-semibold focus:outline-none focus:border-indigo-500 transition shadow-inner" />
              </div>
              <div>
                <label className="text-xs text-slate-600 block mb-1 font-semibold">{isAr ? 'المسؤول عن الصرف:' : 'Logged By:'}</label>
                <input type="text" value={newExpense.loggedBy} onChange={e => setNewExpense({ ...newExpense, loggedBy: e.target.value })} className="w-full bg-[#f4f7fb] border border-slate-200 rounded-xl p-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500 transition shadow-inner" />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1 font-semibold">{isAr ? 'ملاحظات إضافية:' : 'Additional Notes:'}</label>
              <textarea rows={2} value={newExpense.notes} onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })} className="w-full bg-[#f4f7fb] border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition shadow-inner" />
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-200/60 mt-2">
              <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs shadow-md shadow-emerald-200 transition">{isAr ? 'حفظ واعتماد المصروف' : 'Save Expense'}</button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition">{isAr ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
