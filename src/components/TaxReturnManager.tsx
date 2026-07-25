/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Landmark, 
  FileSpreadsheet, 
  Calendar, 
  Printer, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2, 
  RefreshCw, 
  Lock, 
  Info,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { SaleInvoice, Expense, SystemSettings, Language } from '../types';

interface TaxReturnManagerProps {
  sales: SaleInvoice[];
  expenses: Expense[];
  settings: SystemSettings;
  lang: Language;
}

interface TaxRegimeInfo {
  countryAr: string;
  countryEn: string;
  authorityAr: string;
  authorityEn: string;
  authorityCode: string; // e.g. ZATCA, ETA, FTA, NBR, TA
  defaultRate: number;
  formNumber: string;
  filingCycleAr: string;
  filingCycleEn: string;
  portalUrl: string;
  notesAr: string;
  notesEn: string;
  flag: string;
}

export const TaxReturnManager: React.FC<TaxReturnManagerProps> = ({
  sales,
  expenses,
  settings,
  lang
}) => {
  const isAr = lang === 'ar';

  // State for Period Selection
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [periodType, setPeriodType] = useState<'quarter' | 'month' | 'custom'>('quarter');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1');
  const [selectedMonth, setSelectedMonth] = useState<string>('1');
  
  // Custom Date Range
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Manual Adjustment / Input Tax Override State (to let accounting managers tune deductible expenses)
  const [inputTaxOverride, setInputTaxOverride] = useState<string>('');
  const [isOverrideActive, setIsOverrideActive] = useState<boolean>(false);
  const [returnStatus, setReturnStatus] = useState<'draft' | 'reviewed' | 'filed'>('draft');
  const [filingNotes, setFilingNotes] = useState<string>('');
  const [showAICompliance, setShowAICompliance] = useState<boolean>(true);

  // Identify Country Tax Regime based on currency or settings
  const taxRegime: TaxRegimeInfo = useMemo(() => {
    const curr = (settings.currency || 'SAR').toUpperCase().trim();
    if (curr === 'SAR' || curr.includes('ريال سعودي')) {
      return {
        countryAr: 'المملكة العربية السعودية',
        countryEn: 'Kingdom of Saudi Arabia',
        authorityAr: 'هيئة الزكاة والضريبة والجمارك (ZATCA)',
        authorityEn: 'Zakat, Tax and Customs Authority (ZATCA)',
        authorityCode: 'ZATCA',
        defaultRate: 15,
        formNumber: 'نموذج الإقرار الضريبي 301 (VAT Form 301)',
        filingCycleAr: 'ربع سنوي (أو شهري للمنشآت الكبرى فوق 40 مليون ريال)',
        filingCycleEn: 'Quarterly (or Monthly for revenues > 40M SAR)',
        portalUrl: 'https://zatca.gov.sa',
        notesAr: 'متوافق مع متطلبات الفاتورة الإلكترونية (فاتورة - المرحلة الأولى والثانية) ورمز QR المعيار الوطني.',
        notesEn: 'Compliant with ZATCA E-Invoicing (Fatoora Phase 1 & 2) and national QR verification standards.',
        flag: '🇸🇦'
      };
    } else if (curr === 'EGP' || curr.includes('جنيه مصري') || curr === 'LE') {
      return {
        countryAr: 'جمهورية مصر العربية',
        countryEn: 'Arab Republic of Egypt',
        authorityAr: 'مصلحة الضرائب المصرية (ETA)',
        authorityEn: 'Egyptian Tax Authority (ETA)',
        authorityCode: 'ETA',
        defaultRate: 14,
        formNumber: 'إقرار ضريبة القيمة المضافة - نموذج (10)',
        filingCycleAr: 'شهرياً (خلال شهر من انتهاء الفترة الضريبية)',
        filingCycleEn: 'Monthly (within 1 month following period end)',
        portalUrl: 'https://www.eta.gov.eg',
        notesAr: 'يخضع للمنظومة الإلكترونية للضرائب المصرية وإيصال الفاتورة الإلكترونية مع خصم المدخلات المعتمدة.',
        notesEn: 'Subject to ETA electronic tax portal submission and e-receipt standards with verified deductions.',
        flag: '🇪🇬'
      };
    } else if (curr === 'AED' || curr.includes('درهم إماراتي')) {
      return {
        countryAr: 'دولة الإمارات العربية المتحدة',
        countryEn: 'United Arab Emirates',
        authorityAr: 'الهيئة الاتحادية للضرائب (FTA)',
        authorityEn: 'Federal Tax Authority (FTA)',
        authorityCode: 'FTA',
        defaultRate: 5,
        formNumber: 'إقرار ضريبة القيمة المضافة (Form VAT201)',
        filingCycleAr: 'ربع سنوي (في موعد أقصاه اليوم 28 من الشهر التالي للربع)',
        filingCycleEn: 'Quarterly (by 28th of the month following quarter end)',
        portalUrl: 'https://tax.gov.ae',
        notesAr: 'يتم تقديمه عبر منصة "إمارات تاكس" (EmaraTax) مع احتساب ضريبة المخرجات وخصم ضريبة المدخلات التشغيلية.',
        notesEn: 'Submitted via EmaraTax portal. Includes standard rated supplies and eligible input tax deductions.',
        flag: '🇦🇪'
      };
    } else if (curr === 'BHD' || curr.includes('دينار بحريني')) {
      return {
        countryAr: 'مملكة البحرين',
        countryEn: 'Kingdom of Bahrain',
        authorityAr: 'الجهاز الوطني للإيرادات (NBR)',
        authorityEn: 'National Bureau of Revenue (NBR)',
        authorityCode: 'NBR',
        defaultRate: 10,
        formNumber: 'إقرار القيمة المضافة (NBR VAT Return Form)',
        filingCycleAr: 'ربع سنوي أو شهري حسب حجم الإيرادات السنوية',
        filingCycleEn: 'Quarterly or Monthly based on annual turn-over',
        portalUrl: 'https://www.nbr.gov.bh',
        notesAr: 'تُطبق نسبة 10% على التوريدات الخاضعة للنسبة الأساسية مع إعفاءات السلع الأساسية المحددة في النظام.',
        notesEn: 'Applies 10% standard rate with zero-rated food & basic essentials according to NBR regulations.',
        flag: '🇧🇭'
      };
    } else if (curr === 'OMR' || curr.includes('ريال عماني')) {
      return {
        countryAr: 'سلطنة عمان',
        countryEn: 'Sultanate of Oman',
        authorityAr: 'جهاز الضرائب العماني (Oman Tax Authority)',
        authorityEn: 'Oman Tax Authority (TA)',
        authorityCode: 'TA',
        defaultRate: 5,
        formNumber: 'إقرار ضريبة القيمة المضافة العماني (Oman VAT Return)',
        filingCycleAr: 'ربع سنوي (خلال 30 يوماً من انتهاء الربع)',
        filingCycleEn: 'Quarterly (within 30 days following the end of quarter)',
        portalUrl: 'https://www.taxoman.gov.om',
        notesAr: 'يشمل التوريدات الخاضعة لنسبة 5% والتوريدات المعفاة والصفرية وفق اللائحة التنفيذية العمانية.',
        notesEn: 'Covers 5% standard supplies, exempt and zero-rated items as per Oman executive regulations.',
        flag: '🇴🇲'
      };
    } else if (curr === 'KWD' || curr.includes('دينار كويتي')) {
      return {
        countryAr: 'دولة الكويت',
        countryEn: 'State of Kuwait',
        authorityAr: 'وزارة المالية - إدارة الضريبة (MoF Kuwait)',
        authorityEn: 'Ministry of Finance - Tax Department',
        authorityCode: 'MoF-KW',
        defaultRate: 0,
        formNumber: 'إقرار ضريبة الشركات والإيرادات (Kuwait Corporate Tax Form)',
        filingCycleAr: 'سنوي أو حسب نوع المنشأة والترخيص التجاري',
        filingCycleEn: 'Annual or as per commercial license classification',
        portalUrl: 'https://www.mof.gov.kw',
        notesAr: 'لا تطبق ضريبة القيمة المضافة حالياً في دولة الكويت (0%)، ويتم احتساب صافي الدخل والمصروفات للتقييم التجاري.',
        notesEn: 'No VAT is currently applied in Kuwait (0%). Reports net commercial profit and operational overheads.',
        flag: '🇰🇼'
      };
    } else if (curr === 'QAR' || curr.includes('ريال قطري')) {
      return {
        countryAr: 'دولة قطر',
        countryEn: 'State of Qatar',
        authorityAr: 'الهيئة العامة للضرائب (GTA Qatar)',
        authorityEn: 'General Tax Authority (GTA)',
        authorityCode: 'GTA',
        defaultRate: 0,
        formNumber: 'الإقرار الضريبي عبر بوابة ضريبة (Dhareeba Portal)',
        filingCycleAr: 'سنوي للشركات الخاضعة أو معفي للمؤسسات الوطنية',
        filingCycleEn: 'Annual for taxable entities or exempt for national enterprises',
        portalUrl: 'https://www.gta.gov.qa',
        notesAr: 'يتم التقديم عبر نظام "ضريبة" الإلكتروني مع بيان الإيرادات والمصروفات التشغيلية المعتمدة.',
        notesEn: 'Filing done via "Dhareeba" system detailing revenues and accredited operating expenditures.',
        flag: '🇶🇦'
      };
    } else {
      return {
        countryAr: 'النظام الضريبي العام / الدولي',
        countryEn: 'International / Standard Tax Regime',
        authorityAr: `هيئة الضرائب والمبيعات (${curr})`,
        authorityEn: `National Tax & VAT Authority (${curr})`,
        authorityCode: 'TAX-INTL',
        defaultRate: settings.defaultTaxRate || 15,
        formNumber: 'نموذج الإقرار الضريبي الموحد (Standard VAT & Tax Declaration)',
        filingCycleAr: 'ربع سنوي أو شهري حسب اللوائح المحلية للمنشأة',
        filingCycleEn: 'Quarterly or Monthly depending on local tax regulations',
        portalUrl: '#',
        notesAr: 'يتم احتساب الضريبة بناءً على النسبة الافتراضية المحددة في إعدادات المتجر مع مطابقة المخرجات والمدخلات.',
        notesEn: 'Tax computed using default store tax rate setting, matching sales output against deductible expense input.',
        flag: '🌐'
      };
    }
  }, [settings.currency, settings.defaultTaxRate]);

  // Determine Date Bounds for Filtering
  const periodBounds = useMemo(() => {
    const yr = parseInt(selectedYear) || new Date().getFullYear();
    let start: Date;
    let end: Date;
    let periodLabelAr = '';
    let periodLabelEn = '';

    if (periodType === 'quarter') {
      if (selectedQuarter === 'Q1') {
        start = new Date(yr, 0, 1, 0, 0, 0);
        end = new Date(yr, 2, 31, 23, 59, 59);
        periodLabelAr = `الربع الأول (Q1) - ${yr} (من 1 يناير إلى 31 مارس)`;
        periodLabelEn = `First Quarter (Q1) - ${yr} (Jan 1 - Mar 31)`;
      } else if (selectedQuarter === 'Q2') {
        start = new Date(yr, 3, 1, 0, 0, 0);
        end = new Date(yr, 5, 30, 23, 59, 59);
        periodLabelAr = `الربع الثاني (Q2) - ${yr} (من 1 أبريل إلى 30 يونيو)`;
        periodLabelEn = `Second Quarter (Q2) - ${yr} (Apr 1 - Jun 30)`;
      } else if (selectedQuarter === 'Q3') {
        start = new Date(yr, 6, 1, 0, 0, 0);
        end = new Date(yr, 8, 30, 23, 59, 59);
        periodLabelAr = `الربع الثالث (Q3) - ${yr} (من 1 يوليو إلى 30 سبتمبر)`;
        periodLabelEn = `Third Quarter (Q3) - ${yr} (Jul 1 - Sep 30)`;
      } else {
        start = new Date(yr, 9, 1, 0, 0, 0);
        end = new Date(yr, 11, 31, 23, 59, 59);
        periodLabelAr = `الربع الرابع (Q4) - ${yr} (من 1 أكتوبر إلى 31 ديسمبر)`;
        periodLabelEn = `Fourth Quarter (Q4) - ${yr} (Oct 1 - Dec 31)`;
      }
    } else if (periodType === 'month') {
      const mIdx = parseInt(selectedMonth) - 1;
      start = new Date(yr, mIdx, 1, 0, 0, 0);
      end = new Date(yr, mIdx + 1, 0, 23, 59, 59);
      const mNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const mNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      periodLabelAr = `شهر ${mNamesAr[mIdx]} - ${yr}`;
      periodLabelEn = `Month of ${mNamesEn[mIdx]} - ${yr}`;
    } else {
      start = new Date(`${customStartDate}T00:00:00`);
      end = new Date(`${customEndDate}T23:59:59`);
      periodLabelAr = `فترة مخصصة: من ${customStartDate} إلى ${customEndDate}`;
      periodLabelEn = `Custom Period: ${customStartDate} to ${customEndDate}`;
    }

    return { start, end, periodLabelAr, periodLabelEn };
  }, [selectedYear, periodType, selectedQuarter, selectedMonth, customStartDate, customEndDate]);

  // Filter Sales & Expenses within period
  const filteredData = useMemo(() => {
    const validSales = sales.filter(s => {
      if (s.status === 'cancelled' || s.status === 'refunded') return false;
      const sDate = new Date(s.date);
      return sDate >= periodBounds.start && sDate <= periodBounds.end;
    });

    const validExpenses = expenses.filter(e => {
      const eDate = new Date(e.date);
      return eDate >= periodBounds.start && eDate <= periodBounds.end;
    });

    // Calculate Output VAT (from Sales)
    const totalSalesGross = validSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const totalSalesTaxable = validSales.reduce((sum, s) => sum + Math.max(0, (s.subtotal || 0) - (s.discountTotal || 0)), 0);
    const totalOutputTax = validSales.reduce((sum, s) => sum + (s.taxAmount || 0), 0);

    // Calculate Deductible Expenses Input Tax (assuming operational expenses like supplies, utilities, maintenance contain deductible VAT at default rate)
    const totalExpensesGross = validExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Eligible deductible categories (rent and salaries usually exempt from VAT, while supplies and maintenance are standard rated)
    const deductibleExpenses = validExpenses.filter(e => 
      e.category === 'supplies' || e.category === 'maintenance' || e.category === 'utilities' || e.category === 'other' || e.category === 'marketing'
    );
    const deductibleExpensesGross = deductibleExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Calculate standard input VAT from deductible expenses: if amount is tax-inclusive, net = amount / (1 + rate), tax = amount - net
    const effectiveRate = taxRegime.defaultRate > 0 ? (taxRegime.defaultRate / 100) : (settings.defaultTaxRate / 100);
    const calculatedInputTax = effectiveRate > 0 
      ? Math.round((deductibleExpensesGross - (deductibleExpensesGross / (1 + effectiveRate))) * 100) / 100
      : 0;

    const finalInputTax = isOverrideActive && inputTaxOverride !== '' 
      ? Math.max(0, parseFloat(inputTaxOverride) || 0)
      : calculatedInputTax;

    // Net Payable / Refundable
    const netTaxLiability = Math.round((totalOutputTax - finalInputTax) * 100) / 100;
    const isPayable = netTaxLiability >= 0;
    const absNetTax = Math.abs(netTaxLiability);

    return {
      salesCount: validSales.length,
      expensesCount: validExpenses.length,
      totalSalesGross: Math.round(totalSalesGross * 100) / 100,
      totalSalesTaxable: Math.round(totalSalesTaxable * 100) / 100,
      totalOutputTax: Math.round(totalOutputTax * 100) / 100,
      totalExpensesGross: Math.round(totalExpensesGross * 100) / 100,
      deductibleExpensesGross: Math.round(deductibleExpensesGross * 100) / 100,
      finalInputTax: Math.round(finalInputTax * 100) / 100,
      netTaxLiability,
      isPayable,
      absNetTax,
      effectiveRatePercent: Math.round(effectiveRate * 100)
    };
  }, [sales, expenses, periodBounds, taxRegime.defaultRate, settings.defaultTaxRate, isOverrideActive, inputTaxOverride]);

  // AI Compliance Check Warnings & Insights
  const aiAuditInsights = useMemo(() => {
    const tips: { type: 'success' | 'warning' | 'alert'; textAr: string; textEn: string }[] = [];

    // 1. Check Tax Number
    if (!settings.taxNumber || settings.taxNumber.trim() === '' || settings.taxNumber === '300000000000003') {
      tips.push({
        type: 'alert',
        textAr: 'تنبيه التزام: الرقم الضريبي (Tax Number) في إعدادات المتجر افتراضي أو غير مسجل! يرجى إدخال الرقم الضريبي الرسمي الصادر من الهيئة لتجنب رفض الإقرار.',
        textEn: 'Compliance Warning: Store Tax Number is empty or using placeholder! Enter your official registered tax ID in store settings.'
      });
    } else {
      tips.push({
        type: 'success',
        textAr: `الرقم الضريبي للمنشأة مسجل ومعتمد: (${settings.taxNumber}) ومطابق لمتطلبات ${taxRegime.authorityCode}.`,
        textEn: `Store Tax Number is verified: (${settings.taxNumber}) and compliant with ${taxRegime.authorityCode}.`
      });
    }

    // 2. Check Sales Output Ratio
    if (filteredData.salesCount === 0) {
      tips.push({
        type: 'warning',
        textAr: 'ملاحظة: لا توجد مبيعات مسجلة خلال هذه الفترة. سيتم تقديم إقرار ضريبي صفري (Zero Tax Return) إذا لم تكن هناك حركات تشغيلية.',
        textEn: 'Note: No sales recorded in this period. A Zero Tax Return will be generated if no operational movements occurred.'
      });
    } else {
      tips.push({
        type: 'success',
        textAr: `تم احتساب ضريبة المخرجات على (${filteredData.salesCount}) فاتورة مبيعات مؤكدة بإجمالي مبيعات خاضعة للضريبة قدره (${filteredData.totalSalesTaxable} ${settings.currency}).`,
        textEn: `Output VAT computed across (${filteredData.salesCount}) completed sales invoices with total taxable turnover of (${filteredData.totalSalesTaxable} ${settings.currency}).`
      });
    }

    // 3. Check Input Deductions Ratio
    if (filteredData.finalInputTax > filteredData.totalOutputTax && filteredData.totalOutputTax > 0) {
      tips.push({
        type: 'alert',
        textAr: 'تنبيه فحص الذكاء الاصطناعي: ضريبة المشتريات والمصروفات (المدخلات) تتجاوز ضريبة المبيعات (المخرجات)! قد تطلب الهيئة الضريبية مستندات إضافية أو فحص فواتير الموردين عند طلب الاسترداد.',
        textEn: 'AI Audit Alert: Input VAT deductions exceed Output VAT! The Tax Authority may request supplier invoice proof when filing for a tax refund.'
      });
    } else if (filteredData.finalInputTax > 0) {
      tips.push({
        type: 'success',
        textAr: `تم خصم ضريبة المدخلات التشغيلية بنجاح بقيمة (${filteredData.finalInputTax} ${settings.currency}) مما يقلل الالتزام الضريبي المستحق للدفع.`,
        textEn: `Operational Input VAT of (${filteredData.finalInputTax} ${settings.currency}) successfully deducted, reducing net tax liability.`
      });
    }

    // 4. Country Specific E-Invoicing Note
    if (taxRegime.authorityCode === 'ZATCA') {
      tips.push({
        type: 'success',
        textAr: 'توصية ZATCA: تأكد من حفظ أرشيف الفواتير الإلكترونية المزودة برمز الاستجابة السريعة (QR Code) لمدة 5 سنوات على الأقل وفق المادة 66 من نظام ضريبة القيمة المضافة.',
        textEn: 'ZATCA Tip: Ensure all e-invoices with QR codes are archived securely for at least 5 years as per Article 66 of VAT Regulations.'
      });
    } else if (taxRegime.authorityCode === 'ETA') {
      tips.push({
        type: 'success',
        textAr: 'توصية مصلحة الضرائب المصرية: يرجى مطابقة إجمالي الفواتير الإلكترونية المرفوعة على البوابة الإلكترونية قبل اعتماد الإقرار النهائي.',
        textEn: 'ETA Tip: Match total e-receipts uploaded to the Egyptian Tax Portal before final declaration sign-off.'
      });
    }

    return tips;
  }, [settings.taxNumber, settings.currency, taxRegime.authorityCode, filteredData]);

  // Handle Print Formal Declaration
  const handlePrintReturn = () => {
    window.print();
  };

  // Export Summary as CSV
  const handleExportCSV = () => {
    const csvContent = [
      ['Tax Declaration Return Report', taxRegime.authorityEn],
      ['Store Name', settings.storeNameEn || settings.storeNameAr],
      ['Tax Number (TRN)', settings.taxNumber],
      ['Filing Period', periodBounds.periodLabelEn],
      ['Currency', settings.currency],
      [''],
      ['Box Description', 'Amount', 'Tax Rate', 'Tax Amount'],
      ['1. Standard Rated Taxable Sales', filteredData.totalSalesTaxable, `${filteredData.effectiveRatePercent}%`, filteredData.totalOutputTax],
      ['2. Deductible Operating Purchases & Expenses', filteredData.deductibleExpensesGross, `${filteredData.effectiveRatePercent}%`, filteredData.finalInputTax],
      ['3. Net Tax Liability / Refund Due', '', '', filteredData.netTaxLiability],
      [''],
      ['Status', returnStatus.toUpperCase()],
      ['Generated On', new Date().toLocaleString()]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Tax_Return_${taxRegime.authorityCode}_${selectedYear}_${selectedQuarter}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* HEADER WITH AUTHORITY BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-white/20 text-2xl sm:text-3xl flex-shrink-0">
            {taxRegime.flag}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-extrabold flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5 text-amber-400" />
                <span>{taxRegime.authorityCode}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                {isAr ? `نسبة الضريبة الرسمية: ${taxRegime.defaultRate}%` : `Official Tax Rate: ${taxRegime.defaultRate}%`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>{isAr ? 'خاص بالمدير المعتمد' : 'Admin Authorized Only'}</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 text-white">
              {isAr ? taxRegime.authorityAr : taxRegime.authorityEn}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{taxRegime.formNumber}</span>
              <span className="text-slate-500">|</span>
              <span>{isAr ? `العملة: ${settings.currency}` : `Currency: ${settings.currency}`}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center relative z-10">
          <button
            onClick={handlePrintReturn}
            className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition transform active:scale-95 flex items-center gap-2 cursor-pointer border border-indigo-400/30"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? '🖨️ طباعة الإقرار الرسمي' : '🖨️ Print Formal Return'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer border border-white/20"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">{isAr ? 'تصدير جدول (Excel/CSV)' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* FILING PERIOD & REGIME BAR (Neumorphic Glass UI) */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-[4px_4px_12px_#d1d9e6,-4px_-4px_12px_#ffffff] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            {[
              { id: 'quarter', labelAr: 'ربع سنوي (Quarters)', labelEn: 'Quarterly' },
              { id: 'month', labelAr: 'شهري (Monthly)', labelEn: 'Monthly' },
              { id: 'custom', labelAr: 'تاريخ مخصص', labelEn: 'Custom Range' },
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setPeriodType(type.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  periodType === type.id 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                {isAr ? type.labelAr : type.labelEn}
              </button>
            ))}
          </div>

          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[2025, 2026, 2027, 2028, 2029].map(y => (
              <option key={y} value={y}>{isAr ? `سنة ${y}` : `Year ${y}`}</option>
            ))}
          </select>

          {/* Quarter Selector */}
          {periodType === 'quarter' && (
            <div className="flex items-center gap-1">
              {[
                { q: 'Q1', ar: 'الربع الأول (Q1)', en: 'Q1 (Jan-Mar)' },
                { q: 'Q2', ar: 'الربع الثاني (Q2)', en: 'Q2 (Apr-Jun)' },
                { q: 'Q3', ar: 'الربع الثالث (Q3)', en: 'Q3 (Jul-Sep)' },
                { q: 'Q4', ar: 'الربع الرابع (Q4)', en: 'Q4 (Oct-Dec)' },
              ].map(qt => (
                <button
                  key={qt.q}
                  onClick={() => setSelectedQuarter(qt.q)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    selectedQuarter === qt.q 
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isAr ? qt.ar : qt.en}
                </button>
              ))}
            </div>
          )}

          {/* Month Selector */}
          {periodType === 'month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[
                { m: '1', ar: 'يناير (01)', en: 'January' },
                { m: '2', ar: 'فبراير (02)', en: 'February' },
                { m: '3', ar: 'مارس (03)', en: 'March' },
                { m: '4', ar: 'أبريل (04)', en: 'April' },
                { m: '5', ar: 'مايو (05)', en: 'May' },
                { m: '6', ar: 'يونيو (06)', en: 'June' },
                { m: '7', ar: 'يوليو (07)', en: 'July' },
                { m: '8', ar: 'أغسطس (08)', en: 'August' },
                { m: '9', ar: 'سبتمبر (09)', en: 'September' },
                { m: '10', ar: 'أكتوبر (10)', en: 'October' },
                { m: '11', ar: 'نوفمبر (11)', en: 'November' },
                { m: '12', ar: 'ديسمبر (12)', en: 'December' },
              ].map(mo => (
                <option key={mo.m} value={mo.m}>{isAr ? mo.ar : mo.en}</option>
              ))}
            </select>
          )}

          {/* Custom Date Range */}
          {periodType === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs"
              />
              <span className="text-xs text-slate-400 font-bold">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* Selected Period Badge */}
        <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-200/80 px-3.5 py-2 rounded-2xl">
          <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-xs font-extrabold text-indigo-950">
            {isAr ? periodBounds.periodLabelAr : periodBounds.periodLabelEn}
          </span>
        </div>
      </div>

      {/* CORE TAX BREAKDOWN BOXES (3 COLUMNS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* BOX 1: SALES OUTPUT VAT (ضريبة المخرجات المحصلة) */}
        <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-[6px_6px_16px_#d1d9e6,-6px_-6px_16px_#ffffff] flex flex-col justify-between relative overflow-hidden group hover:border-indigo-300 transition">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded-xl bg-indigo-100 text-indigo-800 font-extrabold text-xs">
                {isAr ? 'البند (1): المبيعات (المخرجات)' : 'Box 1: Output VAT (Sales)'}
              </span>
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-600">
              {isAr ? 'إجمالي ضريبة القيمة المضافة المحصلة من العملاء' : 'Total Output VAT Collected from Sales'}
            </h3>
            <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {filteredData.totalOutputTax} <span className="text-sm font-normal text-slate-500">{settings.currency}</span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>{isAr ? 'عدد الفواتير المؤكدة:' : 'Completed Invoices:'}</span>
              <span className="font-bold text-slate-800">{filteredData.salesCount} {isAr ? 'فاتورة' : 'inv'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{isAr ? 'إجمالي المبيعات الخاضعة للضريبة:' : 'Taxable Turnover:'}</span>
              <span className="font-bold text-slate-800">{filteredData.totalSalesTaxable} {settings.currency}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{isAr ? 'نسبة الضريبة المطبقة:' : 'Applied VAT Rate:'}</span>
              <span className="font-extrabold text-indigo-600">{filteredData.effectiveRatePercent}%</span>
            </div>
          </div>
        </div>

        {/* BOX 2: EXPENSES INPUT VAT (ضريبة المدخلات القابلة للخصم) */}
        <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-[6px_6px_16px_#d1d9e6,-6px_-6px_16px_#ffffff] flex flex-col justify-between relative overflow-hidden group hover:border-emerald-300 transition">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                {isAr ? 'البند (2): المشتريات (المدخلات)' : 'Box 2: Input VAT (Expenses)'}
              </span>
              <TrendingDown className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-600">
              {isAr ? 'ضريبة المشتريات والمصروفات التشغيلية القابلة للخصم' : 'Deductible Input VAT on Purchases & Expenses'}
            </h3>
            <div className="text-3xl font-black text-emerald-600 mt-2 tracking-tight">
              {filteredData.finalInputTax} <span className="text-sm font-normal text-slate-500">{settings.currency}</span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>{isAr ? 'المصروفات التشغيلية الخاضعة:' : 'Deductible Expenses:'}</span>
              <span className="font-bold text-slate-800">{filteredData.deductibleExpensesGross} {settings.currency}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="text-slate-600 font-medium flex items-center gap-1 cursor-pointer" onClick={() => setIsOverrideActive(!isOverrideActive)}>
                <input 
                  type="checkbox" 
                  checked={isOverrideActive} 
                  onChange={(e) => setIsOverrideActive(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500" 
                />
                <span className="underline decoration-dotted">{isAr ? 'تعديل أو إدخال يدوي للمدخلات:' : 'Manual Override Input Tax:'}</span>
              </label>
              {isOverrideActive && (
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={inputTaxOverride}
                  onChange={(e) => setInputTaxOverride(e.target.value)}
                  className="w-24 bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-0.5 text-right font-black text-emerald-900 focus:outline-none"
                />
              )}
            </div>
          </div>
        </div>

        {/* BOX 3: NET TAX LIABILITY / REFUND (صافي الضريبة المستحقة للهيئة) */}
        <div className={`backdrop-blur-xl border rounded-3xl p-6 shadow-[6px_6px_16px_#d1d9e6,-6px_-6px_16px_#ffffff] flex flex-col justify-between relative overflow-hidden transition ${
          filteredData.isPayable 
            ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-white/90 border-amber-300' 
            : 'bg-gradient-to-br from-indigo-500/10 via-emerald-500/10 to-white/90 border-emerald-300'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className={`px-2.5 py-1 rounded-xl font-extrabold text-xs ${
                filteredData.isPayable ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
              }`}>
                {isAr ? 'البند (3): الصافي المستحق' : 'Box 3: Net Tax Liability'}
              </span>
              <ShieldCheck className={`w-6 h-6 ${filteredData.isPayable ? 'text-amber-600' : 'text-emerald-600'}`} />
            </div>
            <h3 className="text-sm font-bold text-slate-700">
              {filteredData.isPayable 
                ? (isAr ? 'صافي الضريبة المستحقة للدفع للهيئة الضريبية' : 'Net VAT Payable to Tax Authority')
                : (isAr ? 'رصيد ضريبي دائن (مسترد أو يُرحّل للفترة القادمة)' : 'Net VAT Refund / Credit Carried Forward')}
            </h3>
            <div className={`text-3xl sm:text-4xl font-black mt-2 tracking-tight ${
              filteredData.isPayable ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {filteredData.absNetTax} <span className="text-sm font-normal text-slate-500">{settings.currency}</span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${filteredData.isPayable ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-xs font-bold text-slate-700">
                {filteredData.isPayable 
                  ? (isAr ? 'مطلوب السداد قبل الموعد القانوني' : 'Payment Required by Deadline')
                  : (isAr ? 'رصيد مستحق للاسترداد من الهيئة' : 'Refund Claimable')}
              </span>
            </div>
            <span className="text-[11px] font-mono font-black px-2 py-0.5 bg-white rounded-lg border border-slate-200">
              {filteredData.isPayable ? 'PAYABLE' : 'CREDIT'}
            </span>
          </div>
        </div>

      </div>

      {/* AI COMPLIANCE AUDITOR & ADVISOR CARD */}
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/5 to-purple-500/10 border border-amber-300/60 rounded-3xl p-5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
              <Sparkles className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span>{isAr ? 'الفحص الذكي للإقرار الضريبي (AI Compliance Auditor)' : 'AI Tax Compliance & Audit Check'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? `فحص تلقائي لمتطلبات ${taxRegime.authorityCode} وتدقيق الفواتير المسجلة` : `Automated validation against ${taxRegime.authorityCode} filing regulations`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAICompliance(!showAICompliance)}
            className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
          >
            {showAICompliance ? (isAr ? 'إخفاء الفحص' : 'Hide Audit') : (isAr ? 'عرض تقرير الفحص' : 'Show Audit')}
          </button>
        </div>

        {showAICompliance && (
          <div className="space-y-2.5 mt-3 pt-3 border-t border-amber-200/50">
            {aiAuditInsights.map((tip, idx) => (
              <div 
                key={idx}
                className={`p-3.5 rounded-2xl flex items-start gap-3 border text-xs sm:text-sm font-semibold transition ${
                  tip.type === 'alert' 
                    ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs' 
                    : tip.type === 'warning'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-white/80 border-emerald-300/80 text-slate-800'
                }`}
              >
                {tip.type === 'alert' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
                {tip.type === 'warning' && <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
                {tip.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                <div className="flex-1">
                  {isAr ? tip.textAr : tip.textEn}
                </div>
              </div>
            ))}
            
            {/* Country Authority Link / Portal Guidance */}
            <div className="bg-indigo-900 text-white p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 shadow-sm">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
                <Building2 className="w-5 h-5 text-indigo-300 shrink-0" />
                <span>
                  {isAr 
                    ? `دورة التقديم القانونية في (${taxRegime.countryAr}): ${taxRegime.filingCycleAr}`
                    : `Legal Filing Cycle in (${taxRegime.countryEn}): ${taxRegime.filingCycleEn}`}
                </span>
              </div>
              {taxRegime.portalUrl !== '#' && (
                <a
                  href={taxRegime.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xs transition flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                >
                  <span>{isAr ? 'البوابة الرسمية للهيئة' : 'Official Portal'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FORMAL TAX DECLARATION FORM (Printable View) */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-lg print:shadow-none print:border-none print:p-0">
        
        {/* Form Title & Official Header */}
        <div className="border-b-2 border-slate-800 pb-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-black tracking-widest text-indigo-900 uppercase">
              {taxRegime.authorityEn} — {taxRegime.authorityCode}
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 mt-1">
              {isAr ? 'إقرار ضريبة القيمة المضافة والإيرادات' : 'VAT & Revenue Tax Return Declaration'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-bold mt-1">
              {taxRegime.formNumber} • {isAr ? `الفترة: ${periodBounds.periodLabelAr}` : `Period: ${periodBounds.periodLabelEn}`}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-mono space-y-1 md:text-right shrink-0">
            <div className="font-bold text-slate-800">{settings.storeNameAr || settings.storeNameEn || 'المتجر المعتمد'}</div>
            <div className="text-slate-600">{isAr ? 'الرقم الضريبي (TRN):' : 'Tax Number (TRN):'} <span className="font-bold text-indigo-950">{settings.taxNumber || 'غير مسجل (Not Registered)'}</span></div>
            <div className="text-slate-500">{isAr ? 'تاريخ الاستخراج:' : 'Date Issued:'} {new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</div>
          </div>
        </div>

        {/* Detailed Table Breakdown */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 bg-slate-100 text-slate-900 text-xs sm:text-sm font-black">
                <th className="py-3 px-4">{isAr ? 'رقم البند' : 'No.'}</th>
                <th className="py-3 px-4">{isAr ? 'البيان والتوريدات الضريبية' : 'Taxable Supplies & Description'}</th>
                <th className="py-3 px-4 text-right">{isAr ? `المبلغ (قبل الضريبة)` : `Amount (${settings.currency})`}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'النسبة' : 'Rate'}</th>
                <th className="py-3 px-4 text-right">{isAr ? `الضريبة المستحقة` : `Tax Amount (${settings.currency})`}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs sm:text-sm font-medium text-slate-800">
              
              {/* Row 1: Standard Rated Sales */}
              <tr className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-mono font-bold text-slate-500">1</td>
                <td className="py-3 px-4 font-bold">
                  {isAr ? 'المبيعات والتوريدات الخاضعة للنسبة الأساسية (Standard Rated Sales)' : 'Standard Rated Supplies & Sales'}
                  <div className="text-[11px] text-slate-500 font-normal">{isAr ? `تشمل (${filteredData.salesCount}) فاتورة مبيع مؤكدة خلال الفترة` : `Includes (${filteredData.salesCount}) completed invoices`}</div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold">{filteredData.totalSalesTaxable}</td>
                <td className="py-3 px-4 text-center font-bold text-indigo-600">{filteredData.effectiveRatePercent}%</td>
                <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">{filteredData.totalOutputTax}</td>
              </tr>

              {/* Row 2: Zero Rated Sales */}
              <tr className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-mono font-bold text-slate-500">2</td>
                <td className="py-3 px-4">
                  {isAr ? 'المبيعات المعفاة أو الخاضعة لنسبة الصفر (Zero-Rated / Exempt Supplies)' : 'Zero-Rated / Exempt Supplies'}
                </td>
                <td className="py-3 px-4 text-right font-mono">0.00</td>
                <td className="py-3 px-4 text-center font-bold text-slate-400">0%</td>
                <td className="py-3 px-4 text-right font-mono text-slate-400">0.00</td>
              </tr>

              {/* Row 3: Total Output Tax */}
              <tr className="bg-indigo-50/50 font-bold border-t-2 border-slate-300">
                <td className="py-3 px-4 font-mono text-indigo-900">3</td>
                <td className="py-3 px-4 text-indigo-950 font-extrabold">
                  {isAr ? 'إجمالي ضريبة المخرجات المستحقة (Total Output Tax Due)' : 'Total Output Tax Due'}
                </td>
                <td className="py-3 px-4 text-right font-mono">—</td>
                <td className="py-3 px-4 text-center font-bold">—</td>
                <td className="py-3 px-4 text-right font-mono font-black text-indigo-900 text-base">{filteredData.totalOutputTax}</td>
              </tr>

              {/* Row 4: Deductible Input Tax */}
              <tr className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-mono font-bold text-slate-500">4</td>
                <td className="py-3 px-4 font-bold">
                  {isAr ? 'المشتريات والمصروفات القابلة للخصم (Deductible Operating Inputs)' : 'Deductible Purchases & Operational Expenses'}
                  <div className="text-[11px] text-slate-500 font-normal">{isAr ? `تشمل مصروفات الصيانة والتوريدات والخدمات المؤهلة` : `Eligible operating expenses & supply purchases`}</div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold">{filteredData.deductibleExpensesGross}</td>
                <td className="py-3 px-4 text-center font-bold text-emerald-600">{filteredData.effectiveRatePercent}%</td>
                <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700">({filteredData.finalInputTax})</td>
              </tr>

              {/* Row 5: Net Tax Due / Refundable */}
              <tr className={`border-t-2 border-slate-900 font-black text-sm sm:text-base ${
                filteredData.isPayable ? 'bg-amber-100/70 text-amber-950' : 'bg-emerald-100/70 text-emerald-950'
              }`}>
                <td className="py-4 px-4 font-mono">5</td>
                <td className="py-4 px-4">
                  {filteredData.isPayable
                    ? (isAr ? '★ صافي الضريبة المستحقة للدفع للهيئة (Net Tax Payable)' : '★ Net Tax Liability Payable')
                    : (isAr ? '★ رصيد ضريبي دائن / مسترد من الهيئة (Net Refundable Credit)' : '★ Net Refundable Credit Carried Forward')}
                </td>
                <td className="py-4 px-4 text-right font-mono">—</td>
                <td className="py-4 px-4 text-center font-bold">{filteredData.isPayable ? 'DUE' : 'REFUND'}</td>
                <td className="py-4 px-4 text-right font-mono text-lg sm:text-xl font-black">
                  {filteredData.absNetTax} <span className="text-xs font-normal">{settings.currency}</span>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Declaration Signature & Verification Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-300 text-xs sm:text-sm text-slate-700">
          <div>
            <h4 className="font-extrabold text-slate-900 mb-2">{isAr ? 'إقرار وتعهد المكلف / المدير المعتمد:' : 'Authorized Representative Declaration:'}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isAr 
                ? `أقر أنا الموقع أدناه، بصفتي المسؤول المعتمد عن (${settings.storeNameAr || 'المتجر'}), بأن جميع البيانات والمبالغ الواردة في هذا الإقرار صحيحة ومطابقة للسجلات المحاسبية وفواتير المبيعات الصادرة وفقاً لأنظمة ${taxRegime.authorityAr}.`
                : `I declare that the information provided in this tax return is true, complete and accurate according to our accounting records and in compliance with ${taxRegime.authorityEn} regulations.`}
            </p>
            
            <div className="mt-6 flex items-center gap-6">
              <div>
                <div className="text-[11px] text-slate-400 font-bold">{isAr ? 'اسم المدير / المحاسب:' : 'Manager Name:'}</div>
                <div className="font-extrabold text-slate-800 mt-1 border-b border-slate-400 pb-1 w-48">
                  {isAr ? 'المدير العام المعتمد' : 'Authorized General Manager'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-bold">{isAr ? 'التوقيع والختم:' : 'Signature & Stamp:'}</div>
                <div className="font-mono text-slate-400 mt-1 border-b border-slate-400 pb-1 w-40 italic">
                  [ Verified Electronic ]
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800">{isAr ? 'حالة الإقرار الحالي:' : 'Current Return Status:'}</span>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                  returnStatus === 'filed' ? 'bg-emerald-500 text-white' :
                  returnStatus === 'reviewed' ? 'bg-indigo-600 text-white' : 'bg-amber-400 text-slate-900'
                }`}>
                  {returnStatus === 'filed' ? (isAr ? '✔ تم التقديم رسمياً' : '✔ Officially Filed') :
                   returnStatus === 'reviewed' ? (isAr ? '👁 تم التدقيق والمراجعة' : '👁 Reviewed') :
                   (isAr ? '📝 مسودة أولية' : '📝 Draft Return')}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                {(['draft', 'reviewed', 'filed'] as const).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setReturnStatus(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      returnStatus === status 
                        ? 'bg-slate-800 text-white border-slate-900 shadow-2xs' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {status === 'draft' ? (isAr ? 'مسودة' : 'Draft') :
                     status === 'reviewed' ? (isAr ? 'تم التدقيق' : 'Reviewed') :
                     (isAr ? 'تم التقديم' : 'Filed')}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span>{isAr ? `نظام الفوترة والمحاسبة الذكي • إصدار 2026` : `Smart POS & Accounting Engine v2026`}</span>
              <span className="font-mono text-slate-400">ID: TX-{selectedYear}-{selectedQuarter}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
