/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  DollarSign, 
  BarChart3, 
  Sparkles, 
  Terminal, 
  Database, 
  Download, 
  Upload, 
  Globe, 
  Activity,
  ShieldCheck,
  RefreshCw,
  Lock,
  Unlock,
  Key,
  Shield,
  X,
  Check,
  Settings,
  Receipt,
  Moon,
  Sun
} from 'lucide-react';
import { Language, SystemDiagnostics, SystemSettings } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lang: Language;
  setLang: React.Dispatch<React.SetStateAction<Language>>;
  diagnostics: SystemDiagnostics | null;
  userRole: 'admin' | 'cashier';
  setUserRole: (role: 'admin' | 'cashier') => void;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => Promise<boolean>;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  lang,
  setLang,
  diagnostics,
  userRole,
  setUserRole,
  settings,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onRefresh
}) => {
  const isAr = lang === 'ar';

  // Admin PIN verification modal states
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Change PIN modal states
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');

  const restrictedTabs = ['customers', 'accounting', 'ai', 'reports'];

  const navItems = [
    { id: 'pos', labelAr: 'نقطة البيع (POS)', labelEn: 'POS Terminal', icon: ShoppingCart },
    { id: 'invoices', labelAr: 'سجل الفواتير والإلغاء', labelEn: 'Invoices & Returns', icon: Receipt },
    { id: 'inventory', labelAr: 'المخزون والمنتجات', labelEn: 'Inventory', icon: Package },
    { id: 'customers', labelAr: 'العملاء والموردون', labelEn: 'Contacts & Debt', icon: Users },
    { id: 'accounting', labelAr: 'المحاسبة والمصروفات', labelEn: 'Accounting & Expenses', icon: DollarSign },
    { id: 'reports', labelAr: 'التقارير المالية', labelEn: 'Reports & Analytics', icon: BarChart3 },
    { id: 'ai', labelAr: 'المستشار الذكي (Gemini)', labelEn: 'AI Advisor', icon: Sparkles },
    { id: 'settings', labelAr: 'إعدادات المتجر والعملات', labelEn: 'Store & Currencies', icon: Settings },
    { id: 'guide', labelAr: 'دليل بناء Desktop EXE', labelEn: 'Desktop EXE Guide', icon: Terminal },
  ];

  const handleTabClick = (tabId: string) => {
    if (userRole === 'cashier' && restrictedTabs.includes(tabId)) {
      setPendingTab(tabId);
      setIsPinModalOpen(true);
      setPinInput('');
      setPinError(null);
    } else {
      setActiveTab(tabId);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    const currentAdminPin = settings.adminPin || '123456';
    if (pinInput === currentAdminPin) {
      setUserRole('admin');
      setIsPinModalOpen(false);
      setPinError(null);
      if (pendingTab) {
        setActiveTab(pendingTab);
        setPendingTab(null);
      }
    } else {
      setPinError(isAr ? 'الرقم السري للمدير غير صحيح! حاول مرة أخرى.' : 'Incorrect Admin PIN! Please try again.');
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinInput || newPinInput.length < 4) {
      alert(isAr ? 'يرجى إدخال رقم سري مكون من 4 أرقام على الأقل' : 'Please enter at least 4 digits');
      return;
    }
    const success = await onUpdateSettings({ adminPin: newPinInput });
    if (success) {
      setIsChangePinModalOpen(false);
      setNewPinInput('');
      alert(isAr ? 'تم تغيير الرقم السري للمدير بنجاح! 🔐' : 'Admin PIN updated successfully! 🔐');
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/50 border-b border-white/60 shadow-[4px_4px_10px_#d1d9e6] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 border border-white/60">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                {isAr ? 'نظام المبيعات والمحاسبة الذكي' : 'Smart POS & Accounting'}
              </h1>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                {isAr ? 'بيئة تشغيل محلية ومحميّة (Offline-First)' : 'Offline-First Secure Engine'}
                {diagnostics?.isPortable && (
                  <span className="px-1.5 py-0.2 text-[10px] bg-amber-100 text-amber-700 border border-amber-300 rounded-md font-bold">
                    Portable EXE
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Diagnostics, Role Switcher & Backup Controls */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Role Switcher & Security Pill */}
            {userRole === 'cashier' ? (
              <button
                onClick={() => {
                  setPendingTab(null);
                  setIsPinModalOpen(true);
                  setPinInput('');
                  setPinError(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold shadow-sm transition transform active:scale-95"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>{isAr ? 'البائع (صلاحيات محدودة) | دخول المدير 🔐' : 'Cashier (Limited) | Admin Login 🔐'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setUserRole('cashier');
                    setActiveTab('pos');
                  }}
                  title={isAr ? 'التبديل لوضع البائع (الكاشير)' : 'Switch to Cashier Mode'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-800 text-xs font-extrabold shadow-sm transition transform active:scale-95"
                >
                  <Unlock className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                  <span>{isAr ? '👑 المدير (صلاحيات كاملة) | قفل الكاشير' : '👑 Manager (Full) | Lock Cashier'}</span>
                </button>

                <button
                  onClick={() => {
                    setNewPinInput('');
                    setIsChangePinModalOpen(true);
                  }}
                  title={isAr ? 'تغيير كلمة مرور المدير' : 'Change Admin PIN'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-black shadow-md border border-amber-300 transition transform active:scale-95"
                >
                  <Key className="w-3.5 h-3.5 text-slate-900" />
                  <span>{isAr ? 'تغيير كلمة المرور 🔐' : 'Change PIN 🔐'}</span>
                </button>
              </div>
            )}

            {/* Status Pill */}
            <div 
              title={isAr ? `مسار الحفظ: ${diagnostics?.dbPath || 'جاري الاتصال...'}` : `Storage Path: ${diagnostics?.dbPath || 'Connecting...'}`}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 border border-white/80 text-xs text-slate-600 shadow-[2px_2px_6px_#d1d9e6,-2px_-2px_6px_#ffffff] cursor-help transition hover:bg-white/80"
            >
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-mono">{diagnostics?.memoryUsageMB || 0} MB</span>
              <span className="text-slate-400">|</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {isAr ? 'آمن ومحلي' : 'Local Safe'}
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              title={isAr ? 'تحديث البيانات' : 'Refresh Data'}
              className="hidden sm:flex p-2 rounded-xl bg-white/60 hover:bg-white/80 border border-white/80 text-slate-600 hover:text-slate-800 shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Export Backup */}
            <button
              onClick={onExportBackup}
              title={isAr ? 'تصدير نسخة احتياطية من قاعدة البيانات' : 'Export DB Backup'}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? 'تصدير نسخة' : 'Backup'}</span>
            </button>

            {/* Import Backup */}
            <label
              title={isAr ? 'استعادة نسخة احتياطية' : 'Restore DB Backup'}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-sm cursor-pointer transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isAr ? 'استعادة' : 'Restore'}</span>
              <input type="file" accept=".json" onChange={onImportBackup} className="hidden" />
            </label>

            {/* Theme Toggle (الوضع الليلي) */}
            <button
              onClick={() => onUpdateSettings({ theme: settings.theme === 'soft-glass-dark' ? 'soft-glass-light' : 'soft-glass-dark' })}
              title={isAr ? 'التبديل بين الوضع الليلي والنهاري' : 'Toggle Dark/Light Mode'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm transition transform active:scale-95 cursor-pointer ${
                settings.theme === 'soft-glass-dark'
                  ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-white/60 hover:bg-white/80 text-slate-700 border-white/80 shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff]'
              }`}
            >
              {settings.theme === 'soft-glass-dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                  <span>{isAr ? 'الوضع النهاري' : 'Light Mode'}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isAr ? 'الوضع الليلي' : 'Dark Mode'}</span>
                </>
              )}
            </button>

            {/* Language Toggle */}
            <button
              onClick={() => setLang(isAr ? 'en' : 'ar')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/60 hover:bg-white/80 border border-white/80 text-xs font-semibold text-slate-700 shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] transition cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isAr ? 'English' : 'عربي'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Neumorphic Glass Tabs) */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar border-t border-slate-200/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isRestricted = restrictedTabs.includes(item.id);
            const isLockedForCashier = userRole === 'cashier' && isRestricted;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border border-indigo-500 scale-[1.02]'
                    : isLockedForCashier
                    ? 'bg-amber-50/70 hover:bg-amber-100/80 text-amber-800 border border-amber-200/80 shadow-[1px_1px_4px_#d1d9e6]'
                    : 'bg-white/40 hover:bg-white/70 text-slate-600 hover:text-slate-800 border border-white/60 shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isLockedForCashier ? 'text-amber-600' : 'text-indigo-600'}`} />
                <span>{isAr ? item.labelAr : item.labelEn}</span>
                {isLockedForCashier && (
                  <Lock className="w-3.5 h-3.5 text-amber-600 animate-pulse" title={isAr ? 'محمي برقم سر المدير' : 'Protected by Admin PIN'} />
                )}
                {item.id === 'ai' && !isLockedForCashier && (
                  <span className="ml-1 px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-100 text-amber-700 rounded-full border border-amber-300 animate-pulse">
                    AI
                  </span>
                )}
                {item.id === 'guide' && (
                  <span className="ml-1 px-1.5 py-0.2 text-[9px] font-extrabold bg-emerald-100 text-emerald-700 rounded-full border border-emerald-300">
                    EXE
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ADMIN PIN VERIFICATION MODAL */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#eef2f7] border border-white/80 rounded-3xl p-6 w-full max-w-md shadow-[16px_16px_32px_rgba(0,0,0,0.15),-16px_-16px_32px_#ffffff] transition-all">
            <div className="flex justify-between items-center pb-4 border-b border-slate-300/60 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">
                    {isAr ? 'صلاحيات المدير (تسجيل الدخول)' : 'Manager Verification'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'أدخل الرقم السري للوصول للإدارة الكاملة' : 'Enter Admin PIN to access management'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setIsPinModalOpen(false); setPendingTab(null); }} 
                className="p-2 rounded-xl bg-white/60 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isAr ? 'الرقم السري للمدير:' : 'Admin PIN:'}
                </label>
                <input
                  type="password"
                  autoFocus
                  maxLength={10}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-3 text-center tracking-widest text-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] transition"
                />
              </div>

              {pinError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
                  {pinError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsPinModalOpen(false); setPendingTab(null); }}
                  className="px-5 py-2.5 rounded-2xl bg-white/60 hover:bg-white text-slate-700 text-xs font-bold transition shadow-xs"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-md shadow-indigo-200 transition transform active:scale-95 flex items-center gap-1.5"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{isAr ? 'دخول المدير' : 'Verify & Login'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE ADMIN PIN MODAL */}
      {isChangePinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#eef2f7] border border-white/80 rounded-3xl p-6 w-full max-w-md shadow-[16px_16px_32px_rgba(0,0,0,0.15),-16px_-16px_32px_#ffffff] transition-all">
            <div className="flex justify-between items-center pb-4 border-b border-slate-300/60 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">
                    {isAr ? 'تغيير الرقم السري للمدير' : 'Change Admin PIN'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'تعيين رقم سري جديد لحماية صلاحيات الإدارة' : 'Set a new security PIN for admin access'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsChangePinModalOpen(false)} 
                className="p-2 rounded-xl bg-white/60 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isAr ? 'الرقم السري الجديد:' : 'New Admin PIN:'}
                </label>
                <input
                  type="password"
                  autoFocus
                  maxLength={10}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-3 text-center tracking-widest text-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] transition"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {isAr ? 'ملاحظة: هذا الرقم سيُستخدم للدخول إلى العملاء، والمصروفات والتقارير ولتعديل إعدادات المتجر.' : 'Note: This PIN protects contacts, expenses, reports and modifying store settings.'}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePinModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-white/60 hover:bg-white text-slate-700 text-xs font-bold transition shadow-xs"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-md shadow-indigo-200 transition transform active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isAr ? 'حفظ الرقم الجديد' : 'Save PIN'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

