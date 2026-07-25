/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, CheckCircle, Lightbulb, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';
import { AIInsight, FinancialSummary, SystemSettings, Language } from '../types';

interface AIFinancialAdvisorProps {
  insights: AIInsight[];
  summary: FinancialSummary | null;
  settings: SystemSettings;
  lang: Language;
  onRefreshInsights: () => Promise<void>;
}

export const AIFinancialAdvisor: React.FC<AIFinancialAdvisorProps> = ({
  insights,
  summary,
  settings,
  lang,
  onRefreshInsights
}) => {
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      await onRefreshInsights();
    } finally {
      setLoading(false);
    }
  };

  const typeIcons: Record<string, any> = {
    stock_alert: { icon: AlertTriangle, color: 'text-rose-700 bg-rose-100 border-rose-200 shadow-xs', labelAr: 'تنبيه مخزون حرج', labelEn: 'Stock Alert' },
    profit_opportunity: { icon: TrendingUp, color: 'text-emerald-700 bg-emerald-100 border-emerald-200 shadow-xs', labelAr: 'فرصة زيادة أرباح', labelEn: 'Profit Boost' },
    cost_reduction: { icon: CheckCircle, color: 'text-blue-700 bg-blue-100 border-blue-200 shadow-xs', labelAr: 'خفّض التكاليف', labelEn: 'Cost Cut' },
    general: { icon: Lightbulb, color: 'text-purple-700 bg-purple-100 border-purple-200 shadow-xs', labelAr: 'توصية عامة', labelEn: 'General Tip' }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* AI Hero Header */}
      <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-indigo-200 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs text-xs font-bold mb-3">
            <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" style={{ animationDuration: '4s' }} />
            <span>{isAr ? 'المستشار المالي الذكي عبر Gemini API' : 'Powered by Google Gemini AI'}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-tight">
            {isAr ? 'تحليل ذكي فوري للمبيعات، الأرباح، ونواقص المخزون' : 'Real-Time Financial & Inventory AI Diagnosis'}
          </h2>
          <p className="text-xs md:text-sm text-slate-600 mt-2 leading-relaxed">
            {isAr 
              ? 'يقوم النموذج بتحليل أنماط الشراء، دوران المخزون، ونسب الربحية ليقدم لك توصيات تنفيذية مباشرة تزيد من إيرادات متجرك وتحميك من نفاذ المخزون.'
              : 'Our AI model analyzes buying patterns, stock velocity, and margin ratios to provide direct actionable recommendations that boost revenue.'}
          </p>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className={`w-full md:w-auto px-8 py-4 rounded-2xl font-extrabold text-sm shadow-md flex items-center justify-center gap-3 transition transform active:scale-95 ${
              loading
                ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-wait'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-200 border border-indigo-500'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? (isAr ? 'جاري التحليل المعمق...' : 'Analyzing Store Data...') : (isAr ? 'توليد تحليل مالي جديد الآن' : 'Generate New AI Analysis')}</span>
          </button>
          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            {isAr ? 'يدعم العمل الكامل بدون إنترنت عبر خوارزميات الذكاء المحلي' : 'Supports offline fallback heuristic engine'}
          </span>
        </div>
      </div>

      {/* Insights Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 bg-white/40 rounded-3xl border border-white/60 shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff]">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-indigo-500 opacity-70" />
            <p className="text-base font-bold text-slate-800">{isAr ? 'لا توجد توصيات مولدة بعد' : 'No insights generated yet'}</p>
            <p className="text-xs text-slate-500 mt-1">{isAr ? 'انقر على زر "توليد تحليل مالي جديد الآن" لبدء التشخيص' : 'Click "Generate New AI Analysis" above to start'}</p>
          </div>
        ) : (
          insights.map(ins => {
            const typeConfig = typeIcons[ins.type] || typeIcons['general'];
            const Icon = typeConfig.icon;
            const isHigh = ins.priority === 'high';

            return (
              <div
                key={ins.id}
                className={`bg-white/40 backdrop-blur-md rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] ${
                  isHigh ? 'border-rose-300 hover:border-rose-400 shadow-rose-100' : 'border-white/60 hover:border-indigo-300'
                }`}
              >
                <div>
                  {/* Top Badge & Priority */}
                  <div className="flex justify-between items-center mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${typeConfig.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{isAr ? typeConfig.labelAr : typeConfig.labelEn}</span>
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase shadow-2xs ${
                      ins.priority === 'high' ? 'bg-rose-500 text-white' :
                      ins.priority === 'medium' ? 'bg-amber-500 text-white' :
                      'bg-emerald-500 text-white'
                    }`}>
                      {ins.priority === 'high' ? (isAr ? 'أولوية قصوى' : 'High Priority') :
                       ins.priority === 'medium' ? (isAr ? 'أولوية متوسطة' : 'Medium Priority') :
                       (isAr ? 'عادي' : 'Normal')}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-slate-800 mb-2 leading-snug">
                    {isAr ? ins.titleAr : ins.titleEn}
                  </h3>

                  {/* Summary */}
                  <p className="text-xs text-slate-600 leading-relaxed bg-white/60 p-3 rounded-2xl border border-slate-200/60 mb-4 font-medium">
                    {isAr ? ins.summaryAr : ins.summaryEn}
                  </p>
                </div>

                {/* Actionable Step Footer */}
                <div className="pt-4 border-t border-slate-200/60 flex items-start gap-3 bg-indigo-50/60 -mx-6 -mb-6 p-4 rounded-b-3xl">
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs mt-0.5">
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider block">{isAr ? 'الخطوة التنفيذية الموصى بها:' : 'Recommended Action Step:'}</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      {isAr ? ins.actionableStepAr : ins.actionableStepEn}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
