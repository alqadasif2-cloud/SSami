import React, { useRef, useState } from 'react';
import { Challenge, Trade } from '../types';
import { formatMoney, calculateProgress } from '../utils/money';
import { CurrentUser, uploadUserAvatar } from '../data/auth';
import { CloudImage } from './CloudImage';

interface DashboardScreenProps {
  challenge: Challenge;
  currentUser?: CurrentUser;
  trades?: Trade[];
  latestTrade?: Trade | null;
  notificationMessage?: string | null;
  onOpenSettings: () => void;
  onOpenAdminPanel?: () => void;
  onOpenPrivateChat?: () => void;
  onOpenAddTrade: () => void;
  onStartChallengeClick: () => void;
  onNewChallengeClick: () => void;
  onAvatarUpdated?: (newUrl: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  challenge,
  currentUser,
  trades,
  notificationMessage,
  onOpenSettings,
  onOpenAdminPanel,
  onOpenPrivateChat,
  onOpenAddTrade,
  onStartChallengeClick,
  onNewChallengeClick,
  onAvatarUpdated,
}) => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const progressPercent = calculateProgress(
    challenge.currentBalanceCents,
    challenge.targetBalanceCents
  );

  const isTargetReached = challenge.currentBalanceCents >= challenge.targetBalanceCents;
  const completedTradesCount = trades
    ? trades.filter((t) => t.type === 'WIN').length
    : challenge.tradeCount;
  const remainingTrades = Math.max(0, 150 - completedTradesCount);
  const isOwner = currentUser?.role === 'owner' || currentUser?.id === 1;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentUser) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadUserAvatar(currentUser.id, file);
      onAvatarUpdated?.(url);
    } catch {
      // Ignore
    } finally {
      setUploadingAvatar(false);
    }
  };

  const visualProgressWidth = Math.min(
    100,
    Math.max(progressPercent, progressPercent > 0 ? 5 : 2)
  );

  return (
    <div
      dir="rtl"
      className="relative space-y-3.5 pb-20 text-right animate-in fade-in duration-300 select-none"
    >
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarChange}
        accept="image/*"
        className="hidden"
      />

      {/* Ambient Financial Candlestick & Gold Glow Background Layer */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 opacity-25">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        <svg
          className="absolute top-20 left-0 right-0 w-full h-48 opacity-25"
          viewBox="0 0 400 120"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0 95 L40 80 L85 90 L130 55 L175 68 L225 35 L275 48 L330 18 L400 28"
            stroke="url(#goldLineGrad)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <defs>
            <linearGradient id="goldLineGrad" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top Brand Bar + Quick Private Chat / Admin Button */}
      <div className="relative z-10 flex items-center justify-between pt-0.5 px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400/25 to-amber-600/10 border border-amber-400/50 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.25)]">
            <span className="material-symbols-filled text-amber-400 text-[16px]">workspace_premium</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-black text-amber-400 tracking-wide">Sami</span>
            <span className="text-amber-500/60">•</span>
            <span className="text-slate-300 font-semibold text-[11px]">مجتمع الربح والنجاح</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isOwner && onOpenAdminPanel && (
            <button
              type="button"
              onClick={onOpenAdminPanel}
              className="px-2.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/50 text-amber-300 text-[11px] font-black flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.2)] active:scale-95 transition cursor-pointer"
              title="لوحة تحكم القائد"
            >
              <span className="material-symbols-filled text-[15px] text-amber-400">shield_person</span>
              <span>لوحة التحكم</span>
            </button>
          )}

          {onOpenPrivateChat && (
            <button
              type="button"
              onClick={onOpenPrivateChat}
              className="px-3 py-1.5 rounded-xl bg-[#0e1628]/90 hover:bg-[#152038] border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 shadow-[0_0_14px_rgba(245,158,11,0.15)] active:scale-95 transition cursor-pointer"
            >
              <span className="material-symbols-filled text-[15px] text-amber-400">chat</span>
              <span>محادثة خاصة</span>
            </button>
          )}
        </div>
      </div>

      {/* User Account Luxury Header Card */}
      <div className="relative z-10 overflow-hidden rounded-3xl bg-gradient-to-l from-[#111a2e]/95 via-[#0c1323]/95 to-[#090e1a]/95 border border-amber-500/30 p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.65)]">
        {/* Subtle Candlestick Graphic in Header Background */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 opacity-25 flex items-end gap-1.5 px-6 pb-2">
          <div className="w-1.5 h-6 bg-emerald-500/60 rounded-sm" />
          <div className="w-1.5 h-10 bg-emerald-400/70 rounded-sm" />
          <div className="w-1.5 h-5 bg-rose-500/60 rounded-sm mb-2" />
          <div className="w-1.5 h-12 bg-emerald-400/80 rounded-sm" />
          <div className="w-1.5 h-8 bg-rose-500/60 rounded-sm mb-3" />
          <div className="w-1.5 h-14 bg-emerald-400/70 rounded-sm" />
        </div>

        <div className="relative z-10 flex items-center justify-between">
          {/* Right side (RTL): Avatar + Name */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="relative group cursor-pointer active:scale-95 transition-transform"
              title="تغيير الصورة الشخصية"
            >
              <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 shadow-[0_0_18px_rgba(245,158,11,0.4)]">
                {currentUser?.avatarUrl ? (
                  <CloudImage
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName}
                    className="w-full h-full rounded-full object-cover bg-[#080d1a]"
                  />
                ) : (
                  <img
                    src="/app-icon.png"
                    alt="Sami Logo"
                    className="w-full h-full rounded-full object-cover bg-[#080d1a]"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              {/* Crown / Camera Golden Badge */}
              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 rounded-full border-2 border-[#090e1a] flex items-center justify-center shadow-md">
                {uploadingAvatar ? (
                  <span className="w-2.5 h-2.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-filled text-[12px] text-slate-950">
                    {isOwner ? 'crown' : 'photo_camera'}
                  </span>
                )}
              </span>
            </button>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-semibold">تطبيق Sami</span>
                {isOwner && (
                  <span className="text-[10px] font-black text-amber-300 bg-amber-500/15 border border-amber-400/30 px-1.5 py-0.5 rounded-md">
                    👑 القائد
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                {challenge.userName || currentUser?.displayName || 'المتداول'}
              </h2>
            </div>
          </div>

          {/* Left side (RTL): Circular Settings Gear Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-full bg-[#151f35]/90 hover:bg-[#1c2944] border border-slate-700/70 hover:border-amber-400/50 flex items-center justify-center text-slate-200 hover:text-amber-400 transition-all active:scale-90 shadow-inner cursor-pointer"
            title="الإعدادات"
          >
            <span className="material-symbols-rounded text-[21px]">settings</span>
          </button>
        </div>
      </div>

      {/* Notification Alert Banner */}
      {notificationMessage && (
        <div className="relative z-10 flex items-center gap-2 p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-bold animate-in slide-in-from-top duration-300 shadow-lg">
          <span className="material-symbols-filled text-[18px] text-emerald-400">check_circle</span>
          <span>{notificationMessage}</span>
        </div>
      )}

      {/* Target Reached Celebration Banner */}
      {isTargetReached && (
        <div className="relative z-10 flex items-center gap-2.5 p-3.5 bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border border-amber-400/50 rounded-2xl text-amber-300 text-xs font-black shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          <span className="material-symbols-filled text-amber-400 text-[22px] animate-bounce">
            emoji_events
          </span>
          <div className="flex-1">
            <div className="text-sm">🎯 تم الوصول إلى الهدف النهائي بنجاح!</div>
            <div className="text-[11px] text-slate-300 font-medium mt-0.5">
              تهانينا! يمكنك الاستمرار في التداول حتى المحطة الـ150.
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* HERO BALANCE & 3D PROGRESS CARD (البطاقة الرئيسية الفاخرة)             */}
      {/* ===================================================================== */}
      <div className="relative z-10 overflow-hidden rounded-3xl border border-amber-500/45 bg-[#0a101f] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.8),0_0_25px_rgba(245,158,11,0.14)]">
        {/* Background Trading Bull & Candlestick Artwork */}
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-left opacity-45"
          style={{ backgroundImage: "url('/background_image.jpg')" }}
        />
        {/* Luxury Multi-Layer Vignette so text on right is ultra-crisp */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(270deg, rgba(8,13,26,0.96) 0%, rgba(10,16,32,0.82) 52%, rgba(10,16,32,0.35) 100%), linear-gradient(180deg, rgba(8,13,26,0.3) 0%, rgba(7,11,22,0.95) 100%)',
          }}
        />
        {/* Subtle Gold Corner Glow */}
        <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 bg-amber-400/15 rounded-full blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 w-40 h-40 bg-amber-500/15 rounded-full blur-2xl" />

        {/* Top Section: Label + Huge Metallic Gold Balance */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.3)]">
              <span className="material-symbols-filled text-amber-400 text-[16px]">paid</span>
            </div>
            <span className="text-xs sm:text-sm text-slate-200 font-bold tracking-wide">
              الرصيد الحالي
            </span>
          </div>

          {/* Large Metallic Gold Balance Display */}
          <div
            dir="ltr"
            className="text-right text-4xl sm:text-[44px] font-black font-['JetBrains_Mono',monospace] tabular-nums tracking-tight leading-none py-1 gold-gradient-text"
          >
            {formatMoney(challenge.currentBalanceCents)}
          </div>
        </div>

        {/* Subtle Glowing Divider */}
        <div className="relative z-10 my-4 h-[1px] w-full bg-gradient-to-r from-amber-500/10 via-slate-700/80 to-amber-500/35" />

        {/* Progress Bar Section */}
        <div className="relative z-10 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold">
              الهدف:{' '}
              <span
                dir="ltr"
                className="font-['JetBrains_Mono',monospace] tabular-nums font-black text-white"
              >
                {formatMoney(challenge.targetBalanceCents)}
              </span>
            </span>

            <span
              dir="ltr"
              className="font-['JetBrains_Mono',monospace] tabular-nums text-sm sm:text-base font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.55)]"
            >
              {progressPercent.toFixed(2)}%
            </span>
          </div>

          {/* 3D Luminous Animated Progress Bar */}
          <div
            dir="ltr"
            className="relative w-full h-4 bg-[#050912] border border-slate-800/90 rounded-full overflow-hidden p-[2px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.95)]"
          >
            <div
              className="relative h-full rounded-full transition-all duration-700 ease-out overflow-hidden"
              style={{
                width: `${visualProgressWidth}%`,
                background:
                  'linear-gradient(90deg, #059669 0%, #10b981 45%, #34d399 80%, #fbbf24 100%)',
                boxShadow:
                  '0 0 16px rgba(16, 185, 129, 0.65), inset 0 2px 2px rgba(255, 255, 255, 0.45), inset 0 -2px 2px rgba(0, 0, 0, 0.35)',
              }}
            >
              {/* 3D Top Specular Highlight */}
              <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/35 to-transparent rounded-t-full" />

              {/* Animated Shimmer Sweep */}
              <div
                className="absolute inset-0 w-full h-full progress-shimmer-bar"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
                }}
              />

              {/* Glowing Leading Tip Orb */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white blur-[2px] opacity-90" />
            </div>
          </div>

          {/* Bottom Min/Max Labels */}
          <div className="flex items-center justify-between text-[11px] text-slate-300 font-['JetBrains_Mono',monospace] tabular-nums font-semibold pt-0.5">
            <span dir="ltr">{formatMoney(challenge.initialCapitalCents)}</span>
            <span dir="ltr">{formatMoney(challenge.targetBalanceCents)}</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2x2 LUXURY INFO CARDS GRID (بطاقات المعلومات)                          */}
      {/* ===================================================================== */}
      <div className="relative z-10 grid grid-cols-2 gap-3">
        {/* Card 1: Initial Capital (رأس المال الابتدائي) */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#11192b]/95 to-[#0b111e]/95 border border-amber-500/20 hover:border-amber-500/45 p-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.5)] transition-all duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-slate-400 font-bold block truncate">
                رأس المال الابتدائي
              </span>
              <div
                dir="ltr"
                className="text-right text-base sm:text-lg font-black text-white font-['JetBrains_Mono',monospace] tabular-nums mt-1 truncate"
              >
                {formatMoney(challenge.initialCapitalCents)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-medium">
                <span>نقطة الانطلاق</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                <span className="material-symbols-rounded text-[21px]">account_balance_wallet</span>
              </div>
              <span className="material-symbols-rounded text-[16px] text-slate-600 group-hover:text-amber-400 transition-colors">
                chevron_left
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Number of Trades (عدد الصفقات) */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#11192b]/95 to-[#0b111e]/95 border border-emerald-500/20 hover:border-emerald-500/45 p-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.5)] transition-all duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-slate-400 font-bold block truncate">
                عدد الصفقات
              </span>
              <div
                dir="ltr"
                className="text-right text-base sm:text-lg font-black text-white font-['JetBrains_Mono',monospace] tabular-nums mt-1 truncate"
              >
                {completedTradesCount} / 150
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-medium">
                <span>متبقي {remainingTrades}</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                <span className="material-symbols-rounded text-[21px]">monitoring</span>
              </div>
              <span className="material-symbols-rounded text-[16px] text-slate-600 group-hover:text-emerald-400 transition-colors">
                chevron_left
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Current Balance (الرصيد الحالي) */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#11192b]/95 to-[#0b111e]/95 border border-amber-500/20 hover:border-amber-500/45 p-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.5)] transition-all duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-slate-400 font-bold block truncate">
                الرصيد الحالي
              </span>
              <div
                dir="ltr"
                className="text-right text-base sm:text-lg font-black text-white font-['JetBrains_Mono',monospace] tabular-nums mt-1 truncate"
              >
                {formatMoney(challenge.currentBalanceCents)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-medium">
                <span>{challenge.tradeCount === 0 ? 'قبل البدء' : 'رصيد الحساب'}</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                <span className="material-symbols-rounded text-[21px]">layers</span>
              </div>
              <span className="material-symbols-rounded text-[16px] text-slate-600 group-hover:text-amber-400 transition-colors">
                chevron_left
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Final Target (الهدف النهائي) */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#11192b]/95 to-[#0b111e]/95 border border-emerald-500/20 hover:border-emerald-500/45 p-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.5)] transition-all duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-slate-400 font-bold block truncate">
                الهدف النهائي
              </span>
              <div
                dir="ltr"
                className="text-right text-base sm:text-lg font-black text-white font-['JetBrains_Mono',monospace] tabular-nums mt-1 truncate"
              >
                {formatMoney(challenge.targetBalanceCents)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-medium">
                <span>خطة النهاية</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                <span className="material-symbols-rounded text-[21px]">flag</span>
              </div>
              <span className="material-symbols-rounded text-[16px] text-slate-600 group-hover:text-emerald-400 transition-colors">
                chevron_left
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LUXURY GOLDEN ACTION BUTTONS (الأزرار)                                 */}
      {/* ===================================================================== */}
      {!challenge.challengeStarted ? (
        <div className="relative z-10 rounded-3xl bg-gradient-to-b from-[#121a2d]/95 to-[#0b101d]/95 border border-amber-500/35 p-4 text-center space-y-3 shadow-xl">
          <div className="text-xs text-amber-300 font-bold">
            الرحلة غير مفعلة حالياً. اضغط على الزر أدناه لبدء رحلة الـ 150 صفقة!
          </div>
          <button
            type="button"
            onClick={onStartChallengeClick}
            className="w-full py-4 px-5 rounded-2xl font-black text-slate-950 gold-cta-button flex items-center justify-between text-sm sm:text-base cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center shadow-md">
                <span className="material-symbols-filled text-[18px]">rocket_launch</span>
              </span>
              <span>بدء الرحلة برأس مال {formatMoney(challenge.initialCapitalCents)}</span>
            </div>
            <span className="material-symbols-rounded text-[22px] text-slate-950">
              chevron_left
            </span>
          </button>
        </div>
      ) : (
        <div className="relative z-10 space-y-2.5 pt-0.5">
          {completedTradesCount < 150 ? (
            <button
              type="button"
              onClick={onOpenAddTrade}
              className="w-full py-3.5 px-4 rounded-2xl font-black text-slate-950 gold-cta-button flex items-center justify-between text-base cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center shadow-md">
                  <span className="material-symbols-rounded text-[20px] font-bold">add</span>
                </span>
                <span>إضافة صفقة جديدة (الصفقة #{challenge.tradeCount + 1})</span>
              </div>
              <span className="material-symbols-rounded text-[22px] text-slate-950 font-bold">
                chevron_left
              </span>
            </button>
          ) : (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-center text-emerald-300 font-bold text-xs shadow-lg">
              🎉 تم إكمال جميع محطات الرحلة الـ 150 بنجاح!
            </div>
          )}

          <button
            type="button"
            onClick={onNewChallengeClick}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#101829]/95 via-[#141e33]/95 to-[#101829]/95 hover:from-[#162138] hover:to-[#162138] text-slate-200 hover:text-amber-300 border border-amber-500/25 hover:border-amber-400/50 text-xs font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <span className="material-symbols-filled text-amber-400 text-[18px]">
              rocket_launch
            </span>
            <span>ابدأ رحلة جديدة (سوف يتم تجديد 150 محطة تداول)</span>
          </button>
        </div>
      )}

      {/* Subtle Bottom Trading Chart & Bull Visual Accent */}
      <div className="relative z-10 overflow-hidden rounded-2xl h-20 border border-amber-500/15 opacity-80 pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/background_image.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/40 to-[#050811]/85" />
      </div>
    </div>
  );
};
