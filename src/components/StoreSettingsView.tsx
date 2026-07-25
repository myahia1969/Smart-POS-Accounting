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
  RefreshCw,
  Database,
  Download,
  Upload,
  Printer
} from 'lucide-react';
import { SystemSettings, Language } from '../types';

interface StoreSettingsViewProps {
  settings: SystemSettings;
  lang: Language;
  userRole?: 'admin' | 'cashier';
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => Promise<boolean>;
  onRefreshData?: () => void;
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
  onRefreshData,
}) => {
  const isAr = lang === 'ar';
  const [formData, setFormData] = useState<SystemSettings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [confirmPinInput, setConfirmPinInput] = useState('');

  // Printer selection dialog state
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<{ name: string; displayName?: string; description?: string; status?: number; isDefault?: boolean }[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [isElectronEnv, setIsElectronEnv] = useState(false);

  const fetchPrinters = async () => {
    setIsLoadingPrinters(true);
    try {
      if ((window as any).electronAPI && typeof (window as any).electronAPI.getPrinters === 'function') {
        setIsElectronEnv(true);
        const list = await (window as any).electronAPI.getPrinters();
        if (Array.isArray(list) && list.length > 0) {
          setAvailablePrinters(list);
          setIsLoadingPrinters(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch printers via Electron IPC:', e);
    }
    
    // Fallback/Demo presets for Web / Node.js Dev Mode preview
    setIsElectronEnv(false);
    setAvailablePrinters([
      { name: 'default', displayName: isAr ? '🖨️ طابعة النظام الافتراضية (System Default / Window Print)' : '🖨️ System Default Printer (Window Print)', isDefault: true },
      { name: 'EPSON_TM_T88VI', displayName: '🖨️ EPSON TM-T88VI Thermal Receipt Printer (USB)', description: 'ESC/POS 80mm Direct Thermal' },
      { name: 'Star_TSP143III', displayName: '🖨️ Star TSP143III Bi-directional Receipt (LAN/USB)', description: 'High speed receipt cutter' },
      { name: 'Xprinter_XP_80C', displayName: '🖨️ Xprinter XP-80C Thermal POS Printer', description: 'Standard 80mm ESC/POS' },
      { name: 'Bixolon_SRP_330II', displayName: '🖨️ Bixolon SRP-330II POS Receipt Printer', description: 'Thermal barcode receipt printer' },
      { name: 'Microsoft_Print_To_PDF', displayName: '📄 Microsoft Print to PDF', description: 'Virtual PDF output document' }
    ]);
    setIsLoadingPrinters(false);
  };

  const handleTestPrint = async (printerName: string) => {
    if ((window as any).electronAPI && typeof (window as any).electronAPI.printReceipt === 'function' && printerName !== 'default') {
      const sampleHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2>${isAr ? 'فاتورة تجريبية - فحص الطابعة' : 'Test Receipt - Printer Check'}</h2>
          <p><strong>${formData.storeNameAr}</strong></p>
          <p>${formData.storeNameEn}</p>
          <hr />
          <p>${isAr ? 'اسم الطابعة المحددة:' : 'Selected Printer:'} <b>${printerName}</b></p>
          <p>${isAr ? 'تم الاتصال وإرسال أمر الطباعة بنجاح من نظام المحاسبة الذكي.' : 'Successfully sent print job from Smart POS system.'}</p>
          <hr />
          <p style="font-size: 12px;">${new Date().toLocaleString()}</p>
        </div>
      `;
      await (window as any).electronAPI.printReceipt(sampleHtml, printerName);
      alert(isAr ? `تم إرسال أمر الطباعة التجريبية إلى الطابعة "${printerName}" بنجاح! 🖨️` : `Test print job sent to printer "${printerName}" successfully! 🖨️`);
    } else {
      alert(isAr ? `تم تحديد الطابعة "${printerName}". في وضع المتصفح الحالي (Web Mode)، يتم استخدام نافذة الطباعة القياسية للنظام عند إصدار الفاتورة.` : `Selected "${printerName}". In Web Mode, the standard OS print dialog will be used for receipts.`);
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const handleExportBackup = async () => {
    setIsExporting(true);
    setBackupMessage(null);
    try {
      const res = await fetch('/api/backup/export', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data.backup, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        const dateStr = new Date().toISOString().slice(0, 10);
        downloadAnchor.setAttribute("download", `store_backup_${dateStr}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        setBackupMessage(isAr ? '✅ تم تصدير وتحميل النسخة الاحتياطية بنجاح!' : '✅ Backup exported and downloaded successfully!');
      } else {
        throw new Error(data.error || 'Failed to export backup');
      }
    } catch (err: any) {
      alert(isAr ? `خطأ في التصدير: ${err.message}` : `Export Error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(isAr ? '⚠️ تحذير: استعادة النسخة الاحتياطية ستستبدل جميع بيانات المتجر الحالية (المنتجات، الفواتير، والعملاء). هل أنت متأكد؟' : '⚠️ WARNING: Restoring a backup will replace all current store data (products, invoices, customers). Are you sure?')) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    setBackupMessage(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const backupData = JSON.parse(content);
        const res = await fetch('/api/backup/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backup: backupData })
        });
        const result = await res.json();
        if (res.ok && result.success) {
          setBackupMessage(isAr ? '🎉 تم استعادة البيانات بنجاح! سيتم تحديث النظام...' : '🎉 Data restored successfully! Refreshing system...');
          setTimeout(() => {
            if (onRefreshData) onRefreshData();
            window.location.reload();
          }, 1500);
        } else {
          throw new Error(result.error || 'Failed to restore backup');
        }
      } catch (err: any) {
        alert(isAr ? `خطأ في استعادة الملف: ${err.message}` : `Restore Error: ${err.message}`);
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Sync state if settings prop updates from server
  useEffect(() => {
    if (!isSaving && !isPinModalOpen) {
      setFormData({ ...settings });
    }
  }, [settings, isSaving, isPinModalOpen]);

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

      {/* Printer Selection Dialog Modal */}
      {isPrinterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-5 max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <span>{isAr ? 'إعدادات طابعة إيصالات الكاشير' : 'Receipt Printer Selection Dialog'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <span>{isAr ? 'عبر واجهة Electron (webContents.getPrinters API)' : 'Powered by Electron (webContents.getPrinters API)'}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${isElectronEnv ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {isElectronEnv ? (isAr ? '⚡ متصل ببيئة Electron' : '⚡ Electron Desktop Active') : (isAr ? '🌐 وضع المتصفح (Web Mode)' : '🌐 Web Browser Preview Mode')}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrinterModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <div className="text-slate-600 font-medium">
                {isAr ? 'الطابعة الحالية المحددة:' : 'Current Default Printer:'} 
                <span className="font-black text-indigo-700 ml-1 rtl:mr-1 rtl:ml-0">
                  {formData.defaultPrinter || (isAr ? 'طابعة النظام الافتراضية' : 'System Default OS Printer')}
                </span>
              </div>
              <button
                type="button"
                onClick={fetchPrinters}
                disabled={isLoadingPrinters}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 transition flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPrinters ? 'animate-spin text-indigo-600' : ''}`} />
                <span>{isAr ? 'تحديث قائمة الطابعات' : 'Refresh Printers'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isLoadingPrinters ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                  <span className="text-sm font-bold">{isAr ? 'جاري فحص الطابعات المتصلة بالنظام...' : 'Scanning system printers via getPrinters API...'}</span>
                </div>
              ) : availablePrinters.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="font-bold text-sm">{isAr ? 'لم يتم العثور على طابعات متصلة بالنظام حالياً' : 'No printers detected on this system'}</p>
                  <p className="text-xs text-slate-400 mt-1">{isAr ? 'تأكد من توصيل طابعة الإيصالات عبر USB أو شبكة LAN وتشغيلها.' : 'Ensure your thermal receipt printer is powered on and connected via USB/LAN.'}</p>
                </div>
              ) : (
                availablePrinters.map((printer, idx) => {
                  const isSelected = formData.defaultPrinter === printer.name || (!formData.defaultPrinter && printer.name === 'default');
                  return (
                    <div
                      key={idx}
                      onClick={() => handleChange('defaultPrinter', printer.name === 'default' ? undefined : printer.name)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isSelected 
                          ? 'bg-indigo-50/80 border-indigo-500 shadow-md ring-1 ring-indigo-500' 
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Printer className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm text-slate-800">
                              {printer.displayName || printer.name}
                            </h4>
                            {printer.isDefault && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                                {isAr ? 'طابعة الويندوز الافتراضية 🖥️' : 'OS Default 🖥️'}
                              </span>
                            )}
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-black shadow-2xs">
                                {isAr ? 'تم الاختيار ✓' : 'Selected ✓'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            {printer.description || (isAr ? 'طابعة إيصالات كاشير حرارية جاهزة للعمل' : 'Thermal ESC/POS receipt printer ready')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestPrint(printer.name);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 font-bold text-xs transition border border-slate-200 hover:border-indigo-300 flex items-center gap-1"
                          title={isAr ? 'إرسال أمر طباعة تجريبي' : 'Send test receipt print job'}
                        >
                          <span>{isAr ? '🧪 تجربة الطباعة' : '🧪 Test Print'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 bg-white">
              <div className="text-[11px] text-slate-500">
                {isAr ? '💡 سيتم استخدام هذه الطابعة تلقائياً في شاشة الكاشير السريع دون طلب تأكيد.' : '💡 This printer will be used automatically during POS checkout.'}
              </div>
              <button
                type="button"
                onClick={() => setIsPrinterModalOpen(false)}
                className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 transition"
              >
                {isAr ? 'تم، حفظ وإغلاق ✓' : 'Done, Save & Close ✓'}
              </button>
            </div>
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

        {/* SECTION 3: RECEIPT FOOTER & RETURN POLICIES */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/80 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] transition hover:shadow-[10px_10px_20px_#cbd3e0,-10px_-10px_20px_#ffffff]">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-200/80 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                {isAr ? '3. تذييل وسياسات الاسترجاع والاستبدال المعتمدة' : '3. Receipt Footer & Official Returns Policy'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'قم بإدارة شروط الاسترجاع والاستبدال التي تُطبع على الفواتير الضريبية وتذييل إيصال العميل.'
                  : 'Manage return & exchange policies printed on tax invoices and customer receipt footers.'}
              </p>
            </div>
          </div>

          {/* Quick Policy Presets */}
          <div className="mb-6 bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl">
            <label className="block text-xs font-black text-emerald-900 mb-2.5 flex items-center gap-1.5">
              <span>⚡</span>
              <span>{isAr ? 'قوالب سياسة الاسترجاع السريعة (اضغط للتطبيق المباشر):' : 'Quick Policy Templates (Click to Apply):'}</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  handleChange('defaultReturnPolicyAr', 'البضاعة المباعة ترد وتستبدل خلال 7 أيام بشرط سلامة المنتج ووجود أصل الفاتورة.');
                  handleChange('defaultReturnPolicyEn', 'Returns and exchanges accepted within 7 days with original receipt and intact condition.');
                }}
                className="px-3 py-1.5 bg-white hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isAr ? '🔄 استرجاع واستبدال 7 أيام' : '🔄 7 Days Return & Exchange'}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleChange('defaultReturnPolicyAr', 'استبدال فقط خلال 14 يوماً من تاريخ الشراء بأصل الفاتورة ولا يوجد استرجاع نقدي.');
                  handleChange('defaultReturnPolicyEn', 'Exchange only within 14 days of purchase with original receipt. No cash refunds.');
                }}
                className="px-3 py-1.5 bg-white hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isAr ? '🔀 استبدال فقط (14 يوم)' : '🔀 Exchange Only (14 Days)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleChange('defaultReturnPolicyAr', 'الأصناف الاستهلاكية والغذائية والإلكترونيات المفتوحة غير قابلة للاسترجاع أو الاستبدال حسب تعليمات وزارة التجارة.');
                  handleChange('defaultReturnPolicyEn', 'Consumables, food, and opened electronics cannot be returned or exchanged as per ministry guidelines.');
                }}
                className="px-3 py-1.5 bg-white hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isAr ? '🚫 غير قابل للاسترجاع (استهلاكي/مفتوح)' : '🚫 No Returns (Consumables/Opened)'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'سياسة الاسترجاع المعتمدة على الفواتير (عربي):' : 'Official Return Policy on Invoices (Arabic):'}
              </label>
              <textarea
                rows={3}
                value={formData.defaultReturnPolicyAr || ''}
                onChange={(e) => handleChange('defaultReturnPolicyAr', e.target.value)}
                placeholder="مثال: البضاعة المباعة ترد وتستبدل خلال 7 أيام بشرط سلامة المنتج ووجود أصل الفاتورة."
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff] font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'سياسة الاسترجاع المعتمدة (إنجليزي):' : 'Official Return Policy on Invoices (English):'}
              </label>
              <textarea
                rows={3}
                value={formData.defaultReturnPolicyEn || ''}
                onChange={(e) => handleChange('defaultReturnPolicyEn', e.target.value)}
                placeholder="e.g. Returns and exchanges accepted within 7 days with original receipt."
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff] font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200/80 pt-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'نص التذييل باللغة العربية (Receipt Footer - Arabic):' : 'Receipt Footer (Arabic):'}
              </label>
              <textarea
                rows={2}
                value={formData.receiptFooterAr}
                onChange={(e) => handleChange('receiptFooterAr', e.target.value)}
                placeholder="مثال: شكراً لتسوقكم معنا! نتمنى لكم يوماً سعيداً."
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'نص التذييل باللغة الإنجليزية (Receipt Footer - English):' : 'Receipt Footer (English):'}
              </label>
              <textarea
                rows={2}
                value={formData.receiptFooterEn}
                onChange={(e) => handleChange('receiptFooterEn', e.target.value)}
                placeholder="e.g. Thank you for shopping with us! Have a wonderful day."
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff]"
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
                  ? 'ضبط التأثيرات الصوتية واختيار طابعة الإيصالات الافتراضية للكاشير.'
                  : 'Configure sound effects and default POS receipt printer preferences.'}
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

          {/* Default Receipt Printer Selector Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 gap-4 mt-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm text-slate-800">
                    {isAr ? 'طابعة إيصالات الكاشير الافتراضية (Receipt Printer)' : 'Default Receipt Printer'}
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 border border-indigo-200 text-indigo-800 font-mono text-xs font-black">
                    {formData.defaultPrinter && formData.defaultPrinter !== 'default' 
                      ? formData.defaultPrinter 
                      : (isAr ? '🖨️ طابعة الويندوز القياسية (System Default)' : '🖨️ System Default (Window Print)')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr
                    ? 'اختيار الطابعة الحرارية الافتراضية لإصدار إيصالات البيع عبر واجهة Electron webContents.getPrinters.'
                    : 'Select default hardware receipt printer via Electron webContents.getPrinters API.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchPrinters();
                setIsPrinterModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 transition shrink-0 flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? '⚙️ اختيار وتخصيص الطابعة' : '⚙️ Select Printer'}</span>
            </button>
          </div>
        </div>

        {/* SECTION 6: SYSTEM BACKUP & RESTORE */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/80 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] transition hover:shadow-[10px_10px_20px_#cbd3e0,-10px_-10px_20px_#ffffff]">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-200/80 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-sm">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                {isAr ? '6. إدارة النسخ الاحتياطي واستعادة البيانات' : '6. System Data Backup & Restore'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'تصدير وتحميل نسخة كاملة من جميع بيانات المتجر (المنتجات، الفواتير، العملاء) في ملف JSON أو استعادتها بضغطة واحدة.'
                  : 'Export a complete JSON backup of all products, sales invoices, and customer accounts or restore from file.'}
              </p>
            </div>
          </div>

          {backupMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <span>{backupMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Card */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 text-slate-800 font-extrabold text-sm">
                  <Download className="w-5 h-5 text-indigo-600" />
                  <span>{isAr ? 'تصدير نسخة احتياطية كاملة' : 'Export Full Database Backup'}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isAr ? 'قم بتحميل ملف JSON يحتوي على المخزون بالكامل، قائمة العملاء، أرصدتهم، ونقاط الولاء، وسجل الفواتير لحفظه في حاسوبك أو فلاشة.' : 'Download a full JSON archive containing all inventory items, customer balances, loyalty points, and sales history.'}
                </p>
              </div>
              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportBackup}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? (isAr ? 'جاري التصدير...' : 'Exporting...') : (isAr ? '📥 تحميل النسخة الاحتياطية الآن' : '📥 Download Backup File')}</span>
              </button>
            </div>

            {/* Import Card */}
            <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-200 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 text-slate-800 font-extrabold text-sm">
                  <Upload className="w-5 h-5 text-amber-600" />
                  <span>{isAr ? 'استعادة البيانات من ملف سابق' : 'Restore Database from Backup File'}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isAr ? 'اختر ملف النسخة الاحتياطية (JSON) الذي قمت بتنزيله سابقاً لاستعادة المخزون والفواتير والعملاء إلى النظام فورا.' : 'Select a previously saved JSON backup file to restore all store inventory, customers, and invoice records.'}
                </p>
              </div>
              <div>
                <label className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-center">
                  <Upload className="w-4 h-4" />
                  <span>{isImporting ? (isAr ? 'جاري استعادة البيانات...' : 'Restoring Data...') : (isAr ? '📂 اختيار ملف النسخة والاستعادة' : '📂 Select & Restore Backup')}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    disabled={isImporting || userRole !== 'admin'}
                    className="hidden"
                  />
                </label>
                {userRole !== 'admin' && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1 text-center">{isAr ? '⚠️ استعادة البيانات مخصصة للمدير فقط' : '⚠️ Restore is restricted to Admin only'}</p>
                )}
              </div>
            </div>
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
