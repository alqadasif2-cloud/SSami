import React, { useState } from 'react';
import {
  ChevronRight,
  ShieldAlert,
  Award,
  RotateCcw,
  Table2,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface InstructionsScreenProps {
  onBack: () => void;
}

interface StrategyRow {
  tradeNumber: number;
  capitalBefore: string;
  profit: string;
  capitalAfter: string;
}

// Pre-computed 150-trade strategy rows embedded directly inside the application
const STRATEGY_150_ROWS: StrategyRow[] = Array.from({ length: 150 }, (_, index) => {
  const tradeNumber = index + 1;
  const beforeVal = 150 + index * 20;
  const profitVal = 20;
  const afterVal = beforeVal + profitVal;

  return {
    tradeNumber,
    capitalBefore: beforeVal.toLocaleString('en-US'),
    profit: profitVal.toLocaleString('en-US'),
    capitalAfter: afterVal.toLocaleString('en-US'),
  };
});

export const InstructionsScreen: React.FC<InstructionsScreenProps> = ({ onBack }) => {
  const [rangeFilter, setRangeFilter] = useState<'all' | '1-50' | '51-100' | '101-150'>('all');

  const displayedRows = STRATEGY_150_ROWS.filter((row) => {
    if (rangeFilter === '1-50') return row.tradeNumber >= 1 && row.tradeNumber <= 50;
    if (rangeFilter === '51-100') return row.tradeNumber >= 51 && row.tradeNumber <= 100;
    if (rangeFilter === '101-150') return row.tradeNumber >= 101 && row.tradeNumber <= 150;
    return true;
  });

  return (
    <div dir="rtl" className="space-y-5 pb-24 text-right animate-in fade-in duration-200">
      {/* Top Navigation & Page Header */}
      <div className="sticky top-0 z-20 bg-[#0b0f17]/95 backdrop-blur-md py-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100 tracking-tight">
              التعليمات والإرشادات
            </h1>
            <p className="text-[11px] text-slate-400">
              دليل وقواعد رحلة التداول الكامل وخطة الـ 150 صفقة
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-amber-400 text-xs font-bold transition-colors cursor-pointer"
        >
          <span>رجوع</span>
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
      </div>

      {/* Main Title Banner Card */}
      <div className="bg-gradient-to-b from-[#161f33] to-[#101726] border border-amber-500/35 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center gap-2.5 text-amber-400 font-black text-sm sm:text-base">
          <span className="text-lg">📌</span>
          <h2>دليل وقواعد رحلة التداول (استراتيجية 150 صفقة)</h2>
        </div>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          يرجى قراءة القواعد التالية بعناية والالتزام الكامل بها طوال مراحل الرحلة لضمان حماية الحساب والوصول إلى الهدف النهائي بنجاح.
        </p>
      </div>

      {/* Card 1: Safety Net & Account Protection */}
      <div className="bg-[#121824] border border-rose-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800/80">
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-100">
            1️⃣ شبكة الأمان وحماية الحساب (هامش الخسارة):
          </h3>
        </div>

        <ul className="space-y-2.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-rose-400 font-bold mt-0.5">•</span>
            <span>
              عند بداية الرحلة، نعتبر مبلغ <strong className="text-amber-400 font-mono">50$</strong> من رأس المال بمثابة حاجز أمان / خط أحمر.
            </span>
          </li>
          <li className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-rose-300">تنبيه مهم:</strong> إذا تعرض حساب أي مشترك لخسارة وصلت إلى <strong className="font-mono">50$</strong> في بداية الرحلة، يجب عليه إبلاغ قائد/منظم الرحلة فوراً لمراجعة الصفقات وإيقاف النزيف.
            </span>
          </li>
        </ul>
      </div>

      {/* Card 2: Safety Stage (Break-even & Capital Withdrawal) */}
      <div className="bg-[#121824] border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800/80">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-100">
            2️⃣ مرحلة الأمان (تجاوز نقطة التعادل وسحب رأس المال):
          </h3>
        </div>

        <ul className="space-y-2.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
          <li className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-amber-400 font-bold mt-0.5">•</span>
            <span>
              <strong className="text-amber-300">المرحلة الذهبية:</strong> تكمن الخطوة الأهم والأصعب في الوصول بالحساب إلى ضعف رأس المال (<strong className="text-amber-400 font-mono">300$</strong>)، أي تحقيق أرباح صافية تساوي <strong className="text-emerald-400 font-mono">150$</strong>.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 font-bold mt-0.5">•</span>
            <span>
              <strong className="text-slate-100">الخطوة التالية:</strong> بمجرد الوصول إلى هذا الهدف، يقوم جميع المشتركين بسحب مبلغ رأس المال الأساسي (<strong className="text-amber-400 font-mono">150$</strong>) فوراً.
            </span>
          </li>
          <li className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-emerald-300">النتيجة:</strong> نكتمل باقي رحلة الـ 150 صفقة باستخدام أرباح السوق فقط (<strong className="font-mono">150$</strong>)، مما يلغي أي مخاطرة على رأس مالك الشخصي.
            </span>
          </li>
        </ul>
      </div>

      {/* Card 3: Handling Losing Trades (Step-Back System) */}
      <div className="bg-[#121824] border border-sky-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800/80">
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <RotateCcw className="w-4 h-4" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-100">
            3️⃣ آلية التعامل مع الصفقات الخاسرة (نظام الرجوع للخلف):
          </h3>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          الهدف هو إتمام 150 صفقة ناجحة. عند ضرب وقف الخسارة في أي صفقة، يتعامل الحساب مع الأمر بمرونة وفق القاعدة التالية:
        </p>

        <div className="space-y-2.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/25">
            <strong className="text-sky-300">القاعدة:</strong> كل صفقة خاسرة تُرجعك خطوة واحدة إلى الخلف في الجدول.
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <strong className="text-amber-400 block mb-1">مثال توضيحي:</strong>
            إذا أتممت الصفقة رقم <strong className="font-mono text-emerald-400">25</strong> بنجاح، ثم فتحت الصفقة رقم <strong className="font-mono text-rose-400">26</strong> وخسرت، يتم احتساب رصيدك الحالي وكأنك في الصفقة رقم <strong className="font-mono text-amber-400">24</strong>. الصفقة القادمة التي ستدخلها ستكون لتعويض الخسارة والعودة إلى الصفقة رقم <strong className="font-mono text-emerald-400">25</strong>، وهكذا حتى نصل جميعاً إلى الصفقة <strong className="font-mono text-amber-400">150</strong> بنجاح.
          </div>
        </div>
      </div>

      {/* Strategy Table Header & Summary Metrics Card */}
      <div className="bg-[#121824] border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Table2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-100">
              جدول استراتيجية النمو المتراكم (150 صفقة)
            </h3>
            <p className="text-[11px] text-slate-400">
              تفصيل كامل لجميع صفقات الرحلة من الصفقة 1 إلى الصفقة 150
            </p>
          </div>
        </div>

        {/* 4 Summary Metrics from the Strategy File */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-[#141b2a] border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-1">رأس المال الابتدائي</span>
            <span className="text-base font-black text-amber-400 font-['JetBrains_Mono',monospace]">
              $150
            </span>
          </div>

          <div className="bg-[#141b2a] border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-1">
              الربح الثابت لكل صفقة ادنى شيئ
            </span>
            <span className="text-base font-black text-emerald-400 font-['JetBrains_Mono',monospace]">
              $20
            </span>
          </div>

          <div className="bg-[#141b2a] border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-1">إجمالي الأرباح المكتسبة</span>
            <span className="text-base font-black text-emerald-400 font-['JetBrains_Mono',monospace]">
              $3,000
            </span>
          </div>

          <div className="bg-[#141b2a] border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-1">إجمالي رأس المال النهائي</span>
            <span className="text-base font-black text-amber-300 font-['JetBrains_Mono',monospace]">
              $3,150
            </span>
          </div>
        </div>

        {/* Quick Range Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {(
            [
              { id: 'all', label: 'كل الصفقات (1 - 150)' },
              { id: '1-50', label: '1 - 50' },
              { id: '51-100', label: '51 - 100' },
              { id: '101-150', label: '101 - 150' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRangeFilter(tab.id)}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                rangeFilter === tab.id
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 150 Trades Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0e1420]">
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-center text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-[#162033] text-slate-200 font-bold border-b border-slate-700 shadow-sm">
                <tr>
                  <th className="py-3 px-2 border-l border-slate-800 whitespace-nowrap">
                    رقم الصفقة
                  </th>
                  <th className="py-3 px-2 border-l border-slate-800 whitespace-nowrap">
                    رأس المال قبل الصفقة ($)
                  </th>
                  <th className="py-3 px-2 border-l border-slate-800 whitespace-nowrap">
                    الربح ($)
                  </th>
                  <th className="py-3 px-2 whitespace-nowrap">
                    رأس المال بعد الربح ($)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-['JetBrains_Mono',monospace]">
                {displayedRows.map((row) => {
                  const isFinalRow = row.tradeNumber === 150;
                  return (
                    <tr
                      key={row.tradeNumber}
                      className={`transition-colors ${
                        isFinalRow
                          ? 'bg-amber-500/15 font-black'
                          : 'hover:bg-slate-800/40 odd:bg-[#0e1420] even:bg-[#111827]/60'
                      }`}
                    >
                      <td className="py-2.5 px-2 font-bold text-amber-400 border-l border-slate-800/60">
                        {row.tradeNumber}
                      </td>
                      <td className="py-2.5 px-2 text-slate-300 border-l border-slate-800/60">
                        {row.capitalBefore}
                      </td>
                      <td className="py-2.5 px-2 font-bold text-emerald-400 border-l border-slate-800/60">
                        {row.profit}
                      </td>
                      <td className="py-2.5 px-2 font-bold text-slate-100">
                        {row.capitalAfter}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Totals */}
          <div className="bg-[#162033] border-t border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
            <span className="text-slate-200">
              إجمالي عدد الصفقات:{' '}
              <strong className="text-amber-400 font-mono">150 صفقة</strong>
            </span>
            <span className="text-slate-200">
              رأس المال النهائي:{' '}
              <strong className="text-emerald-400 font-mono">3,150$</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
