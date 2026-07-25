/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * نظام المبيعات والمحاسبة الذكي - Smart POS & Accounting System
 * Main React Application Component (Soft Glass Neumorphic UI)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { PosCheckout } from './components/PosCheckout';
import { InvoicesManager } from './components/InvoicesManager';
import { InventoryManager } from './components/InventoryManager';
import { CustomerSupplierManager } from './components/CustomerSupplierManager';
import { AccountingDashboard } from './components/AccountingDashboard';
import { FinancialReports } from './components/FinancialReports';
import { TaxReturnManager } from './components/TaxReturnManager';
import { AIFinancialAdvisor } from './components/AIFinancialAdvisor';
import { DesktopGuideView } from './components/DesktopGuideView';
import { StoreSettingsView } from './components/StoreSettingsView';
import { 
  Product, 
  Customer, 
  Supplier, 
  SaleInvoice, 
  Expense, 
  AIInsight, 
  SystemSettings, 
  FinancialSummary, 
  SystemDiagnostics, 
  Language, 
  AppDatabase 
} from './types';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [userRole, setUserRole] = useState<'admin' | 'cashier'>('cashier');
  const [lang, setLang] = useState<Language>('ar');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Database State
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<SaleInvoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    storeNameAr: 'متجر الصفوة الذكي للمبيعات',
    storeNameEn: 'Al-Safwa Smart POS Store',
    storeAddress: 'الرياض، المملكة العربية السعودية',
    storePhone: '+966 50 123 4567',
    taxNumber: '301234567800003',
    defaultTaxRate: 15,
    currency: 'SAR',
    receiptFooterAr: 'شكراً لتعاملكم معنا!',
    receiptFooterEn: 'Thank you for shopping with us!',
    enableSoundEffects: true,
    theme: 'soft-glass-light',
    language: 'ar',
    customCategories: ['عام / General', '🍔 مأكولات وسناكس', '☕ مشروبات وقهوة', '🧼 مواد تنظيف وعناية', '📱 إلكترونيات وصيانة']
  });
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);

  // Sync Dark Mode class with theme setting
  useEffect(() => {
    const isDark = settings.theme === 'soft-glass-dark';
    document.documentElement.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('dark-mode', isDark);
  }, [settings.theme]);

  // Sync browser document title with store name
  useEffect(() => {
    const activeStoreName = (lang === 'ar' ? settings.storeNameAr : settings.storeNameEn) || 'Smart POS & Accounting';
    document.title = `${activeStoreName} | Smart POS`;
  }, [settings.storeNameAr, settings.storeNameEn, lang]);

  // Fetch all data from Offline Backend API
  const fetchAllData = useCallback(async () => {
    try {
      setError(null);
      const [dbRes, sumRes, diagRes] = await Promise.all([
        fetch('/api/db'),
        fetch('/api/summary?period=all'),
        fetch('/api/diagnostics')
      ]);

      if (dbRes.ok) {
        const dbData: AppDatabase = await dbRes.json();
        setProducts(dbData.products || []);
        setCustomers(dbData.customers || []);
        setSuppliers(dbData.suppliers || []);
        setSales(dbData.sales || []);
        setExpenses(dbData.expenses || []);
        setInsights(dbData.insights || []);
        if (dbData.settings) setSettings(dbData.settings);
      } else {
        throw new Error('Failed to connect to offline storage database.');
      }

      if (sumRes.ok) {
        setSummary(await sumRes.json());
      }
      if (diagRes.ok) {
        setDiagnostics(await diagRes.json());
      }
    } catch (err: any) {
      console.error('API Fetch Error:', err);
      setError(lang === 'ar' ? 'تعذر الاتصال بخادم قاعدة البيانات المحلي. تأكد من تشغيل server.ts على منفذ 3000.' : 'Could not connect to local offline database server on port 3000.');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handler: Complete Sale
  const handleCompleteSale = async (invoice: SaleInvoice): Promise<boolean> => {
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to complete sale');
      }
      await fetchAllData();
      return true;
    } catch (err: any) {
      alert(err.message || 'Error processing invoice');
      return false;
    }
  };

  // Handler: Update Invoice Status (Cancel or Refund)
  const handleUpdateInvoiceStatus = async (id: string, updates: Partial<SaleInvoice>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to update invoice status');
      }
      await fetchAllData();
      return true;
    } catch (err: any) {
      alert(err.message || 'Error updating invoice');
      return false;
    }
  };

  // Handler: Save Product
  const handleSaveProduct = async (product: Product): Promise<boolean> => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      if (!res.ok) throw new Error('Failed to save product');
      await fetchAllData();
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Handler: Delete Product
  const handleDeleteProduct = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');
      await fetchAllData();
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Handler: Save Customer
  const handleSaveCustomer = async (customer: Customer): Promise<boolean> => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
      });
      if (!res.ok) throw new Error('Failed to save customer');
      await fetchAllData();
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Handler: Save Supplier
  const handleSaveSupplier = async (supplier: Supplier): Promise<boolean> => {
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplier)
      });
      if (!res.ok) throw new Error('Failed to save supplier');
      await fetchAllData();
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Handler: Save Expense
  const handleSaveExpense = async (expense: Expense): Promise<boolean> => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
      if (!res.ok) throw new Error('Failed to save expense');
      await fetchAllData();
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Handler: Delete Customer
  const handleDeleteCustomer = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete customer');
      await fetchAllData();
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Handler: Delete Supplier
  const handleDeleteSupplier = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete supplier');
      await fetchAllData();
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Handler: Delete Expense
  const handleDeleteExpense = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete expense');
      await fetchAllData();
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Handler: Update Settings
  const handleUpdateSettings = async (newSettings: Partial<SystemSettings>): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (!res.ok) throw new Error('Failed to update settings');
      const data = await res.json();
      if (data && data.settings) {
        setSettings(data.settings);
      }
      await fetchAllData();
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // Handler: Trigger AI Analysis
  const handleRefreshInsights = async () => {
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summary || {})
      });
      if (res.ok) {
        const data = await res.json();
        if (data.insights) setInsights(data.insights);
      }
    } catch (err) {
      console.error('Failed to analyze with Gemini:', err);
    }
  };

  // Handler: Export Backup
  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/backup/export', { method: 'POST' });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SmartPOS_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      alert(lang === 'ar' ? 'فشل تصدير النسخة الاحتياطية' : 'Failed to export backup');
    }
  };

  // Handler: Import Backup
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert(lang === 'ar' ? 'تم استعادة النسخة الاحتياطية بنجاح!' : 'Backup successfully imported!');
        await fetchAllData();
      } else {
        throw new Error('Invalid backup file');
      }
    } catch (err: any) {
      alert(lang === 'ar' ? 'ملف النسخة الاحتياطية غير صالح أو تالف' : 'Invalid backup file payload');
    }
  };

  const handlePeriodChange = async (period: 'today' | 'month' | 'all') => {
    try {
      const res = await fetch(`/api/summary?period=${period}`);
      if (res.ok) {
        setSummary(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#eef2f7] flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
        <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] border border-white/50 animate-bounce mb-6">
          <Sparkles className="w-8 h-8 text-white animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          نظام المبيعات والمحاسبة الذكي - Smart POS
        </h2>
        <p className="text-xs text-slate-500 font-medium animate-pulse">
          جاري التحقق من بيئة التشغيل وتحميل قاعدة البيانات المحلية...
        </p>
      </div>
    );
  }

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-[#eef2f7] text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navbar with Soft Glass Neumorphic UI */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        setLang={setLang}
        diagnostics={diagnostics}
        userRole={userRole}
        setUserRole={setUserRole}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onRefresh={fetchAllData}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {error && (
          <div className="mb-6 bg-white/40 backdrop-blur-md border border-rose-200 text-rose-700 p-4 rounded-3xl shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-semibold">{error}</p>
            </div>
            <button onClick={fetchAllData} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-rose-200">
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}

        {activeTab === 'pos' && (
          <PosCheckout
            products={products}
            customers={customers}
            settings={settings}
            lang={lang}
            onCompleteSale={handleCompleteSale}
            onRefreshProducts={fetchAllData}
            onSaveProduct={handleSaveProduct}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesManager
            sales={sales}
            settings={settings}
            lang={lang}
            userRole={userRole}
            customers={customers}
            onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManager
            products={products}
            settings={settings}
            lang={lang}
            userRole={userRole}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerSupplierManager
            customers={customers}
            suppliers={suppliers}
            settings={settings}
            lang={lang}
            userRole={userRole}
            onSaveCustomer={handleSaveCustomer}
            onSaveSupplier={handleSaveSupplier}
            onDeleteCustomer={handleDeleteCustomer}
            onDeleteSupplier={handleDeleteSupplier}
            onRefreshData={fetchAllData}
          />
        )}

        {activeTab === 'accounting' && (
          <AccountingDashboard
            summary={summary}
            expenses={expenses}
            settings={settings}
            lang={lang}
            userRole={userRole}
            onSaveExpense={handleSaveExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'reports' && (
          <FinancialReports
            summary={summary}
            settings={settings}
            lang={lang}
            onPeriodChange={handlePeriodChange}
          />
        )}

        {activeTab === 'tax_return' && (
          <TaxReturnManager
            sales={sales}
            expenses={expenses}
            settings={settings}
            lang={lang}
          />
        )}

        {activeTab === 'ai' && (
          <AIFinancialAdvisor
            insights={insights}
            summary={summary}
            settings={settings}
            lang={lang}
            onRefreshInsights={handleRefreshInsights}
          />
        )}

        {activeTab === 'settings' && (
          <StoreSettingsView
            settings={settings}
            lang={lang}
            userRole={userRole}
            onUpdateSettings={handleUpdateSettings}
            onRefreshData={fetchAllData}
          />
        )}

        {activeTab === 'guide' && (
          <DesktopGuideView
            diagnostics={diagnostics}
            lang={lang}
          />
        )}
      </main>
    </div>
  );
}
