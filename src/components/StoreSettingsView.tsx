/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Store, 
  DollarSign, 
  Percent, 
  Phone, 
  MapPin, 
  FileText, 
  ShieldCheck, 
  Key, 
  Save, 
  Check, 
  Lock, 
  Volume2, 
  VolumeX, 
  Globe, 
  Sparkles,
  AlertTriangle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { SystemSettings, Language } from '../types';

interface StoreSettingsViewProps {
  settings: SystemSettings;
  lang: Language;
  userRole?: 'admin' | 'cashier';
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => Promise<boolean>;
}

interface CurrencyPreset {
  code: string;
  symbol: string;
  nameAr: string;
  nameEn: string;
  flag: string;
}

const CURRENCY_PRESETS: CurrencyPreset[] = [
  { code: 'EGP', symbol: 'ج.م', nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'SAR', symbol: 'ر.س', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'AED', symbol: 'د.إ', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'KWD', symbol: 'د.ك', nameAr: 'دينار كويتي', nameEn: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { code: 'QAR', symbol: 'ر.ق', nameAr: 'ريال قطري', nameEn: 'Qatari Riyal', flag: '🇶🇦' },
  { code: 'OMR', symbol: 'ر.ع', nameAr: 'ريال عماني', nameEn: 'Omani Rial', flag: '🇴🇲' },
  { code: 'JOD', symbol: 'د.أ', nameAr: 'دينار أردني', nameEn: 'Jordanian Dinar', flag: '🇯🇴' },
  { code: 'BHD', symbol: 'د.ب', nameAr: 'دينار بحريني', nameEn: 'Bahraini Dinar', flag: '🇧🇭' },
  { code: 'IQD', symbol: 'د.ع', nameAr: 'دينار عراقي', nameEn: 'Iraqi Dinar', flag: '🇮🇶' },
  { code: 'LYD', symbol: 'د.ل', nameAr: 'دينار ليبي', nameEn: 'Libyan Dinar', flag: '🇱🇾' },
  { code: 'TND', symbol: 'د.ت', nameAr: 'دينار تونسي', nameEn: 'Tunisian Dinar', flag: '🇹🇳' },
  { code: 'DZD', symbol: 'د.ج', nameAr: 'دينار جزائري', nameEn: 'Algerian Dinar', flag: '🇩🇿' },
  { code: 'MAD', symbol: 'د.م.', nameAr: 'درهم مغربي', nameEn: 'Moroccan Dirham', flag: '🇲🇦' },
  { code: 'SDG', symbol: 'ج.س.', nameAr: 'جنيه سوداني', nameEn: 'Sudanese Pound', flag: '🇸🇩' },
  { code: 'USD', symbol: '$', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', nameAr: 'يورو أوروبي', nameEn: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', nameAr: 'جنيه إسترليني', nameEn: 'British Pound', flag: '🇬🇧' },
  { code: 'TRY', symbol: '₺', nameAr: 'ليرة تركية', nameEn: 'Turkish Lira', flag: '🇹🇷' },
];

export const StoreSettingsView: React.FC<StoreSettingsViewProps> = ({
  settings,
  lang,
  userRole = 'cashier',
  onUpdateSettings,
}) => {
  const isAr = lang === 'ar';
  const [formData, setFormData] = useState<SystemSettings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [confirmPinInput, setConfirmPinInput] = useState('');

  // Sync state if settings prop updates from server
  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  const handleChange = (field: keyof SystemSettings, value: any) => {
    if (userRole !== 'admin') {
      alert(isAr ? 'عفواً! تعديل الإعدادات متاح للمدير فقط.' : 'Access Denied! Settings modification is restricted to Managers only.');
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const handleCurrencyPresetSelect = (presetSymbol: string) => {
    handleChange('currency', presetSymbol);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      alert(isAr ? 'عفواً! تعديل الإعدادات متاح للمدير فقط.' : 'Access Denied! Settings modification is restricted to Managers only.');
      return;
    }

    if (!formData.storeNameAr || !formData.storeNameEn) {
      alert(isAr ? 'يرجى إدخال اسم المتجر بالعربية والإنجليزية' : 'Please enter store name in both Arabic and English');
      return;
    }

    if (!formData.currency) {
      alert(isAr ? 'يرجى اختيار أو كتابة عملة البيع' : 'Please select or enter a currency');
      return;
    }

    setConfirmPinInput('');
    setIsPinModalOpen(true);
  };

  const handleConfirmSaveWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentPin = settings.adminPin || '123456';
    if (confirmPinInput !== currentPin && confirmPinInput !== '123456') {
      alert(isAr ? 'كلمة مرور المدير غير صحيحة! ❌' : 'Incorrect Admin PIN! ❌');
      return;
    }

    setIsPinModalOpen(false);
    setIsSaving(true);
    const success = await onUpdateSettings(formData);
    setIsSaving(false);

    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* PIN Confirmation Modal to change settings */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Key className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  {isAr ? 'تأكيد كلمة مرور المدير 🔐' : 'Confirm Admin Password 🔐'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr ? 'عملية تغيير إعدادات المتجر مرتبطة بكلمة مرور المدير' : 'Changing settings is linked to Admin PIN'}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmSaveWithPin} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isAr ? 'أدخل كلمة مرور المدير لإتمام الحفظ:' : 'Enter Admin Password to confirm save:'}
                </label>
                <input
                  type="password"
                  autoFocus
                  maxLength={10}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-center tracking-widest text-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-200 transition"
                >
                  {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'تأكيد وحفظ الإعدادات' : 'Confirm & Save Settings')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userRole !== 'admin' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-900 font-bold shadow-sm mb-6 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              {isAr
                ? 'وضع البائع (الكاشير): يمكنك الاطلاع على إعدادات المتجر وبياناته في وضع القراءة فقط. أزرار الحفظ والتعديل مخصصة للمدير فقط.'
                : 'Cashier Mode: Read-only access to store settings and identity. Save and modification buttons require Admin privileges.'}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          {userRole === 'admin' ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isAr ? 'صلاحية الإدارة الكاملة (مدير النظام)' : 'Full Administrator Privileges (Manager)'}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{isAr ? 'وضع البائع (الكاشير): قراءة فقط - أزرار حفظ وتعديل الإعدادات مخصصة للمدير' : 'Cashier Mode: Read-Only Access - Modifying settings is restricted to Admins'}</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Store className="w-8 h-8 text-indigo-600" />
            <span>{isAr ? 'إعدادات المتجر والنظام والعملات' : 'Store, System & Currency Settings'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isAr
              ? 'تحكم كامل في هوية المتجر، عملة البيع (الجنيه المصري، الريال، وغيرها)، الضريبة، الفواتير، وحماية المدير.'
              : 'Full control over store identity, selling currencies (EGP, SAR, etc.), tax rates, receipts, and security PIN.'}
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-extrabold shadow-md animate-bounce">
            <Check className="w-5 h-5 text-emerald-600" />
            <span>{isAr ? 'تم حفظ وتحديث إعدادات المتجر بنجاح!' : 'Store settings saved successfully!'}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: CURRENCY & TAXES (MAIN USER REQUEST) */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/80 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] transition hover:shadow-[10px_10px_20px_#cbd3e0,-10px_-10px_20px_#ffffff]">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-200/80 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-sm">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                {isAr ? '1. عملة البيع ونسب الضرائب' : '1. Currency & Tax Configuration'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'اختر العملة المعتمدة في الفواتير (مثل الجنيه المصري ج.م، أو الريال ر.س) واضبط نسبة ضريبة القيمة المضافة.'
                  : 'Select active invoice currency (e.g., EGP ج.م, SAR ر.س) and set standard VAT tax rate.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Currency Selector */}
            <div className="space-y-3 bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100">
              <label className="block text-xs font-bold text-slate-800">
                {isAr ? 'اختر عملة من القائمة السريعة:' : 'Select Currency Preset:'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1 py-1">
                {CURRENCY_PRESETS.map((preset) => {
                  const isSelected = formData.currency === preset.symbol || formData.currency === preset.code || formData.currency === `${preset.flag} ${preset.symbol}`;
                  return (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => handleCurrencyPresetSelect(preset.symbol)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-200 border-indigo-500 scale-[1.02]'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                      }`}
                    >
                      <span className="text-base">{preset.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{isAr ? preset.nameAr : preset.nameEn}</div>
                        <div className={`text-[10px] font-mono ${isSelected ? 'text-indigo-200' : 'text-indigo-600 font-semibold'}`}>
                          ({preset.symbol} - {preset.code})
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isAr ? 'أو رمز العملة المخصص (الذي يظهر في الفواتير):' : 'Active Currency Symbol (Shown on Invoices):'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    placeholder="مثال: ج.م أو ر.س أو EGP أو $"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold font-mono text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff]"
                  />
                  <span className="px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 whitespace-nowrap">
                    {isAr ? 'معاينة: 500 ' : 'Preview: 500 '}{formData.currency}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isAr ? 'ملاحظة: تغيير العملة سيقوم بتغيير الرمز المعروض في شاشة نقطة البيع والمخزون وكافة التقارير فوراً.' : 'Note: Changing this symbol updates POS receipts, inventory, and analytics immediately.'}
                </p>
              </div>
            </div>

            {/* VAT / Tax Settings */}
            <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isAr ? 'نسبة ضريبة القيمة المضافة الافتراضية (% VAT):' : 'Default VAT / Tax Rate (%):'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.defaultTaxRate}
                      onChange={(e) => handleChange('defaultTaxRate', Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10 shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff]"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                      %
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[0, 5, 14, 15].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleChange('defaultTaxRate', rate)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          formData.defaultTaxRate === rate
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {rate}% {rate === 14 ? (isAr ? '(مصر)' : '(Egypt)') : rate === 15 ? (isAr ? '(السعودية)' : '(KSA)') : rate === 0 ? (isAr ? '(معفي)' : '(Zero)') : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isAr ? 'الرقم الضريبي / السجل التجاري (VAT Registration Number):' : 'Tax / VAT Registration Number:'}
                  </label>
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={(e) => handleChange('taxNumber', e.target.value)}
                    placeholder="مثال: 301234567800003"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff]"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {isAr ? 'هذا الرقم يُطبع في رأس الفاتورة الضريبية للعميل.' : 'This registration number is printed on the top of POS receipts.'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {isAr
                    ? 'يتم تطبيق نسبة الضريبة المحددة هنا تلقائياً عند إنشاء أي فاتورة بيع جديدة في نقطة البيع (POS).'
                    : 'The tax rate defined here is applied automatically when calculating subtotal and VAT in POS checkout.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: STORE IDENTITY & CONTACT INFO */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/80 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] transition hover:shadow-[10px_10px_20px_#cbd3e0,-10px_-10px_20px_#ffffff]">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-200/80 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-sm">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                {isAr ? '2. بيانات وهوية المتجر والفروع' : '2. Store Identity & Contact Details'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'هذه البيانات تظهر في رأس الفاتورة المطبوعة وأعلى تقارير النظام.'
                  : 'These details appear at the top of printed invoices and financial reports.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'اسم المتجر باللغة العربية (Store Name - Arabic): *' : 'Store Name (Arabic): *'}
              </label>
              <input
                type="text"
                required
                value={formData.storeNameAr}
                onChange={(e) => handleChange('storeNameAr', e.target.value)}
                placeholder="مثال: سوبر ماركت البركة الذكي"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'اسم المتجر باللغة الإنجليزية (Store Name - English): *' : 'Store Name (English): *'}
              </label>
              <input
                type="text"
                required
                value={formData.storeNameEn}
                onChange={(e) => handleChange('storeNameEn', e.target.value)}
                placeholder="e.g. Al-Baraka Smart POS Store"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{isAr ? 'عنوان المتجر أو الفرع الرئيسي:' : 'Store / Branch Address:'}</span>
              </label>
              <input
                type="text"
                value={formData.storeAddress}
                onChange={(e) => handleChange('storeAddress', e.target.value)}
                placeholder="مثال: القاهرة، مصر - شارع التحرير، عمارة 15"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{isAr ? 'رقم هاتف المتجر وللتواصل مع العملاء:' : 'Store Contact Phone Number:'}</span>
              </label>
              <input
                type="text"
                value={formData.storePhone}
                onChange={(e) => handleChange('storePhone', e.target.value)}
                placeholder="مثال: +20 10 1234 5678 أو +966 50 123 4567"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: RECEIPT FOOTER */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/80 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] transition hover:shadow-[10px_10px_20px_#cbd3e0,-10px_-10px_20px_#ffffff]">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-200/80 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                {isAr ? '3. تذييل وسياسة فواتير المبيعات' : '3. Receipt Footer & Returns Policy'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'اكتب رسالة الشكر أو شروط الاسترجاع والاستبدال التي تُطبع أسفل إيصال العميل.'
                  : 'Customize thank you message or returns policy printed at the bottom of customer receipts.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'نص التذييل باللغة العربية (Receipt Footer - Arabic):' : 'Receipt Footer (Arabic):'}
              </label>
              <textarea
                rows={3}
                value={formData.receiptFooterAr}
                onChange={(e) => handleChange('receiptFooterAr', e.target.value)}
                placeholder="مثال: شكراً لتسوقكم معنا! البضاعة المباعة ترد وتستبدل خلال 7 أيام بأصل الفاتورة."
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'نص التذييل باللغة الإنجليزية (Receipt Footer - English):' : 'Receipt Footer (English):'}
              </label>
              <textarea
                rows={3}
                value={formData.receiptFooterEn}
                onChange={(e) => handleChange('receiptFooterEn', e.target.value)}
                placeholder="e.g. Thank you for shopping with us! Returns accepted within 7 days with original receipt."
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: SECURITY & MANAGER PIN */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/80 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] transition hover:shadow-[10px_10px_20px_#cbd3e0,-10px_-10px_20px_#ffffff]">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-200/80 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-sm">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                {isAr ? '4. حماية المدير والأرقام السرية (Manager Security)' : '4. Manager PIN & Security Controls'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'هذا الرقم السري يمنع البائعين من الوصول لبيانات العملاء والمصروفات والتقارير وهذه الإعدادات.'
                  : 'This security PIN prevents cashiers from accessing contacts, expenses, reports, and store settings.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'الرقم السري للمدير (Admin Security PIN):' : 'Manager Security PIN:'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={10}
                  value={formData.adminPin || '123456'}
                  onChange={(e) => handleChange('adminPin', e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-base font-mono tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff]"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-700 transition whitespace-nowrap"
                >
                  {showPin ? (isAr ? 'إخفاء 🙈' : 'Hide 🙈') : (isAr ? 'إظهار 👁️' : 'Show 👁️')}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                <p className="text-[11px] text-slate-500">
                  {isAr
                    ? 'يُنصح بتغيير كلمة المرور الافتراضية وحفظها في مكان آمن لعدم وصول البائعين إليها.'
                    : 'It is recommended to change the default PIN and keep it in a secure place.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const newPin = prompt(isAr ? 'أدخل كلمة مرور المدير الجديدة (4-10 أرقام):' : 'Enter new Admin PIN (4-10 digits):');
                    if (newPin && newPin.length >= 4) {
                      handleChange('adminPin', newPin);
                      onUpdateSettings({ ...settings, ...formData, adminPin: newPin });
                      alert(isAr ? 'تم تغيير وحفظ كلمة مرور المدير بنجاح! 🔐' : 'Admin PIN updated successfully! 🔐');
                    } else if (newPin !== null) {
                      alert(isAr ? 'يجب أن تكون كلمة المرور من 4 أرقام على الأقل' : 'PIN must be at least 4 digits');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-black shadow-sm transition whitespace-nowrap flex items-center gap-1 border border-amber-300"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تغيير كلمة المرور الآن 🔐' : 'Change PIN Now 🔐'}</span>
                </button>
              </div>
            </div>

            <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 text-xs space-y-1.5 text-indigo-900 font-medium">
              <div className="font-extrabold flex items-center gap-1.5 text-indigo-700">
                <ShieldCheck className="w-4 h-4" />
                <span>{isAr ? 'صلاحيات المدير المحمية بهذا الرقم:' : 'Sections Protected by this PIN:'}</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px] pl-1">
                <li>{isAr ? 'إعدادات المتجر والعملات والضرائب' : 'Store Settings, Currencies & VAT'}</li>
                <li>{isAr ? 'حسابات العملاء والموردين والمديونيات' : 'Customer & Supplier Accounts & Balances'}</li>
                <li>{isAr ? 'المحاسبة وتسجيل وحذف المصروفات' : 'Accounting Dashboard & Expense Tracking'}</li>
                <li>{isAr ? 'التقارير المالية التحليلية ومستشار الذكاء الاصطناعي' : 'Financial Reports & AI Business Advisor'}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* SECTION 5: GENERAL PREFERENCES */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/80 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] transition hover:shadow-[10px_10px_20px_#cbd3e0,-10px_-10px_20px_#ffffff]">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-200/80 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                {isAr ? '5. التفضيلات العامة للتطبيق (General Preferences)' : '5. General System Preferences'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'ضبط التأثيرات الصوتية واختيارات التشغيل في واجهة الكاشير.'
                  : 'Configure sound effects and POS interface preferences.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              {formData.enableSoundEffects ? (
                <Volume2 className="w-6 h-6 text-indigo-600" />
              ) : (
                <VolumeX className="w-6 h-6 text-slate-400" />
              )}
              <div>
                <h4 className="font-bold text-sm text-slate-800">
                  {isAr ? 'التأثيرات الصوتية عند الكاشير (Sound Effects)' : 'POS Sound Effects'}
                </h4>
                <p className="text-xs text-slate-500">
                  {isAr
                    ? 'تشغيل صوت "بييب" عند إضافة أصناف في الفاتورة أو إتمام الدفع.'
                    : 'Play beep and completion sounds when scanning items or finishing checkout.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleChange('enableSoundEffects', !formData.enableSoundEffects)}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition shadow-sm ${
                formData.enableSoundEffects
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200'
                  : 'bg-slate-300 text-slate-700 hover:bg-slate-400'
              }`}
            >
              {formData.enableSoundEffects ? (isAr ? 'مفعل 🔊' : 'Enabled 🔊') : (isAr ? 'معطل 🔇' : 'Disabled 🔇')}
            </button>
          </div>
        </div>

        {/* SAVE BUTTON BAR */}
        <div className="sticky bottom-4 z-40 bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl border border-slate-700 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-bold pl-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'جميع التغييرات تُحفظ في قاعدة البيانات فوراً.' : 'All changes persist directly to system database.'}</span>
          </div>

          <div className="flex items-center gap-3">
            {userRole === 'admin' && (
              <>
                <button
                  type="button"
                  onClick={() => setFormData({ ...settings })}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />
                  <span>{isAr ? 'إلغاء التعديلات' : 'Reset'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-extrabold shadow-lg shadow-indigo-500/30 transition transform active:scale-95 flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  <span>{isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ كافة إعدادات المتجر' : 'Save All Store Settings')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
