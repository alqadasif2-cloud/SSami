import React from 'react';
import { ChevronRight, Calendar, ArrowUpRight, ArrowDownRight, Eye } from 'lucide-react';
import { Trade } from '../types';
import { formatMoney, formatDateTime } from '../utils/money';
import { CloudImage } from './CloudImage';

interface TradeDetailModalProps {
  trade: Trade | null;
  onClose: () => void;
  onViewImage: (imageUrl: string) => void;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({
  trade,
  onClose,
  onViewImage,
}) => {
  if (!trade) return null;

  const isWin = trade.type === 'WIN';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e1420] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-100 text-sm font-medium transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
            <span>رجوع</span>
          </button>
          <h2 className="text-base font-bold text-slate-100">تفاصيل الصفقة</h2>
          <div className="w-10"></div>
        </div>

        {/* Main Card */}
        <div className="bg-[#141b2a] border border-slate-800/90 rounded-2xl p-5 mb-5 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-100 font-['JetBrains_Mono',monospace]">
              الصفقة #{trade.tradeNumber}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                isWin
                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-500/15 border border-rose-500/40 text-rose-400'
              }`}
            >
              {isWin ? (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>WIN</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>LOSS</span>
                </>
              )}
            </span>
          </div>

          {/* Result Highlight */}
          <div className="text-center py-4 bg-slate-900/60 rounded-xl border border-slate-800 mb-4">
            <span className="text-xs text-slate-400 block mb-1">النتيجة</span>
            <div
              className={`text-3xl font-black font-['JetBrains_Mono',monospace] ${
                isWin ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatMoney(trade.resultCents, { showSign: true })}
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">الرصيد السابق</span>
              <span className="font-['JetBrains_Mono',monospace] font-bold text-slate-200">
                {formatMoney(trade.oldBalanceCents)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">الرصيد الجديد</span>
              <span className="font-['JetBrains_Mono',monospace] font-bold text-slate-100">
                {formatMoney(trade.newBalanceCents)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>التاريخ والوقت</span>
              </span>
              <span className="font-['JetBrains_Mono',monospace] text-xs font-semibold text-slate-300">
                {formatDateTime(trade.timestamp)}
              </span>
            </div>
          </div>
        </div>

        {/* Attachment Card */}
        {trade.attachmentPath && (
          <div className="bg-[#141b2a] border border-slate-800/90 rounded-2xl p-4 mb-5">
            <span className="text-xs font-bold text-slate-300 block mb-3">المرفقات</span>
            <div className="flex items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/60 border border-slate-700/60 shrink-0">
                <CloudImage
                  src={trade.attachmentPath}
                  alt="مرفق"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => onViewImage(trade.attachmentPath!)}
                className="flex items-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-bold transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>عرض الصورة</span>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 text-sm transition-colors"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
};
