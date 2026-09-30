import React, { useState } from 'react';
import { FileText, Coins, ArrowUp, ArrowDown, TrendingUp, ChevronLeft, Calendar, Image as ImageIcon, Plus } from 'lucide-react';
import { Trade, TradeFilter } from '../types';
import { formatMoney, formatDateTime } from '../utils/money';
import { CloudImage } from './CloudImage';

interface TradeHistoryScreenProps {
  trades: Trade[];
  onOpenPdfReport: () => void;
  onSelectTrade: (trade: Trade) => void;
  onOpenAddTrade: () => void;
}

export const TradeHistoryScreen: React.FC<TradeHistoryScreenProps> = ({
  trades,
  onOpenPdfReport,
  onSelectTrade,
  onOpenAddTrade,
}) => {
  const [filter, setFilter] = useState<TradeFilter>('all');

  // Calculate top summary metrics
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

  // Filter trades (newest first)
  const sortedTrades = [...trades].sort((a, b) => b.tradeNumber - a.tradeNumber);

  const filteredTrades = sortedTrades.filter((t) => {
    if (filter === 'win') return t.type === 'WIN';
    if (filter === 'loss') return t.type === 'LOSS';
    if (filter === 'with_image') return Boolean(t.attachmentPath);
    return true;
  });

  return (
    <div className="space-y-4 pb-20 text-right animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">سجل الصفقات</h2>

        {/* PDF Share Button with yellow outline */}
        <button
          onClick={onOpenPdfReport}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition-all active:scale-95 shadow-sm"
        >
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          <span>مشاركة التقرير (PDF)</span>
        </button>
      </div>

      {/* 4 Summary Stat Cards (4-column row matching screenshot 1) */}
      <div className="grid grid-cols-4 gap-2">
        {/* Net Results */}
        <div className="bg-[#121824] border border-slate-800/80 rounded-xl p-2.5 text-center flex flex-col justify-between">
          <div className="flex items-center justify-center text-amber-400 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">صافي النتائج</span>
          <span
            className={`font-['JetBrains_Mono',monospace] text-xs font-black block mt-0.5 ${
              netResultCents >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatMoney(netResultCents, { showSign: true })}
          </span>
        </div>

        {/* Total Losses */}
        <div className="bg-[#121824] border border-slate-800/80 rounded-xl p-2.5 text-center flex flex-col justify-between">
          <div className="flex items-center justify-center text-rose-400 mb-1">
            <ArrowDown className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">إجمالي الخسائر</span>
          <span className="font-['JetBrains_Mono',monospace] text-xs font-black text-rose-400 block mt-0.5">
            {totalLossesCents > 0 ? `-${formatMoney(totalLossesCents)}` : '$0.00'}
          </span>
        </div>

        {/* Total Profits */}
        <div className="bg-[#121824] border border-slate-800/80 rounded-xl p-2.5 text-center flex flex-col justify-between">
          <div className="flex items-center justify-center text-emerald-400 mb-1">
            <ArrowUp className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">إجمالي الأرباح</span>
          <span className="font-['JetBrains_Mono',monospace] text-xs font-black text-emerald-400 block mt-0.5">
            {formatMoney(totalProfitsCents, { showSign: true })}
          </span>
        </div>

        {/* Trade Count */}
        <div className="bg-[#121824] border border-slate-800/80 rounded-xl p-2.5 text-center flex flex-col justify-between">
          <div className="flex items-center justify-center text-amber-400 mb-1">
            <Coins className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">عدد الصفقات</span>
          <span className="font-['JetBrains_Mono',monospace] text-xs font-black text-slate-100 block mt-0.5">
            {trades.length}
          </span>
        </div>
      </div>

      {/* Filter Tabs matching screenshot 1 */}
      <div className="flex items-center justify-between gap-1.5 p-1 bg-[#121824] border border-slate-800/80 rounded-xl">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          الكل
        </button>
        <button
          onClick={() => setFilter('win')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            filter === 'win'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-emerald-400'
          }`}
        >
          <span>الربح</span>
          <ArrowUp className="w-3 h-3" />
        </button>
        <button
          onClick={() => setFilter('loss')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            filter === 'loss'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-rose-400'
          }`}
        >
          <span>الخسارة</span>
          <ArrowDown className="w-3 h-3" />
        </button>
        <button
          onClick={() => setFilter('with_image')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            filter === 'with_image'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-amber-400'
          }`}
        >
          <span>مع صورة</span>
          <ImageIcon className="w-3 h-3" />
        </button>
      </div>

      {/* Trades List */}
      {filteredTrades.length === 0 ? (
        <div className="bg-[#121824] border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto">
            <Coins className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-200">لا توجد صفقات حتى الآن</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            ابدأ بإضافة أول صفقة لمتابعة تقدمك في رحلة الـ 150 صفقة.
          </p>
          <button
            onClick={onOpenAddTrade}
            className="py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أول صفقة</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrades.map((trade) => {
            const isWin = trade.type === 'WIN';
            return (
              <div
                key={trade.id}
                onClick={() => onSelectTrade(trade)}
                className="bg-[#121824] hover:bg-[#151e2e] border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-3.5 cursor-pointer transition-all shadow-md active:scale-[0.99] relative overflow-hidden"
              >
                {/* Top Row: #Number, Win/Loss Badge, Timestamp */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-['JetBrains_Mono',monospace] font-black text-sm text-slate-200">
                      #{trade.tradeNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        isWin
                          ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                          : 'bg-rose-500/15 border border-rose-500/40 text-rose-400'
                      }`}
                    >
                      {isWin ? '✔ ربح' : '✕ خسارة'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-['JetBrains_Mono',monospace]">
                    <span>{formatDateTime(trade.timestamp)}</span>
                    <Calendar className="w-3 h-3 text-slate-500" />
                  </div>
                </div>

                {/* Bottom Row: Columns matching screenshot 1 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  {/* Left: Thumbnail if image exists */}
                  {trade.attachmentPath ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 bg-black/60 shrink-0 ml-2 relative">
                      <CloudImage
                        src={trade.attachmentPath}
                        alt="مرفق"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <ImageIcon className="w-3 h-3 text-white/80" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-8 shrink-0"></div>
                  )}

                  {/* Columns */}
                  <div className="flex-1 grid grid-cols-3 gap-1 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">الرصيد الجديد</span>
                      <span className="font-['JetBrains_Mono',monospace] text-xs font-bold text-slate-100">
                        {formatMoney(trade.newBalanceCents)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">الرصيد السابق</span>
                      <span className="font-['JetBrains_Mono',monospace] text-xs font-bold text-slate-300">
                        {formatMoney(trade.oldBalanceCents)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">نتيجة الصفقة</span>
                      <span
                        className={`font-['JetBrains_Mono',monospace] text-xs font-black ${
                          isWin ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatMoney(trade.resultCents, { showSign: true })}
                      </span>
                    </div>
                  </div>

                  {/* Right Chevron */}
                  <div className="text-slate-500 mr-2 shrink-0">
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="text-center py-4 text-[11px] text-slate-500 font-medium">
            — لا توجد المزيد من الصفقات —
          </div>
        </div>
      )}
    </div>
  );
};
