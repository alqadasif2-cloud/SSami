import React from 'react';
import { ChevronRight, Calendar, ArrowUpRight, ArrowDownRight, Clock, Eye } from 'lucide-react';
import { Milestone } from '../types';
import { formatMoney, formatDateTime } from '../utils/money';
import { CloudImage } from './CloudImage';

interface MilestoneDetailModalProps {
  milestone: Milestone | null;
  onClose: () => void;
  onViewImage: (imageUrl: string) => void;
}

export const MilestoneDetailModal: React.FC<MilestoneDetailModalProps> = ({
  milestone,
  onClose,
  onViewImage,
}) => {
  if (!milestone) return null;

  const isWin = milestone.status === 'WIN';
  const isLoss = milestone.status === 'LOSS';
  const isPending = milestone.status === 'PENDING';

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
          <h2 className="text-base font-bold text-slate-100">تفاصيل المحطة</h2>
          <div className="w-10"></div>
        </div>

        {/* Main Card */}
        <div className="bg-[#141b2a] border border-slate-800/90 rounded-2xl p-5 mb-5 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-100 font-['JetBrains_Mono',monospace]">
              المحطة #{milestone.milestoneNumber}
            </h3>
            {isWin && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>WIN</span>
              </span>
            )}
            {isLoss && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 border border-rose-500/40 text-rose-400 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>LOSS</span>
              </span>
            )}
            {isPending && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>لم تبدأ بعد</span>
              </span>
            )}
          </div>

          {/* Details */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">الربح</span>
              <span
                className={`font-['JetBrains_Mono',monospace] font-bold ${
                  isWin
                    ? 'text-emerald-400'
                    : isLoss
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {formatMoney(milestone.profitCents, { showSign: true })}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">رصيد الحساب</span>
              <span className="font-['JetBrains_Mono',monospace] font-bold text-slate-100">
                {formatMoney(milestone.balanceCents)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>تاريخ الصفقة</span>
              </span>
              <span className="font-['JetBrains_Mono',monospace] text-xs font-semibold text-slate-300">
                {milestone.timestamp ? formatDateTime(milestone.timestamp) : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Attachment Card */}
        {milestone.attachmentPath && (
          <div className="bg-[#141b2a] border border-slate-800/90 rounded-2xl p-4 mb-5">
            <span className="text-xs font-bold text-slate-300 block mb-3">معلومات إضافية</span>
            <div className="flex items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/60 border border-slate-700/60 shrink-0">
                <CloudImage
                  src={milestone.attachmentPath}
                  alt="مرفق"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => onViewImage(milestone.attachmentPath!)}
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
