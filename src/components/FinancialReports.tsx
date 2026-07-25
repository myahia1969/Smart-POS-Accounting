/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp, DollarSign, Calendar, Filter, Download, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { FinancialSummary, SystemSettings, Language } from '../types';

interface FinancialReportsProps {
  summary: FinancialSummary | null;
  settings: SystemSettings;
  lang: Language;
  onPeriodChange: (period: 'today' | 'month' | 'all') => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6'];

export const FinancialReports: React.FC<FinancialReportsProps> = ({
  summary,
  settings,
  lang,
  onPeriodChange
}) => {
  const isAr = lang === 'ar';

  const salesData = summary?.dailySalesChart || [];
  const categoryData = summary?.categorySalesChart || [];

  const chartsGridRef = useRef<HTMLDivElement>(null);
  const revenueChartRef = useRef<HTMLDivElement>(null);
  const categoryChartRef = useRef<HTMLDivElement>(null);

  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const downloadChartAsImage = async (ref: React.RefObject<HTMLDivElement | null>, filename: string, id: string) => {
    if (!ref.current || isDownloading) return;
    try {
      setIsDownloading(id);
      setDownloadSuccess(null);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const element = ref.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#f8fafc',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const noExportElements = clonedDoc.querySelectorAll('.no-export');
          noExportElements.forEach((el) => {
            if (el instanceof HTMLElement) {
              el.style.display = 'none';
            }
          });
        }
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `${filename}_${timestamp}.png`;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloadSuccess(id);
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to download chart image:', err);
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Controls */}
      <div className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <span>{isAr ? 'التقارير المالية والرسوم البيانية التفاعلية' : 'Interactive Financial Reports & Analytics'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isAr ? 'تحليل الأداء اليومي والشهري، أرباح التصنيفات، وهيكلة المبيعات' : 'Analyze daily and monthly trends, category profitability, and sales performance'}
          </p>
        </div>

        {/* Period Selector Pills & Export Control */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/60 p-1.5 rounded-2xl border border-white/80 shadow-inner">
            {[
              { id: 'today', labelAr: 'اليوم (Today)', labelEn: 'Today' },
              { id: 'month', labelAr: 'هذا الشهر (Month)', labelEn: 'This Month' },
              { id: 'all', labelAr: 'كل الفترة (All Time)', labelEn: 'All Time' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => onPeriodChange(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  summary?.period === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {isAr ? tab.labelAr : tab.labelEn}
              </button>
            ))}
          </div>

          {/* Download All Charts Button */}
          <button
            onClick={() => downloadChartAsImage(chartsGridRef, 'Financial_Charts_Overview', 'all')}
            disabled={!!isDownloading}
            className="no-export px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            title={isAr ? 'حفظ جميع الرسوم البيانية كصورة PNG' : 'Save all charts as PNG image'}
          >
            {isDownloading === 'all' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : downloadSuccess === 'all' ? (
              <Check className="w-4 h-4 text-emerald-300" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {isDownloading === 'all'
                ? (isAr ? 'جاري التصدير...' : 'Exporting...')
                : downloadSuccess === 'all'
                ? (isAr ? 'تم الحفظ PNG!' : 'Saved PNG!')
                : (isAr ? 'تصدير الرسوم كصورة' : 'Download Charts (PNG)')}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/40 backdrop-blur-md p-5 rounded-3xl border border-white/60 shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">{isAr ? 'متوسط قيمة الطلب (AOV)' : 'Avg Order Value'}</span>
            <span className="text-xl font-black text-slate-800">{summary?.averageOrderValue || 0} <span className="text-xs font-normal text-indigo-600">{settings.currency}</span></span>
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-md p-5 rounded-3xl border border-white/60 shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm"><DollarSign className="w-6 h-6" /></div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">{isAr ? 'مجمل هامش الربح المحقق' : 'Gross Margin Ratio'}</span>
            <span className="text-xl font-black text-emerald-600">
              {summary?.totalRevenue ? Math.round(((summary.grossProfit) / summary.totalRevenue) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-md p-5 rounded-3xl border border-white/60 shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-100 text-purple-700 border border-purple-200 shadow-sm"><Calendar className="w-6 h-6" /></div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">{isAr ? 'إجمالي حركات البيع' : 'Total Sales Transactions'}</span>
            <span className="text-xl font-black text-purple-700">{summary?.salesCount || 0} <span className="text-xs font-normal text-slate-500">{isAr ? 'فاتورة' : 'invoices'}</span></span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div ref={chartsGridRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Revenue, Profit, and Expenses Chart */}
        <div ref={revenueChartRef} className="lg:col-span-8 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <span>{isAr ? 'الإيرادات vs الأرباح vs المصروفات (آخر الأيام)' : 'Revenue vs Profit vs Expenses Trends'}</span>
            </h3>
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-500 font-semibold">{isAr ? `العملة: ${settings.currency}` : `Currency: ${settings.currency}`}</span>
              <button
                onClick={() => downloadChartAsImage(revenueChartRef, 'Revenue_Profit_Trends_Chart', 'revenue')}
                disabled={!!isDownloading}
                className="no-export px-2.5 py-1.5 rounded-xl bg-white/80 hover:bg-white text-slate-700 hover:text-indigo-600 transition shadow-xs border border-slate-200/80 cursor-pointer flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
                title={isAr ? 'حفظ الرسم البياني كصورة PNG' : 'Download chart as PNG image'}
              >
                {isDownloading === 'revenue' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : downloadSuccess === 'revenue' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>{isAr ? 'صورة PNG' : 'PNG'}</span>
              </button>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d9e6', borderRadius: '16px', color: '#1e293b', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                  formatter={(value: any) => [`${value} ${settings.currency}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="revenue" name={isAr ? 'الإيرادات (Revenue)' : 'Revenue'} fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" name={isAr ? 'مجمل الربح (Profit)' : 'Gross Profit'} fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name={isAr ? 'المصروفات (Expenses)' : 'Expenses'} fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Sales Breakdown Pie Chart */}
        <div ref={categoryChartRef} className="lg:col-span-4 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-indigo-600" />
              <span>{isAr ? 'توزيع المبيعات حسب التصنيفات' : 'Sales by Category'}</span>
            </h3>
            <button
              onClick={() => downloadChartAsImage(categoryChartRef, 'Category_Sales_Breakdown_Chart', 'category')}
              disabled={!!isDownloading}
              className="no-export px-2.5 py-1.5 rounded-xl bg-white/80 hover:bg-white text-slate-700 hover:text-indigo-600 transition shadow-xs border border-slate-200/80 cursor-pointer flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
              title={isAr ? 'حفظ الرسم البياني كصورة PNG' : 'Download chart as PNG image'}
            >
              {isDownloading === 'category' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : downloadSuccess === 'category' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>{isAr ? 'صورة PNG' : 'PNG'}</span>
            </button>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {categoryData.length === 0 ? (
              <div className="text-center text-slate-400 text-xs font-medium my-auto">{isAr ? 'لا توجد مبيعات لتشكيل الرسم البياني' : 'No category sales data'}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={5}
                    label={({ name, percent }) => `${(name || '').slice(0, 10)} (${Math.round((percent || 0) * 100)}%)`}
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d9e6', borderRadius: '16px', color: '#1e293b', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: any) => [`${value} ${settings.currency}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200/60 flex flex-col gap-2 max-h-36 overflow-y-auto pr-1 no-scrollbar text-xs">
            {categoryData.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shadow-xs" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-slate-700 font-semibold">{cat.category}</span>
                </div>
                <span className="font-bold text-slate-800">{cat.value} {settings.currency} <span className="text-slate-500 font-medium">({cat.count} {isAr ? 'قطعة' : 'items'})</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
