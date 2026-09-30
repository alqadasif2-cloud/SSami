import React, { useState, useEffect, useRef } from 'react';
import { User, Wallet, Target, Save, RefreshCw, PlusCircle, CheckCircle2, AlertCircle, LogOut, BookOpen, ChevronLeft, Camera } from 'lucide-react';
import { Challenge } from '../types';
import { formatMoney, parseCapitalToCents } from '../utils/money';
import { CurrentUser, uploadUserAvatar } from '../data/auth';
import { InstructionsScreen } from './InstructionsScreen';
import { CloudImage } from './CloudImage';

interface SettingsScreenProps {
  challenge: Challenge;
  currentUser?: CurrentUser | null;
  onLogout?: () => void;
  onSaveSettings: (userName: string, initialCapitalCents: number, targetBalanceCents: number) => void;
  onResetChallengeClick: () => void;
  onNewChallengeClick: () => void;
  onAvatarUpdated?: (newUrl: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  challenge,
  currentUser,
  onLogout,
  onSaveSettings,
  onResetChallengeClick,
  onNewChallengeClick,
  onAvatarUpdated,
}) => {
  const [userName, setUserName] = useState(challenge.userName || '');
  const [initialCapitalStr, setInitialCapitalStr] = useState(
    (challenge.initialCapitalCents / 100).toString()
  );
  const [targetBalanceStr, setTargetBalanceStr] = useState(
    (challenge.targetBalanceCents / 100).toString()
  );

  const [savedFeedback, setSavedFeedback] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentUser) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadUserAvatar(currentUser.id, file);
      onAvatarUpdated?.(url);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 3000);
    } catch {
      setErrorFeedback('تعذر تحديث الصورة الشخصية.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    setUserName(challenge.userName || '');
    setInitialCapitalStr((challenge.initialCapitalCents / 100).toString());
    setTargetBalanceStr((challenge.targetBalanceCents / 100).toString());
  }, [challenge]);

  if (showInstructions) {
    return <InstructionsScreen onBack={() => setShowInstructions(false)} />;
  }

  const quickCapitalOptions = [50, 100, 250, 500, 1000, 5000];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorFeedback(null);

    const parsedCapital = parseCapitalToCents(initialCapitalStr);
    if (!parsedCapital.valid || parsedCapital.cents === undefined) {
      setErrorFeedback('يرجى إدخال رأس مال أكبر من صفر.');
      return;
    }

    const parsedTarget = parseCapitalToCents(targetBalanceStr);
    if (!parsedTarget.valid || parsedTarget.cents === undefined) {
      setErrorFeedback('يرجى إدخال هدف أكبر من صفر.');
      return;
    }

    onSaveSettings(userName, parsedCapital.cents, parsedTarget.cents);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  return (
    <div className="space-y-5 pb-20 text-right animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="pt-1">
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">إعدادات الرحلة</h2>
        <p className="text-xs text-slate-400 mt-0.5">تخصيص البيانات وإدارة الرحلة الحالية</p>
      </div>

      {/* Official App Logo & User Profile Card */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarChange}
        accept="image/*"
        className="hidden"
      />
      <div className="p-3.5 bg-slate-900/70 border border-slate-800/80 rounded-2xl flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="relative cursor-pointer shrink-0"
            title="تغيير صورتك الشخصية"
          >
            {currentUser?.avatarUrl ? (
              <CloudImage
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow-lg"
              />
            ) : (
              <img
                src="/app-icon.png"
                alt="Sami Logo"
                className="w-14 h-14 rounded-full object-cover border-2 border-amber-500/40 shadow-lg shadow-amber-500/10"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center border-2 border-slate-900">
              {uploadingAvatar ? (
                <span className="w-2.5 h-2.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-2.5 h-2.5" />
              )}
            </span>
          </button>
          <div className="min-w-0">
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
              <span>{currentUser?.displayName || 'Sami'}</span>
              {currentUser?.role === 'owner' && (
                <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
                  👑 القائد
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              اضغط على الصورة لتغيير صورتك الشخصية في المحادثة
            </p>
            {currentUser && (
              <p className="text-[11px] text-amber-300 font-bold mt-1">
                الحساب النشط: @{currentUser.username} (#{currentUser.id})
              </p>
            )}
          </div>
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[10px]">خروج</span>
          </button>
        )}
      </div>

      {savedFeedback && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold animate-in slide-in-from-top">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>تم حفظ الإعدادات بنجاح.</span>
        </div>
      )}

      {errorFeedback && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold animate-in slide-in-from-top">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorFeedback}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="bg-[#121824] border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        {/* Trader Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <User className="w-4 h-4 text-amber-400" />
            <span>اسم المتداول</span>
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="مثال: Sami"
            className="w-full bg-[#141b2a] border border-slate-700/80 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>

        {/* Initial Capital */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span>رأس المال الابتدائي ($)</span>
            </label>
            {challenge.challengeStarted && (
              <span className="text-[10px] text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                الرحلة قيد التشغيل
              </span>
            )}
          </div>

          <input
            type="text"
            inputMode="decimal"
            value={initialCapitalStr}
            onChange={(e) => setInitialCapitalStr(e.target.value)}
            disabled={challenge.challengeStarted}
            placeholder="500"
            className="w-full bg-[#141b2a] border border-slate-700/80 rounded-xl px-4 py-2.5 text-slate-100 text-sm font-['JetBrains_Mono',monospace] focus:outline-none focus:border-amber-400 disabled:opacity-50 disabled:bg-slate-900 transition-colors"
            dir="ltr"
          />

          {/* Quick Capital Preset Chips (Disabled if challenge started) */}
          {!challenge.challengeStarted && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {quickCapitalOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setInitialCapitalStr(opt.toString())}
                  className={`py-1 px-2.5 rounded-lg text-xs font-['JetBrains_Mono',monospace] font-bold border transition-all ${
                    initialCapitalStr === opt.toString()
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-amber-400'
                  }`}
                >
                  ${opt}
                </button>
              ))}
            </div>
          )}

          {challenge.challengeStarted && (
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              لتعديل رأس المال لرحلةٍ جارية، استخدم زر <span className="text-amber-400 font-bold">"ابدأ رحلة جديدة"</span> بالأسفل.
            </p>
          )}
        </div>

        {/* Final Target */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>الهدف النهائي ($)</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={targetBalanceStr}
            onChange={(e) => setTargetBalanceStr(e.target.value)}
            placeholder="3000"
            className="w-full bg-[#141b2a] border border-slate-700/80 rounded-xl px-4 py-2.5 text-slate-100 text-sm font-['JetBrains_Mono',monospace] focus:outline-none focus:border-amber-400 transition-colors"
            dir="ltr"
          />
        </div>

        {/* Save Button */}
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2 text-sm"
        >
          <Save className="w-4 h-4" />
          <span>حفظ الإعدادات</span>
        </button>
      </form>

      {/* Instructions & Guidelines Section */}
      <div className="space-y-2.5 pt-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          دليل وقواعد الرحلة
        </h3>

        <div
          onClick={() => setShowInstructions(true)}
          className="bg-gradient-to-l from-[#151f33] to-[#121824] hover:from-[#1a2640] hover:to-[#151d2c] border border-amber-500/35 hover:border-amber-400/70 rounded-2xl p-4 cursor-pointer transition-all shadow-md active:scale-[0.99] flex items-center justify-between"
        >
          <div className="space-y-1">
            <h4 className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-2">
              <span>📖 التعليمات والإرشادات</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              دليل وقواعد رحلة التداول الكامل وجدول استراتيجية النمو المتراكم (150 صفقة).
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mr-3">
            <ChevronLeft className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Challenge Management Section */}
      <div className="space-y-3 pt-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          إدارة الرحلة والبيانات
        </h3>

        {/* Reset Challenge Card */}
        <div
          onClick={onResetChallengeClick}
          className="bg-[#121824] hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 cursor-pointer transition-all shadow-md active:scale-[0.99] flex items-center justify-between"
        >
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
              <span>إعادة الرحلة</span>
            </h4>
            <p className="text-xs text-slate-400">
              إعادة جميع المحطات إلى حالتها الأولية وحذف سجل الصفقات.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0 mr-3">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>

        {/* Start New Challenge Card */}
        <div
          onClick={onNewChallengeClick}
          className="bg-[#121824] hover:bg-slate-900 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-4 cursor-pointer transition-all shadow-md active:scale-[0.99] flex items-center justify-between"
        >
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <span>ابدأ رحلة جديدة</span>
            </h4>
            <p className="text-xs text-slate-400">
              إنشاء رحلة جديدة برأس مال مختلف وإعادة ضبط الـ 150 محطة.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mr-3">
            <PlusCircle className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};
