/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Users, UserPlus, Phone, Mail, Building, Plus, Search, DollarSign, FileText, Edit, Trash2 } from 'lucide-react';
import { Customer, Supplier, SystemSettings, Language } from '../types';

interface CustomerSupplierManagerProps {
  customers: Customer[];
  suppliers: Supplier[];
  settings: SystemSettings;
  lang: Language;
  userRole?: 'admin' | 'cashier';
  onSaveCustomer: (customer: Customer) => Promise<boolean>;
  onSaveSupplier: (supplier: Supplier) => Promise<boolean>;
  onDeleteCustomer?: (id: string) => Promise<boolean>;
  onDeleteSupplier?: (id: string) => Promise<boolean>;
}

export const CustomerSupplierManager: React.FC<CustomerSupplierManagerProps> = ({
  customers,
  suppliers,
  settings,
  lang,
  userRole,
  onSaveCustomer,
  onSaveSupplier,
  onDeleteCustomer,
  onDeleteSupplier
}) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'customers' | 'suppliers'>('customers');
  const [searchTerm, setSearchTerm] = useState('');

  // New modal states
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ name: '', phone: '', balance: 0, creditLimit: 2000, totalPurchases: 0 });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({ name: '', companyName: '', phone: '', balance: 0, suppliedCategories: ['عام'] });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) || 
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.phone.includes(searchTerm)
  );

  const handleSaveCustomerForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) {
      alert(isAr ? 'يرجى كتابة اسم العميل ورقم الهاتف' : 'Please enter name and phone');
      return;
    }
    const custObj: Customer = {
      id: newCustomer.id || `cust-${Date.now()}`,
      name: newCustomer.name,
      phone: newCustomer.phone,
      email: newCustomer.email || '',
      balance: Number(newCustomer.balance) || 0,
      creditLimit: Number(newCustomer.creditLimit) || 2000,
      totalPurchases: Number(newCustomer.totalPurchases) || 0,
      notes: newCustomer.notes || '',
      createdAt: newCustomer.createdAt || new Date().toISOString()
    };
    await onSaveCustomer(custObj);
    setIsCustomerModalOpen(false);
    setNewCustomer({ name: '', phone: '', balance: 0, creditLimit: 2000, totalPurchases: 0 });
  };

  const handleSaveSupplierForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name || !newSupplier.companyName) {
      alert(isAr ? 'يرجى كتابة اسم المورد واسم الشركة' : 'Please enter name and company');
      return;
    }
    const suppObj: Supplier = {
      id: newSupplier.id || `supp-${Date.now()}`,
      name: newSupplier.name,
      phone: newSupplier.phone || '',
      companyName: newSupplier.companyName,
      balance: Number(newSupplier.balance) || 0,
      suppliedCategories: newSupplier.suppliedCategories || ['عام'],
      notes: newSupplier.notes || '',
      createdAt: newSupplier.createdAt || new Date().toISOString()
    };
    await onSaveSupplier(suppObj);
    setIsSupplierModalOpen(false);
    setNewSupplier({ name: '', companyName: '', phone: '', balance: 0, suppliedCategories: ['عام'] });
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>{isAr ? 'إدارة العملاء والموردين والحسابات الآجلة' : 'Contacts & Debt Management'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isAr ? 'متابعة أرصدة العملاء الدائنين ومستحقات الموردين' : 'Track credit customers and payable supplier accounts'}
          </p>
        </div>

        {/* Sub-Tab Selector & Add Button */}
        <div className="flex items-center gap-3">
          <div className="bg-white/60 p-1 rounded-2xl border border-white/80 shadow-inner flex">
            <button
              onClick={() => setActiveSubTab('customers')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition ${
                activeSubTab === 'customers'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {isAr ? '👤 العملاء (Customers)' : '👤 Customers'}
            </button>
            <button
              onClick={() => setActiveSubTab('suppliers')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition ${
                activeSubTab === 'suppliers'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {isAr ? '🏢 الموردون (Suppliers)' : '🏢 Suppliers'}
            </button>
          </div>

          <button
            onClick={() => activeSubTab === 'customers' ? setIsCustomerModalOpen(true) : setIsSupplierModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-200 border border-indigo-500 transition transform active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{activeSubTab === 'customers' ? (isAr ? 'إضافة عميل' : 'Add Customer') : (isAr ? 'إضافة مورد' : 'Add Supplier')}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-lg">
        <Search className="absolute top-3.5 left-3.5 w-4 h-4 text-slate-400 rtl:right-3.5 rtl:left-auto" />
        <input
          type="text"
          placeholder={isAr ? 'ابحث بالاسم أو الهاتف أو الشركة...' : 'Search contacts by name, phone or company...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/60 border border-white/80 rounded-2xl py-2.5 px-10 text-sm text-slate-800 placeholder-slate-400 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
      </div>

      {/* CUSTOMERS VIEW */}
      {activeSubTab === 'customers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(cust => (
            <div key={cust.id} className="bg-white/40 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff] hover:shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col justify-between transition">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base border border-indigo-200 shadow-sm">
                    {cust.name.charAt(0)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                    cust.balance > 0 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}>
                    {cust.balance > 0 ? `${isAr ? 'مدين لنا بـ:' : 'Owes:'} ${cust.balance} ${settings.currency}` : (isAr ? 'حساب منتظم' : 'Clear Account')}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-800">{cust.name}</h3>
                <div className="text-xs text-slate-500 mt-2 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{cust.phone}</span>
                  </div>
                  {cust.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{cust.email}</span>
                    </div>
                  )}
                  {cust.notes && <p className="text-[11px] text-slate-400 italic mt-1">{cust.notes}</p>}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-between items-center text-xs text-slate-500">
                <div>
                  <span>{isAr ? 'إجمالي مشترياته:' : 'Total Purchases:'} </span>
                  <span className="font-extrabold text-slate-800 text-sm">{cust.totalPurchases} <span className="text-xs text-indigo-600">{settings.currency}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  {confirmDeleteId === cust.id ? (
                    <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-150">
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteCustomer?.(cust.id);
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
                        onClick={() => { setNewCustomer(cust); setIsCustomerModalOpen(true); }}
                        className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-xs transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(cust.id)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 shadow-xs transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUPPLIERS VIEW */}
      {activeSubTab === 'suppliers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map(supp => (
            <div key={supp.id} className="bg-white/40 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff] hover:shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col justify-between transition">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Building className="w-8 h-8 text-indigo-600 p-1.5 bg-indigo-100 rounded-xl border border-indigo-200 shadow-sm" />
                    <div>
                      <h3 className="font-bold text-base text-slate-800">{supp.companyName}</h3>
                      <p className="text-xs text-slate-500">{supp.name}</p>
                    </div>
                  </div>
                </div>

                <div className="my-3 flex flex-wrap gap-1">
                  {supp.suppliedCategories.map(cat => (
                    <span key={cat} className="px-2.5 py-0.5 bg-white/80 text-indigo-700 text-[10px] rounded-lg border border-white shadow-xs font-semibold">
                      {cat}
                    </span>
                  ))}
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-2 mt-2">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{supp.phone || (isAr ? 'لا يوجد رقم' : 'No Phone')}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500">{isAr ? 'المستحق للمورد علينا:' : 'We Owe them:'} </span>
                  <span className={`font-extrabold text-sm ${supp.balance > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                    {supp.balance} <span className="text-xs font-normal">{settings.currency}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {confirmDeleteId === supp.id ? (
                    <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-150">
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteSupplier?.(supp.id);
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
                        onClick={() => { setNewSupplier(supp); setIsSupplierModalOpen(true); }}
                        className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-xs transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(supp.id)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 shadow-xs transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CUSTOMER MODAL */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSaveCustomerForm} className="bg-slate-900 text-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-700 flex flex-col gap-4">
            <h3 className="text-lg font-bold border-b border-slate-800 pb-3">{isAr ? 'إضافة عميل جديد' : 'Add New Customer'}</h3>
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">{isAr ? 'اسم العميل:' : 'Customer Name:'}</label>
              <input type="text" required value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">{isAr ? 'رقم الهاتف:' : 'Phone Number:'}</label>
              <input type="text" required value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">{isAr ? 'الرصيد الابتدائي (دائن / مدين):' : 'Initial Balance:'}</label>
              <input type="number" step="0.01" value={newCustomer.balance} onChange={e => setNewCustomer({ ...newCustomer, balance: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-bold" />
            </div>
            <div className="flex gap-3 pt-3 border-t border-slate-800 mt-2">
              <button type="submit" className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl text-xs">{isAr ? 'حفظ العميل' : 'Save Customer'}</button>
              <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs">{isAr ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </form>
        </div>
      )}

      {/* SUPPLIER MODAL */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSaveSupplierForm} className="bg-slate-900 text-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-700 flex flex-col gap-4">
            <h3 className="text-lg font-bold border-b border-slate-800 pb-3">{isAr ? 'إضافة مورد جديد' : 'Add New Supplier'}</h3>
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">{isAr ? 'اسم المؤسسة / الشركة:' : 'Company Name:'}</label>
              <input type="text" required value={newSupplier.companyName} onChange={e => setNewSupplier({ ...newSupplier, companyName: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-bold" />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">{isAr ? 'اسم الشخص المسؤول:' : 'Contact Person Name:'}</label>
              <input type="text" required value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">{isAr ? 'رقم الهاتف:' : 'Phone Number:'}</label>
              <input type="text" value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">{isAr ? 'المستحق المالي للمورد علينا:' : 'Payable Balance We Owe:'}</label>
              <input type="number" step="0.01" value={newSupplier.balance} onChange={e => setNewSupplier({ ...newSupplier, balance: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-amber-300 font-bold" />
            </div>
            <div className="flex gap-3 pt-3 border-t border-slate-800 mt-2">
              <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs">{isAr ? 'حفظ المورد' : 'Save Supplier'}</button>
              <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs">{isAr ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
