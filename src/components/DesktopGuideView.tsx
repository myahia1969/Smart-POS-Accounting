/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Terminal, Shield, Cpu, HardDrive, FileCode, CheckCircle, Copy, Check, ExternalLink, AlertTriangle, Layers, BookOpen, Key } from 'lucide-react';
import { SystemDiagnostics, Language } from '../types';

interface DesktopGuideViewProps {
  diagnostics: SystemDiagnostics | null;
  lang: Language;
}

export const DesktopGuideView: React.FC<DesktopGuideViewProps> = ({
  diagnostics,
  lang
}) => {
  const isAr = lang === 'ar';
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const commands = [
    {
      titleAr: '1. تثبيت الحزم والاعتماديات (Install Dependencies)',
      titleEn: '1. Install Dependencies & Build Tools',
      cmd: 'npm install',
      descAr: 'يقوم بتنزيل React, Tailwind, Express, esbuild, Electron, و electron-builder وإعداد كافة ملفات الربط.',
      descEn: 'Downloads React, Tailwind, Express, esbuild, Electron, and electron-builder.'
    },
    {
      titleAr: '2. التشغيل والتطوير المحلي (Run Dev Mode)',
      titleEn: '2. Run Local Development Mode',
      cmd: 'npm run dev',
      descAr: 'يشغل خادم Express مع Vite Dev Middleware على الرابط المحلي http://localhost:3000 مع المراقبة التلقائية.',
      descEn: 'Runs Express server with Vite Dev Middleware on http://localhost:3000.'
    },
    {
      titleAr: '3. تشغيل نافذة Electron لسطح المكتب في وضع التطوير',
      titleEn: '3. Launch Electron Desktop App in Dev Mode',
      cmd: 'npm run electron:dev',
      descAr: 'يشغل الخادم وأداة Electron معاً في نافذة سطح المكتب باستخدام أداة concurrently.',
      descEn: 'Runs both dev server and Electron desktop window concurrently.'
    },
    {
      titleAr: '4. حزم وتجميع ملف ويندوز التنفيذي المستقل (Build Windows Portable EXE x64)',
      titleEn: '4. Build Windows Portable x64 EXE',
      cmd: 'npm run dist-x64',
      descAr: 'يقوم بعمل vite build للواجهة، وحزم server.ts عبر esbuild لإنتاج dist/server.cjs، ثم تشغيل electron-builder لاستخراج ملف EXE مستقل داخل مجلد release/.',
      descEn: 'Builds React frontend, bundles server.ts via esbuild to dist/server.cjs, and runs electron-builder to output portable EXE in release/ folder.'
    }
  ];

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Hero Banner */}
      <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-indigo-200 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff]">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{isAr ? 'الدليل الهندسي الشامل' : 'Comprehensive Engineering Guide'}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">{isAr ? 'دليل بناء وإدارة التطبيق التنفيذي (Windows Portable EXE x64)' : 'Windows Portable EXE x64 Build & Management Guide'}</h2>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl font-medium">
          {isAr
            ? 'تم بناء هذا النظام بهندسة فريدة تدمج بين مرونة React و Tailwind (Soft Glass UI) مع قوة خادم Express المدمج وحاضنة Electron، مع حل كافة التحديات البرمجية المعقدة لضمان استقرار العمل بدون إنترنت.'
            : 'This system features a robust architecture uniting React Soft Glass UI with a self-contained Express server and Electron desktop wrapper, solving complex filesystem and process lifecycle challenges.'}
        </p>
      </div>

      {/* SYSTEM DIAGNOSTICS PANELS */}
      <div className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col gap-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200/60 pb-3">
          <Cpu className="w-5 h-5 text-emerald-600" />
          <span>{isAr ? 'حالة التشخيص الفنية المباشرة للنظام والمسارات' : 'Live System Diagnostics & Path Verification'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/60 shadow-xs">
            <span className="text-slate-500 font-semibold block mb-1">{isAr ? 'بيئة التشغيل (Runtime):' : 'Runtime Environment:'}</span>
            <span className="font-mono text-emerald-600 font-bold text-sm">
              {diagnostics?.electronVersion && diagnostics.electronVersion !== 'Not in Electron runtime' ? `Electron v${diagnostics.electronVersion}` : 'Web / Node.js Dev Mode'}
            </span>
            <span className="block text-[11px] text-slate-500 mt-1 font-medium">Node v{diagnostics?.nodeVersion} | Arch: {diagnostics?.arch}</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/60 shadow-xs">
            <span className="text-slate-500 font-semibold block mb-1">{isAr ? 'نوع الحزمة (Portable Mode):' : 'Package Mode:'}</span>
            <span className={`font-bold text-sm flex items-center gap-1 ${diagnostics?.isPortable ? 'text-amber-600' : 'text-indigo-600'}`}>
              <Shield className="w-4 h-4" />
              <span>{diagnostics?.isPortable ? (isAr ? 'محمول (Portable Windows EXE)' : 'Portable EXE') : (isAr ? 'مثبت (Standard Install/Dev)' : 'Standard Dev/Installed')}</span>
            </span>
            <span className="block text-[11px] text-slate-500 mt-1 font-medium">{isAr ? 'لا يعتمد على اتصال الإنترنت' : '100% Offline Capable'}</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/60 shadow-xs md:col-span-2">
            <span className="text-slate-500 font-semibold block mb-1">{isAr ? 'مسار حفظ قاعدة البيانات (Offline DB Path):' : 'Offline Database Storage Path:'}</span>
            <span className="font-mono text-indigo-300 font-bold text-xs break-all block bg-slate-800 p-2 rounded-xl border border-slate-700 shadow-inner">
              {diagnostics?.dbPath || 'Loading...'}
            </span>
            <span className="block text-[11px] text-slate-500 mt-1.5 font-medium">{isAr ? `ملف السجلات (Log Path): ${diagnostics?.logPath}` : `Log File: ${diagnostics?.logPath}`}</span>
          </div>
        </div>
      </div>

      {/* SOLUTIONS TO THE 3 ENGINEERING CHALLENGES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Challenge 1: Data Paths */}
        <div className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base mb-4 border border-emerald-200 shadow-sm">
              <HardDrive className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-base text-slate-800 mb-2">{isAr ? 'أولاً: تأمين مسارات البيانات والحفظ الذري' : '1. Secure Data Paths & Atomic Writes'}</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isAr
                ? 'تم حل مشكلة حذف البيانات في ملفات EXE المحمولة (Portable) عن طريق فحص متغير process.env.PORTABLE_EXECUTABLE_DIR في electron.js وتوجيه الحفظ بجانب ملف الـ EXE مباشرة أو داخل مجلد userData المستقر. بالإضافة لذلك، يقوم الخادم باستخدام تقنية الكتابة الذرية (Atomic Rename من db.json.tmp إلى db.json) لضمان عدم تلف البيانات أبداً عند انقطاع الكهرباء.'
                : 'Resolved Portable EXE data deletion by checking process.env.PORTABLE_EXECUTABLE_DIR in electron.js to store db.json beside the executable or in permanent userData. Implemented atomic file rename to prevent corruption.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] font-mono font-bold text-emerald-700">
            ✓ fs.renameSync(tmpPath, DB_FILE_PATH)
          </div>
        </div>

        {/* Challenge 2: Process Management */}
        <div className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base mb-4 border border-purple-200 shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-base text-slate-800 mb-2">{isAr ? 'ثانياً: إدارة العمليات ومنع تسرب الذاكرة' : '2. Process Management & Memory Leaks'}</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isAr
                ? 'تم ربط دورة حياة Electron بأحداث (window-all-closed, before-quit, will-quit). عند إغلاق النافذة، يرسل Electron أمر إغلاق لطيف لخادم Express، ثم يقوم بإرسال إشارة SIGTERM، وفي حال تعليق العملية يتم فرض إنهاء صارم SIGKILL بعد 2.5 ثانية لتحرير المنفذ 3000 نهائياً.'
                : 'Electron main process strictly binds lifecycle hooks (before-quit, will-quit) to gracefully close Express via IPC & SIGTERM, enforcing a 2.5s SIGKILL fallback to free port 3000 and avoid zombie processes.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] font-mono font-bold text-indigo-700">
            ✓ serverProcess.kill('SIGTERM' / 'SIGKILL')
          </div>
        </div>

        {/* Challenge 3: Error Handling & Logging */}
        <div className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-base mb-4 border border-amber-200 shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-base text-slate-800 mb-2">{isAr ? 'ثالثاً: معالجة الأخطاء والدعم الفني ومراقبة السجلات' : '3. Error Handling & External Logging'}</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isAr
                ? 'تم تصميم نظام تسجيل مخصص في electron.js و server.ts يلتقط كافة أخطاء stdout و stderr والاستثناءات غير المعالجة (uncaughtException) ويكتبها مع ختم زمني دقيق في ملف خارجي دائم (app.log) بجانب قاعدة البيانات لتمكين الدعم الفني من مراجعة أي مشكلات عند العميل.'
                : 'Built custom unified logger across Electron and Express capturing stdout, stderr, and uncaught exceptions into a timestamped app.log file inside the permanent user directory for field diagnostics.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] font-mono font-bold text-amber-700">
            ✓ fs.appendFileSync(APP_LOG_PATH, logLine)
          </div>
        </div>
      </div>

      {/* STEP-BY-STEP TERMINAL COMMANDS GUIDE */}
      <div className="bg-white/40 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/60 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] flex flex-col gap-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200/60 pb-3">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <span>{isAr ? 'الخطوات التشغيلية وأوامر Terminal لاستخراج ملف الـ EXE النهائي' : 'Step-by-Step Terminal Commands to Build Portable EXE'}</span>
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {commands.map((item, idx) => (
            <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-white/60 border border-slate-200/60 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                <h4 className="font-bold text-sm text-slate-800">{isAr ? item.titleAr : item.titleEn}</h4>
                <p className="text-xs text-slate-600 mt-1 font-medium">{isAr ? item.descAr : item.descEn}</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <code className="bg-slate-800 px-4 py-2 rounded-xl font-mono text-xs text-indigo-300 border border-slate-700 select-all flex-1 sm:flex-none font-semibold shadow-inner">
                  {item.cmd}
                </code>
                <button
                  onClick={() => handleCopy(item.cmd, idx)}
                  className="p-2 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border border-indigo-200 transition flex items-center justify-center shadow-2xs"
                  title="Copy command"
                >
                  {copiedIndex === idx ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DIGITAL SIGNING & SECURITY CONFIGURATION GUIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Digital Signing */}
        <div className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-base text-slate-800">{isAr ? 'التوقيع الرقمي للملف التنفيذي (Code Signing)' : 'Digital Code Signing Configuration'}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-medium">
              {isAr
                ? 'لتجنب تحذير Windows Defender SmartScreen عند تشغيل تطبيقك على أجهزة العملاء، يجب توقيع ملف الـ EXE بشهادة رقمية صالحة (Code Signing Certificate أو EV Certificate من مرجع معتمد مثل DigiCert أو Sectigo).'
                : 'To prevent Windows Defender SmartScreen warnings, sign your EXE using a valid Authenticode Code Signing or EV Certificate.'}
            </p>

            <div className="bg-slate-800 p-3.5 rounded-2xl border border-slate-700 font-mono text-xs text-slate-200 space-y-1.5 shadow-inner">
              <div className="text-indigo-400 font-bold">// إعداد متغيرات البيئة في طرفية البناء:</div>
              <div>set CSC_LINK=C:\path\to\certificate.pfx</div>
              <div>set CSC_KEY_PASSWORD=YourCertPassword</div>
              <div className="text-slate-400 pt-1">// أو في حال استخدام أجهزة EV Token في نظام ويندوز:</div>
              <div>set WIN_CSC_IDENTITY_NAME="Al-Safwa Smart POS Systems Co."</div>
            </div>
          </div>
        </div>

        {/* Sensitive Variables & Secrets Security */}
        <div className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-base text-slate-800">{isAr ? 'إدارة سرية البيانات ومفاهيم الأمان (Environment Variables)' : 'Secret Variables & Security Best Practices'}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-medium">
              {isAr
                ? 'تطبيقات سطح المكتب المبنية بـ Electron لا يجب أبداً أن تحتوي على مفاتيح سرية مكشوفة داخل الواجهة الأمامية (VITE_). تم تصميم هندستنا لكي يبقى مفتاح GEMINI_API_KEY داخل خادم Express الخلفي (server.ts) المحزوم داخل server.cjs.'
                : 'Never expose sensitive keys in frontend bundle. Our architecture encapsulates GEMINI_API_KEY exclusively inside the backend Express process (server.ts/server.cjs).'}
            </p>

            <div className="bg-slate-800 p-3.5 rounded-2xl border border-slate-700 font-mono text-xs text-slate-200 space-y-1.5 shadow-inner">
              <div className="text-emerald-400 font-bold">// القواعد الذهبية للأمان في تطبيقنا:</div>
              <div>1. جميع استدعاءات الذكاء الاصطناعي تتم في /api/ai/analyze</div>
              <div>2. قاعدة البيانات db.json معزولة ومحميّة في مجلد المستهلك</div>
              <div>3. لا توجد منافذ مفتوحة للشبكة الخارجية (localhost:3000 فقط)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
