import React from 'react';
import { Check, X, Circle } from 'lucide-react';
import { Milestone, Trade } from '../types';
import { formatMoney } from '../utils/money';

interface RoadmapScreenProps {
  milestones: Milestone[];
  trades?: Trade[];
  onSelectMilestone: (milestone: Milestone) => void;
}

export const RoadmapScreen: React.FC<RoadmapScreenProps> = ({
  milestones,
  trades,
  onSelectMilestone,
}) => {
  const completedCount = trades
    ? trades.filter((t) => t.type === 'WIN').length
    : milestones.filter((m) => m.status === 'WIN').length;

  const failedCount = trades
    ? trades.filter((t) => t.type === 'LOSS').length
    : milestones.filter((m) => m.status === 'LOSS').length;

  const remainingCount = Math.max(0, 150 - completedCount);

  return (
    <div className="space-y-4 pb-20 text-right animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="pt-1">
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">خريطة المحطات</h2>
        <p className="text-xs text-slate-400 mt-0.5">جدول المحطات التفاعلي (150 محطة تداول)</p>
      </div>

      {/* 4 Summary Counters: المنجزة | الفاشلة | المتبقية | الإجمالي */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-[#121824] border border-slate-800/80 rounded-xl p-2.5 sm:p-3 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">المنجزة</span>
          <span className="font-['JetBrains_Mono',monospace] text-base font-black text-emerald-400">
            {completedCount}
          </span>
        </div>

        <div className="bg-[#121824] border border-rose-500/35 rounded-xl p-2.5 sm:p-3 text-center">
          <span className="text-[11px] text-rose-400 font-medium block mb-1">الفاشلة</span>
          <span className="font-['JetBrains_Mono',monospace] text-base font-black text-rose-500">
            {failedCount}
          </span>
        </div>

        <div className="bg-[#121824] border border-slate-800/80 rounded-xl p-2.5 sm:p-3 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">المتبقية</span>
          <span className="font-['JetBrains_Mono',monospace] text-base font-black text-amber-400">
            {remainingCount}
          </span>
        </div>

        <div className="bg-[#121824] border border-slate-800/80 rounded-xl p-2.5 sm:p-3 text-center">
          <span className="text-[11px] text-slate-400 font-medium block mb-1">الإجمالي</span>
          <span
            dir="ltr"
            className="font-['JetBrains_Mono',monospace] inline-flex items-baseline justify-center gap-0.5"
          >
            <span className="text-base font-black text-slate-200">150</span>
            {failedCount > 0 && (
              <span className="text-[11px] font-bold text-rose-400">+{failedCount}</span>
            )}
          </span>
        </div>
      </div>

      {/* 150 Rows Interactive Table matching screenshot 6 */}
      <div className="bg-[#121824] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-right text-xs">
            {/* Table Header matching screenshot 6 order */}
            <thead className="sticky top-0 bg-[#0e1420] border-b border-slate-800 text-slate-400 font-semibold z-10 shadow-sm">
              <tr>
                <th className="py-3 px-3 text-center w-16">حالة الصفقة</th>
                <th className="py-3 px-3 text-center">الربح</th>
                <th className="py-3 px-3 text-center">رصيد الحساب</th>
                <th className="py-3 px-3 text-center w-16">المحطة</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/50 font-['JetBrains_Mono',monospace]">
              {milestones.map((milestone) => {
                const isWin = milestone.status === 'WIN';
                const isLoss = milestone.status === 'LOSS';
                const isPending = milestone.status === 'PENDING';

                return (
                  <tr
                    key={milestone.id}
                    onClick={() => onSelectMilestone(milestone)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors active:bg-slate-800/70"
                  >
                    {/* Column 1: Status Icon Circle */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center">
                        {isWin && (
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center shadow-sm">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                        {isLoss && (
                          <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500 text-rose-400 flex items-center justify-center shadow-sm">
                            <X className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                        {isPending && (
                          <div className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center text-slate-600">
                            <Circle className="w-2.5 h-2.5 stroke-[1.5]" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Column 2: Profit / Result */}
                    <td
                      className={`py-3 px-3 text-center font-bold ${
                        isWin
                          ? 'text-emerald-400'
                          : isLoss
                          ? 'text-rose-400'
                          : 'text-slate-600'
                      }`}
                    >
                      {formatMoney(milestone.profitCents, { showSign: true })}
                    </td>

                    {/* Column 3: Resulting Balance */}
                    <td className="py-3 px-3 text-center font-bold text-slate-200">
                      {formatMoney(milestone.balanceCents)}
                    </td>

                    {/* Column 4: Milestone Number */}
                    <td className="py-3 px-3 text-center font-bold text-slate-400">
                      {milestone.milestoneNumber}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
