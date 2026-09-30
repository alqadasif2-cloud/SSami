import React, { useRef, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  UserX,
  MessageCircle,
  Mail,
  LogOut,
  Camera,
  CheckCircle2,
} from 'lucide-react';
import { CurrentUser, uploadUserAvatar } from '../data/auth';
import { CloudImage } from './CloudImage';

interface ModeratorHomeScreenProps {
  currentUser: CurrentUser;
  onOpenChannels: () => void;
  onOpenPrivateChat: () => void;
  onLogout: () => void;
  onAvatarUpdated: (newUrl: string) => void;
}

export const ModeratorHomeScreen: React.FC<ModeratorHomeScreenProps> = ({
  currentUser,
  onOpenChannels,
  onOpenPrivateChat,
  onLogout,
  onAvatarUpdated,
}) => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadUserAvatar(currentUser.id, file);
      onAvatarUpdated(url);
    } catch {
      // Ignore
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-4 pb-20 text-right animate-in fade-in duration-200">
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarChange}
        accept="image/*"
        className="hidden"
      />

      {/* Moderator Header */}
      <div className="bg-[#121824]/90 backdrop-blur-md border border-emerald-500/30 rounded-3xl p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="relative cursor-pointer"
            title="تغيير الصورة الشخصية"
          >
            {currentUser.avatarUrl ? (
              <CloudImage
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="w-13 h-13 rounded-full object-cover border-2 border-emerald-400 shadow-md"
              />
            ) : (
              <div className="w-13 h-13 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 font-black text-lg">
                {currentUser.displayName.charAt(0)}
              </div>
            )}
            <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 bg-emerald-400 text-slate-950 rounded-full border-2 border-[#0b0f17] flex items-center justify-center">
              {uploadingAvatar ? (
                <span className="w-2.5 h-2.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-2.5 h-2.5" />
              )}
            </span>
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                🛡️ مشرف معتمد
              </span>
            </div>
            <h2 className="text-base font-black text-white mt-1">{currentUser.displayName}</h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>خروج</span>
        </button>
      </div>

      {/* Main Instructions Banner */}
      <div className="bg-gradient-to-b from-[#141f2c]/95 to-[#0e1520]/95 border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-amber-400">
              تعليمات ومهام المشرف الرسمية
            </h3>
            <p className="text-xs text-slate-400">
              يرجى تطبيق القواعد التالية بدقة لمتابعة التزام المشتركين داخل القنوات
            </p>
          </div>
        </div>

        {/* Instruction 1 */}
        <div className="bg-[#0b111c] border border-slate-800/90 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-sm shrink-0">
            1
          </div>
          <div className="space-y-1">
            <div className="text-sm font-black text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>التحقق من صور الصفقات</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              عند قيام المشترك بإرسال صورة للصفقة يتم التحقق من استيفائها لجميع الشروط المعتمدة في خطة التداول.
            </p>
          </div>
        </div>

        {/* Instruction 2 */}
        <div className="bg-[#0b111c] border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm shrink-0">
            2
          </div>
          <div className="space-y-1">
            <div className="text-sm font-black text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>تسجيل المخالفات والإنذارات</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              إذا لم تستوفِ الصفقة الشروط، يقوم المشرف بتسجيل مخالفة وإنذار رسمي للمشترك داخل القناة.
            </p>
          </div>
        </div>

        {/* Instruction 3 */}
        <div className="bg-[#0b111c] border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 font-black text-sm shrink-0">
            3
          </div>
          <div className="space-y-1">
            <div className="text-sm font-black text-rose-300 flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-rose-400" />
              <span>الطرد وإرسال التقرير إلى القائد Sami</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              عند وصول المشترك إلى ثلاثة إنذارات، يحق للمشرف طرده من القناة، ثم إرسال تقرير إلى Sami مرفقًا باسم المستخدم والصور والأدلة.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onOpenChannels}
          className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 font-black text-xs flex flex-col items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
        >
          <MessageCircle className="w-6 h-6" />
          <span>الدخول إلى القنوات والإشراف</span>
        </button>

        <button
          type="button"
          onClick={onOpenPrivateChat}
          className="p-4 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xs flex flex-col items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
        >
          <Mail className="w-6 h-6" />
          <span>مراسلة القائد Sami وإرسال التقارير</span>
        </button>
      </div>
    </div>
  );
};
