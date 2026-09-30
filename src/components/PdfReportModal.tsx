import React from 'react';
import { ChevronRight, Share2, Printer, CheckCircle2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Challenge, Trade } from '../types';
import { formatMoney, formatDateTime, calculateProgress } from '../utils/money';

interface PdfReportModalProps {
  isOpen: boolean;
  challenge: Challenge;
  trades: Trade[];
  onClose: () => void;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  challenge,
  trades,
  onClose,
}) => {
  if (!isOpen) return null;

  // Calculate totals
  let totalProfitsCents = 0;
  let totalLossesCents = 0;
  let netResultCents = 0;

  for (const trade of trades) {
    if (trade.resultCents > 0) {
      totalProfitsCents += trade.resultCents;
    } else if (trade.resultCents < 0) {
      totalLossesCents += Math.abs(trade.resultCents);
    }
    netResultCents += trade.resultCents;
  }

  const progressPercent = calculateProgress(
    challenge.currentBalanceCents,
    challenge.targetBalanceCents
  );

  const reportDate = formatDateTime(Date.now());

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareText = `تقرير رحلة التداول - Sami Trading Journey Tracker
المتداول: ${challenge.userName || 'متداول'}
الرصيد الحالي: ${formatMoney(challenge.currentBalanceCents)}
نسبة التقدم: ${progressPercent.toFixed(2)}%
عدد الصفقات: ${trades.length}
صافي الأرباح: ${formatMoney(netResultCents, { showSign: true })}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'تقرير رحلة التداول',
          text: shareText,
        });
      } catch (e) {
        // User cancelled or share failed, fallback to print
        window.print();
      }
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0e1420] border border-slate-800 rounded-2xl max-w-lg w-full max-h-[96vh] flex flex-col shadow-2xl text-right my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-100 text-sm font-medium transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
            <span>رجوع</span>
          </button>
          <h2 className="text-base font-bold text-slate-100">تقرير رحلة التداول (PDF)</h2>
          <button
            onClick={handlePrint}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 rounded-lg transition-colors"
            title="طباعة التقرير"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Printable Sheet Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 print-container">
          <div
            id="printable-report"
            className="bg-white text-slate-900 rounded-xl p-5 sm:p-6 shadow-md border border-slate-200 text-right font-['Cairo',sans-serif]"
            dir="rtl"
          >
            {/* Report Header */}
            <div className="flex items-center justify-between pb-5 mb-5 border-b-2 border-slate-900">
              <div className="text-right">
                <span className="text-xs uppercase tracking-widest text-slate-500 font-bold block mb-1">
                  Sami • Trading Journey
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  تقرير رحلة التداول
                </h1>
              </div>
              <img
                src="/app-icon.png"
                alt="Sami Logo"
                className="w-14 h-14 rounded-xl border border-slate-300 shadow-sm object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Trader Details */}
            <div className="mb-5">
              <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                معلومات المتداول
              </h3>
              <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-2 border border-slate-200">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">اسم المتداول:</span>
                  <span className="font-bold text-slate-900">{challenge.userName || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">رأس المال الابتدائي:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatMoney(challenge.initialCapitalCents)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">الرصيد الحالي:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {formatMoney(challenge.currentBalanceCents)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">الهدف النهائي:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatMoney(challenge.targetBalanceCents)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">نسبة التقدم:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {progressPercent.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">عدد الصفقات:</span>
                  <span className="font-mono font-bold text-slate-900">{trades.length}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">تاريخ إنشاء التقرير:</span>
                  <span className="font-mono text-slate-600">{reportDate}</span>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="mb-5">
              <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                ملخص الأداء
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                  <span className="text-[11px] text-emerald-800 font-medium block mb-0.5">
                    إجمالي الأرباح
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-black text-emerald-700">
                    {formatMoney(totalProfitsCents)}
                  </span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                  <span className="text-[11px] text-rose-800 font-medium block mb-0.5">
                    إجمالي الخسائر
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-black text-rose-700">
                    {formatMoney(totalLossesCents)}
                  </span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  <span className="text-[11px] text-amber-800 font-medium block mb-0.5">
                    صافي النتائج
                  </span>
                  <span
                    className={`font-mono text-xs sm:text-sm font-black ${
                      netResultCents >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatMoney(netResultCents, { showSign: true })}
                  </span>
                </div>
              </div>
            </div>

            {/* Trade Log Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                سجل الصفقات
              </h3>
              {trades.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                  لا توجد صفقات مسجلة حتى الآن
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                        <th className="py-2 px-2.5 text-center font-bold">#</th>
                        <th className="py-2 px-2.5 font-bold">النتيجة</th>
                        <th className="py-2 px-2.5 font-bold">الرصيد السابق</th>
                        <th className="py-2 px-2.5 font-bold">الرصيد الجديد</th>
                        <th className="py-2 px-2.5 font-bold">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-['JetBrains_Mono',monospace]">
                      {trades.map((t) => {
                        const isWin = t.type === 'WIN';
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-2.5 text-center font-bold text-slate-700">
                              {t.tradeNumber}
                            </td>
                            <td
                              className={`py-2 px-2.5 font-bold ${
                                isWin ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {formatMoney(t.resultCents, { showSign: true })}
                            </td>
                            <td className="py-2 px-2.5 text-slate-600">
                              {formatMoney(t.oldBalanceCents)}
                            </td>
                            <td className="py-2 px-2.5 font-bold text-slate-900">
                              {formatMoney(t.newBalanceCents)}
                            </td>
                            <td className="py-2 px-2.5 text-[10px] text-slate-500">
                              {formatDateTime(t.timestamp)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#0e1420] shrink-0">
          <button
            onClick={handleShare}
            className="w-full py-3.5 rounded-xl font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>مشاركة التقرير</span>
          </button>
        </div>
      </div>
    </div>
  );
};
