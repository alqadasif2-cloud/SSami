import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Image as ImageIcon,
  Camera,
  WifiOff,
  Clock,
  X,
  Maximize2,
  Users,
  AlertCircle,
  Lock,
  ArrowRight,
  Mail,
  AlertTriangle,
  UserX,
  ShieldAlert,
} from 'lucide-react';
import {
  CommunityChannel,
  ChatMessage,
  PrivateMessage,
  subscribeToChannels,
  subscribeToChannelMessages,
  sendChannelMessage,
  subscribeToPrivateMessages,
  sendPrivateMessage,
  issueWarningToMember,
  kickMemberFromChannelAndReport,
  getUserNameColor,
} from '../data/chat';
import {
  CurrentUser,
  UserAccount,
  subscribeToCommunityUsers,
  saveVerifiedChannelPassword,
  uploadUserAvatar,
} from '../data/auth';
import { processImageFile } from '../utils/image';
import { CloudImage } from './CloudImage';
import { ImageViewerModal } from './ImageViewerModal';

interface GroupChatScreenProps {
  currentUser: CurrentUser;
  initialMode?: 'channels' | 'private_chat';
  onUserUpdated?: (updated: Partial<CurrentUser>) => void;
}

export const GroupChatScreen: React.FC<GroupChatScreenProps> = ({
  currentUser,
  initialMode = 'channels',
  onUserUpdated,
}) => {
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<CommunityChannel | null>(null);
  const [isPrivateChatOpen, setIsPrivateChatOpen] = useState(initialMode === 'private_chat');
  const [ownerSelectedPmUserId, setOwnerSelectedPmUserId] = useState<number | null>(null);

  // Password Prompt Modal for first-time channel entry
  const [pendingPasswordChannel, setPendingPasswordChannel] = useState<CommunityChannel | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Moderator / Owner Member Supervision Modal inside Channel
  const [supervisionModalOpen, setSupervisionModalOpen] = useState(false);
  const [actionTargetUser, setActionTargetUser] = useState<UserAccount | null>(null);
  const [actionType, setActionType] = useState<'warning' | 'kick'>('warning');
  const [actionReason, setActionReason] = useState('');
  const [actionEvidenceFile, setActionEvidenceFile] = useState<File | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  // Messages state
  const [channelMessages, setChannelMessages] = useState<ChatMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSending, setIsSending] = useState(false);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsPrivateChatOpen(initialMode === 'private_chat');
  }, [initialMode]);

  const showBannerError = (msg: string) => {
    setAlertBanner(msg);
    setTimeout(() => {
      setAlertBanner((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to Channels and Users
  useEffect(() => {
    const unsubChannels = subscribeToChannels((liveChannels) => {
      setChannels(liveChannels);
      setSelectedChannel((prev) => {
        if (!prev) return null;
        const updated = liveChannels.find((c) => c.id === prev.id);
        if (!updated) return null;
        return updated;
      });
    });
    const unsubUsers = subscribeToCommunityUsers(setUsers);
    return () => {
      unsubChannels();
      unsubUsers();
    };
  }, [currentUser.id, currentUser.role]);

  const liveCurrentUserDoc = users.find((u) => u.id === currentUser.id);
  const currentAvatarUrl = liveCurrentUserDoc?.avatarUrl ?? currentUser.avatarUrl;
  const currentVerifiedMap =
    liveCurrentUserDoc?.verifiedChannels ?? currentUser.verifiedChannels ?? {};

  // If Owner Sami changes the password of an currently open channel or revokes verification, close it and prompt for new password
  useEffect(() => {
    if (!selectedChannel) return;
    if (currentUser.role === 'owner' || currentUser.id === 1) return;
    if (
      selectedChannel.password &&
      currentVerifiedMap[selectedChannel.id] !== selectedChannel.password
    ) {
      const chToPrompt = selectedChannel;
      setSelectedChannel(null);
      setPendingPasswordChannel(chToPrompt);
      setPasswordInput('');
      setPasswordError('تم تحديث كلمة مرور القناة، يرجى إدخال كلمة المرور الجديدة للدخول.');
    }
  }, [selectedChannel, currentVerifiedMap, currentUser.role, currentUser.id]);

  // Subscribe to active channel messages (ONLY after password verification and channel open)
  useEffect(() => {
    if (!selectedChannel) {
      setChannelMessages([]);
      return;
    }
    const unsub = subscribeToChannelMessages(
      selectedChannel.id,
      setChannelMessages,
      showBannerError
    );
    return () => unsub();
  }, [selectedChannel]);

  // Subscribe to permanent private messages with Sami
  useEffect(() => {
    if (!isPrivateChatOpen) return;
    const participantId =
      currentUser.id === 1 ? ownerSelectedPmUserId : currentUser.id;
    const unsub = subscribeToPrivateMessages(participantId, setPrivateMessages);
    return () => unsub();
  }, [isPrivateChatOpen, currentUser.id, ownerSelectedPmUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages, privateMessages]);

  // All channels created by Sami are visible to all users (filtered only by search query)
  const visibleChannels = channels.filter(
    (ch) =>
      !searchQuery.trim() ||
      ch.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Enter Channel Handler (checks independent channel password on first entry or if Sami changed it)
  const handleChannelClick = (ch: CommunityChannel) => {
    if (currentUser.role === 'owner' || currentUser.id === 1 || !ch.password) {
      setSelectedChannel(ch);
      return;
    }
    const verifiedWith = currentVerifiedMap[ch.id];
    if (verifiedWith === ch.password) {
      setSelectedChannel(ch);
    } else {
      setPendingPasswordChannel(ch);
      setPasswordInput('');
      setPasswordError(null);
    }
  };

  const handleVerifyChannelPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPasswordChannel) return;
    if (passwordInput.trim() === pendingPasswordChannel.password) {
      const updatedMap = await saveVerifiedChannelPassword(
        currentUser.id,
        pendingPasswordChannel.id,
        pendingPasswordChannel.password,
        currentVerifiedMap,
        pendingPasswordChannel.memberIds
      );
      onUserUpdated?.({ verifiedChannels: updatedMap });
      const target = pendingPasswordChannel;
      setPendingPasswordChannel(null);
      setPasswordInput('');
      setPasswordError(null);
      setSelectedChannel(target);
    } else {
      setPasswordError('كلمة مرور القناة غير صحيحة، يرجى المحاولة مرة أخرى.');
    }
  };

  // Profile Avatar Upload Handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const newUrl = await uploadUserAvatar(currentUser.id, file);
      onUserUpdated?.({ avatarUrl: newUrl });
    } catch {
      showBannerError('تعذر تحديث الصورة الشخصية.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle attachment image selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      showBannerError('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 15 ميغابايت.');
      return;
    }
    try {
      const compressedDataUrl = await processImageFile(file, 1920, 0.9);
      setSelectedImage(compressedDataUrl);
      setSelectedFile(file);
      setAlertBanner(null);
    } catch {
      showBannerError('تعذر معالجة الصورة المختارة.');
    }
  };

  // Send Channel or Private Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isOnline) {
      showBannerError('لا يوجد اتصال بالإنترنت.');
      return;
    }
    const trimmed = inputText.trim();
    if (!trimmed && !selectedImage) return;

    setIsSending(true);
    setAlertBanner(null);
    try {
      if (isPrivateChatOpen) {
        const targetParticipantId =
          currentUser.id === 1 ? ownerSelectedPmUserId : currentUser.id;
        if (!targetParticipantId) return;
        const targetUserObj = users.find((u) => u.id === targetParticipantId);
        await sendPrivateMessage({
          participantId: targetParticipantId,
          participantName: targetUserObj?.displayName || currentUser.displayName,
          sender: {
            id: currentUser.id,
            displayName: currentUser.displayName,
            role: currentUser.role,
            avatarUrl: currentAvatarUrl,
          },
          receiverId: currentUser.id === 1 ? targetParticipantId : 1,
          text: trimmed || undefined,
          imageFileOrDataUrl: selectedFile || selectedImage,
        });
      } else if (selectedChannel) {
        await sendChannelMessage(
          selectedChannel,
          {
            id: currentUser.id,
            displayName: currentUser.displayName,
            role: currentUser.role,
            avatarUrl: currentAvatarUrl,
          },
          {
            text: trimmed || undefined,
            imageUrl: selectedImage || undefined,
            imageFile: selectedFile || undefined,
          }
        );
      }
      setInputText('');
      setSelectedImage(null);
      setSelectedFile(null);
    } catch {
      showBannerError('تعذر إرسال الرسالة، يرجى التحقق من اتصال الإنترنت.');
    } finally {
      setIsSending(false);
    }
  };

  // Execute Moderator / Owner Warning or Kick
  const handleExecuteSupervisionAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel || !actionTargetUser || !actionReason.trim()) return;
    setIsExecutingAction(true);
    try {
      if (actionType === 'warning') {
        await issueWarningToMember({
          channel: selectedChannel,
          targetUser: actionTargetUser,
          issuer: {
            id: currentUser.id,
            displayName: currentUser.displayName,
            role: currentUser.role,
            avatarUrl: currentAvatarUrl,
          },
          reason: actionReason.trim(),
          evidenceFileOrDataUrl: actionEvidenceFile,
        });
      } else {
        await kickMemberFromChannelAndReport({
          channel: selectedChannel,
          targetUser: actionTargetUser,
          issuer: {
            id: currentUser.id,
            displayName: currentUser.displayName,
            role: currentUser.role,
            avatarUrl: currentAvatarUrl,
          },
          reason: actionReason.trim(),
          evidenceFileOrDataUrl: actionEvidenceFile,
        });
      }
      setActionTargetUser(null);
      setActionReason('');
      setActionEvidenceFile(null);
      setSupervisionModalOpen(false);
    } catch {
      showBannerError('تعذر تنفيذ الإجراء، حاول مرة أخرى.');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Helper to resolve latest user info (avatar & role)
  const getSenderMeta = (senderId: number, fallbackRole?: string, fallbackAvatar?: string | null) => {
    const found = users.find((u) => u.id === senderId);
    const role =
      senderId === 1
        ? 'owner'
        : found?.role || (fallbackRole === 'moderator' ? 'moderator' : 'user');
    const avatarUrl = found?.avatarUrl || fallbackAvatar || null;
    const warningsCount = found?.warningsCount || 0;
    return { role, avatarUrl, warningsCount };
  };

  // ============================================================================
  // VIEW 1: CHANNELS DIRECTORY LIST (when no channel or private chat is open)
  // ============================================================================
  if (!selectedChannel && !isPrivateChatOpen) {
    const isOwnerUser = currentUser.role === 'owner' || currentUser.id === 1;

    return (
      <div
        dir="rtl"
        className="relative space-y-3.5 pb-24 text-right animate-in fade-in duration-300 font-['Cairo'] select-none"
      >
        <input
          type="file"
          ref={avatarInputRef}
          onChange={handleAvatarUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Ambient Financial Glow */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 opacity-25">
          <div className="absolute -top-20 right-10 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-24 -left-16 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl" />
        </div>

        {/* Top Luxury Header Card: User Profile + Private Chat Pill */}
        <div className="relative z-10 overflow-hidden rounded-3xl bg-gradient-to-l from-[#141d33]/95 via-[#0d1424]/98 to-[#0a101d]/95 border border-amber-500/35 p-3.5 flex items-center justify-between shadow-[0_10px_28px_rgba(0,0,0,0.7),0_0_18px_rgba(245,158,11,0.12)]">
          {/* Subtle diagonal golden light streak */}
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              background:
                'linear-gradient(125deg, transparent 30%, rgba(251, 191, 36, 0.16) 50%, transparent 70%)',
            }}
          />

          {/* Right side (RTL): Circular Golden Avatar + User Name & Crown */}
          <div className="relative z-10 flex items-center gap-3">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="relative cursor-pointer active:scale-95 transition-transform"
              title="تغيير صورتك الشخصية"
            >
              <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 shadow-[0_0_18px_rgba(245,158,11,0.45)]">
                {currentAvatarUrl ? (
                  <CloudImage
                    src={currentAvatarUrl}
                    alt={currentUser.displayName}
                    className="w-full h-full rounded-full object-cover bg-[#080d1a]"
                  />
                ) : (
                  <img
                    src="/app-icon.png"
                    alt={currentUser.displayName}
                    className="w-full h-full rounded-full object-cover bg-[#080d1a]"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 flex items-center justify-center border-2 border-[#0d1424] shadow-md">
                {uploadingAvatar ? (
                  <span className="w-2.5 h-2.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-filled text-[12px] text-slate-950">
                    {isOwnerUser ? 'crown' : 'photo_camera'}
                  </span>
                )}
              </span>
            </button>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black gold-gradient-text tracking-wide">
                  {currentUser.displayName}
                </span>
                {isOwnerUser ? (
                  <span className="material-symbols-filled text-amber-400 text-[20px] drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                    crown
                  </span>
                ) : currentUser.role === 'moderator' ? (
                  <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 rounded-md">
                    🛡️ مشرف
                  </span>
                ) : null}
              </div>
              <span className="text-[10.5px] text-slate-400 font-medium block">
                {isOwnerUser ? 'القائد والمالك العام' : 'اضغط على الصورة لتحديثها'}
              </span>
            </div>
          </div>

          {/* Left side (RTL): Golden-Bordered Private Chat Button */}
          <button
            type="button"
            onClick={() => setIsPrivateChatOpen(true)}
            className="relative z-10 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#241a08]/90 via-[#1a1307]/95 to-[#241a08]/90 hover:from-[#30220a] hover:to-[#30220a] border border-amber-400/65 text-amber-300 font-extrabold text-xs flex items-center gap-2 shadow-[0_0_16px_rgba(245,158,11,0.22)] active:scale-95 transition cursor-pointer"
          >
            <span>{currentUser.id === 1 ? 'الرسائل الخاصة' : 'محادثة خاصة'}</span>
            <span className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-400">
              <span className="material-symbols-filled text-[15px]">chat</span>
            </span>
          </button>
        </div>

        {/* Section Title: القنوات */}
        <div className="relative z-10 flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-filled text-[28px] text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.55)]">
              groups
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              القنوات
            </h2>
          </div>
          <span className="text-[11px] font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-full">
            {visibleChannels.length} قناة
          </span>
        </div>

        {/* Modern Search Box (مربع البحث) */}
        <div className="relative z-10">
          <div className="flex items-center justify-between bg-[#0c1322]/95 border border-slate-700/80 focus-within:border-amber-400/80 focus-within:shadow-[0_0_20px_rgba(245,158,11,0.22)] rounded-2xl px-4 py-2.5 transition-all duration-200 shadow-inner">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن قناة..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 outline-none font-medium text-right"
            />
            <div className="flex items-center gap-1.5 mr-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-amber-400 transition cursor-pointer flex items-center"
                >
                  <span className="material-symbols-rounded text-[18px]">close</span>
                </button>
              )}
              <span className="material-symbols-rounded text-[20px] text-slate-400">
                search
              </span>
            </div>
          </div>
        </div>

        {/* Luxury Channels Cards List */}
        {visibleChannels.length === 0 ? (
          <div className="relative z-10 luxury-channel-card rounded-3xl p-8 text-center space-y-2">
            <span className="material-symbols-filled text-amber-400 text-[34px]">
              lock
            </span>
            <p className="text-sm font-bold text-slate-200">
              {searchQuery.trim()
                ? 'لا توجد قنوات مطابقة لبحثك'
                : 'لا توجد قنوات متاحة حالياً'}
            </p>
            <p className="text-xs text-slate-400">
              {searchQuery.trim()
                ? 'جرب البحث بكلمة أخرى.'
                : 'يمكنك التواصل مع القائد Sami عبر البطاقة السفلية.'}
            </p>
          </div>
        ) : (
          <div className="relative z-10 space-y-3">
            {visibleChannels.map((ch, idx) => {
              const isVerified =
                isOwnerUser ||
                !ch.password ||
                currentVerifiedMap[ch.id] === ch.password;

              const isFeaturedFirst = idx === 0;

              return (
                <div
                  key={ch.id}
                  onClick={() => handleChannelClick(ch)}
                  className={`${
                    isFeaturedFirst ? 'luxury-channel-card-featured' : 'luxury-channel-card'
                  } relative overflow-hidden rounded-3xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none group`}
                >
                  {/* Subtle Golden Top-Right Highlight on Card */}
                  <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 bg-amber-400/10 rounded-full blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />

                  {/* Right Side (RTL): Circular Gold-Framed Channel Avatar + Details */}
                  <div className="relative z-10 flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Circular Channel Image inside Golden Ring */}
                    <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 shadow-[0_4px_16px_rgba(245,158,11,0.35)] shrink-0">
                      {ch.imageUrl ? (
                        <CloudImage
                          src={ch.imageUrl}
                          alt={ch.name}
                          className="w-full h-full rounded-full object-cover bg-[#070b14]"
                        />
                      ) : (
                        <div
                          className="w-full h-full rounded-full bg-cover bg-center relative overflow-hidden flex items-center justify-center"
                          style={{ backgroundImage: "url('/background_image.jpg')" }}
                        >
                          <div className="absolute inset-0 bg-slate-950/45" />
                          <span className="relative z-10 material-symbols-filled text-amber-400 text-[26px] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                            candlestick_chart
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Channel Name, Member Count, and Active Badge */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate group-hover:text-amber-200 transition-colors">
                        {ch.name}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
                        <span className="material-symbols-rounded text-[16px] text-slate-400">
                          groups
                        </span>
                        <span>{ch.memberIds.length} عضو</span>
                      </div>

                      <div className="pt-0.5 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/45 text-emerald-400 text-[11px] font-extrabold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>نشطة</span>
                        </span>

                        {isVerified && !isOwnerUser && (
                          <span className="text-[10px] font-bold text-amber-300/90 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full">
                            تم التحقق ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Left Side (RTL): Golden Lock Icon + Entry Chevron */}
                  <div className="relative z-10 flex items-center gap-2 shrink-0 mr-2">
                    <span
                      className="material-symbols-filled text-[22px] text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]"
                      title={
                        isVerified
                          ? 'تم التحقق من كلمة المرور'
                          : 'محمية بكلمة مرور القناة'
                      }
                    >
                      lock
                    </span>
                    <span className="material-symbols-rounded text-[22px] text-slate-400 group-hover:text-amber-300 group-hover:-translate-x-0.5 transition-all">
                      chevron_left
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Featured Luxury Golden Card (البطاقة السفلية الفاخرة) */}
        <div
          onClick={() => setIsPrivateChatOpen(true)}
          className="relative z-10 overflow-hidden rounded-3xl bg-gradient-to-r from-[#2b1d06]/95 via-[#181209]/98 to-[#2b1d06]/95 border-2 border-amber-400/75 p-4 flex items-center justify-between cursor-pointer shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_24px_rgba(245,158,11,0.25)] active:scale-[0.99] transition-all group"
        >
          {/* Golden wave glow overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(circle at 85% 50%, rgba(251, 191, 36, 0.28), transparent 60%), radial-gradient(circle at 15% 50%, rgba(245, 158, 11, 0.22), transparent 60%)',
            }}
          />

          <div className="relative z-10 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-[0_0_18px_rgba(251,191,36,0.55)] shrink-0">
              <span className="material-symbols-filled text-[24px] text-slate-950">
                chat
              </span>
            </div>
            <div>
              <h3 className="text-base font-black text-white group-hover:text-amber-200 transition-colors">
                {currentUser.id === 1 ? 'صندوق الرسائل الخاصة' : 'مراسلة Sami'}
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                محادثة خاصة ومستمرة
              </p>
            </div>
          </div>

          <div className="relative z-10 w-10 h-10 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-[0_0_14px_rgba(251,191,36,0.5)] group-hover:scale-105 transition-transform shrink-0">
            <span className="material-symbols-rounded text-[22px] font-bold text-slate-950">
              chevron_left
            </span>
          </div>
        </div>

        {/* Channel Password Prompt Modal (نافذة التحقق من كلمة مرور القناة) */}
        {pendingPasswordChannel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <form
              onSubmit={handleVerifyChannelPassword}
              className="relative overflow-hidden bg-gradient-to-b from-[#141d33] to-[#0a0f1d] border-2 border-amber-400/60 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-[0_15px_40px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.25)]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] shrink-0">
                  <span className="material-symbols-filled text-[24px]">lock</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {pendingPasswordChannel.name}
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                    هذه القناة محمية • أدخل كلمة المرور للدخول
                  </p>
                </div>
              </div>

              {passwordError && (
                <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/45 text-rose-200 text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-filled text-[18px] text-rose-400 shrink-0">
                    error
                  </span>
                  <span>{passwordError}</span>
                </div>
              )}

              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="أدخل كلمة مرور القناة..."
                required
                autoFocus
                className="w-full bg-[#070b14] border border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 outline-none shadow-inner transition"
              />

              <div className="flex gap-2.5 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-2xl gold-cta-button text-slate-950 font-black text-xs sm:text-sm cursor-pointer"
                >
                  فتح القناة والدخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingPasswordChannel(null);
                    setPasswordError(null);
                  }}
                  className="px-5 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: PERMANENT PRIVATE CHAT WITH SAMI
  // ============================================================================
  if (isPrivateChatOpen) {
    // If Owner Sami hasn't picked a user thread yet, show user selector
    if (currentUser.id === 1 && !ownerSelectedPmUserId) {
      const threadsMap = new Map<number, { userId: number; name: string; lastText: string }>();
      privateMessages.forEach((pm) => {
        threadsMap.set(pm.participantId, {
          userId: pm.participantId,
          name: pm.participantName,
          lastText: pm.text || '📷 صورة مرفقة',
        });
      });

      return (
        <div dir="rtl" className="space-y-4 pb-24 text-right font-['Cairo']">
          <div className="bg-[#121824] border border-slate-800 rounded-3xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white">صندوق الرسائل الخاصة مع القائد Sami</h3>
              <p className="text-xs text-slate-400">اختر مشتركاً أو مشرفاً لعرض المحادثة الدائمة</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivateChatOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>رجوع للقنوات</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {users
              .filter((u) => u.id !== 1)
              .map((u) => {
                const threadInfo = threadsMap.get(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => setOwnerSelectedPmUserId(u.id)}
                    className="bg-[#121824] hover:bg-[#162032] border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {u.avatarUrl ? (
                        <CloudImage
                          src={u.avatarUrl}
                          alt={u.displayName}
                          className="w-10 h-10 rounded-full object-cover border border-amber-400/50"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-sm"
                          style={{ color: getUserNameColor(u.id) }}
                        >
                          {u.displayName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <span
                          style={{ color: getUserNameColor(u.id) }}
                          className="text-sm font-black"
                        >
                          {u.displayName} {u.role === 'moderator' ? '🛡️ مشرف' : ''}
                        </span>
                        <p className="text-xs text-slate-400">
                          {threadInfo?.lastText || 'اضغط لبدء محادثة خاصة دائمة'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-amber-400 rotate-180" />
                  </div>
                );
              })}
          </div>
        </div>
      );
    }

    const activePartnerUser =
      currentUser.id === 1
        ? users.find((u) => u.id === ownerSelectedPmUserId)
        : users.find((u) => u.id === 1);

    return (
      <div className="flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-170px)] bg-[#0b101a]/95 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl relative font-['Cairo'] pb-1">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {/* Private Chat Header */}
        <div
          dir="rtl"
          className="px-4 py-3 bg-[#0e1626] border-b border-slate-800/90 flex items-center justify-between shadow-md shrink-0"
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (currentUser.id === 1 && ownerSelectedPmUserId) {
                  setOwnerSelectedPmUserId(null);
                } else {
                  setIsPrivateChatOpen(false);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>رجوع</span>
            </button>
            <div>
              <h2 className="text-sm font-black text-amber-400">
                {currentUser.id === 1
                  ? `محادثة خاصة مع ${activePartnerUser?.displayName || 'مشترك'}`
                  : '👑 محادثة خاصة مع القائد Sami'}
              </h2>
              <p className="text-[10px] text-emerald-400">
                محادثة دائمة محفوظة بالكامل • لا تُحذف بعد 48 ساعة
              </p>
            </div>
          </div>
        </div>

        {/* Private Messages List */}
        <div dir="rtl" className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {privateMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
              <div className="text-2xl">👑</div>
              <p className="text-sm font-bold">ابدأ المحادثة الخاصة مع القائد Sami</p>
              <p className="text-xs text-slate-500 max-w-xs">
                جميع الرسائل والصور في هذه المحادثة دائمة ومحفوظة سحابياً للرجوع إليها في أي وقت.
              </p>
            </div>
          ) : (
            privateMessages.map((pm) => {
              const isMe = pm.senderId === currentUser.id;
              const isOwnerMsg = pm.senderId === 1;
              const meta = getSenderMeta(pm.senderId, pm.senderRole, pm.senderAvatarUrl);

              return (
                <div
                  key={pm.id}
                  className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 shadow-md ${
                      isOwnerMsg
                        ? 'bg-gradient-to-br from-amber-500/30 via-amber-600/20 to-[#1c1608] border-2 border-amber-400/80 text-white'
                        : pm.isReport
                        ? 'bg-rose-950/60 border border-rose-500/60 text-white'
                        : 'bg-[#151f33] border border-slate-800 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2.5 mb-1.5">
                      <div className="flex items-center gap-2">
                        {meta.avatarUrl ? (
                          <CloudImage
                            src={meta.avatarUrl}
                            alt={pm.senderName}
                            className="w-6 h-6 rounded-full object-cover border border-amber-400/60"
                          />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-black"
                            style={{ color: getUserNameColor(pm.senderId) }}
                          >
                            {pm.senderName.charAt(0)}
                          </div>
                        )}
                        <span
                          style={{ color: getUserNameColor(pm.senderId) }}
                          className="text-[11px] font-black"
                        >
                          {pm.senderName}
                        </span>
                        {isOwnerMsg && (
                          <span className="text-[10px] font-black text-amber-300">
                            👑 القائد
                          </span>
                        )}
                        {meta.role === 'moderator' && (
                          <span className="text-[10px] font-black text-emerald-300">
                            🛡️ مشرف
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatMessageTime(pm.timestamp)}
                      </span>
                    </div>

                    {pm.imageUrl && (
                      <div
                        onClick={() => setPreviewModalImage(pm.imageUrl || null)}
                        className="relative my-1.5 rounded-xl overflow-hidden cursor-pointer border border-slate-700/60 bg-black/40"
                      >
                        <CloudImage
                          src={pm.imageUrl}
                          alt="مرفق"
                          className="max-h-60 w-auto object-contain mx-auto"
                        />
                      </div>
                    )}

                    {pm.text && (
                      <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap">
                        {pm.text}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Selected Image Preview */}
        {selectedImage && (
          <div
            dir="rtl"
            className="px-4 py-2 bg-[#121c2e] border-t border-slate-800 flex items-center justify-between shrink-0"
          >
            <div className="flex items-center gap-2">
              <img
                src={selectedImage}
                alt="صورة جاهزة"
                className="w-10 h-10 rounded-lg object-cover border border-amber-500/50"
              />
              <span className="text-xs text-amber-300 font-bold">صورة جاهزة للإرسال</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedImage(null);
                setSelectedFile(null);
              }}
              className="p-1 text-slate-400 hover:text-rose-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Form */}
        <form
          onSubmit={handleSendMessage}
          dir="rtl"
          className="p-3 bg-[#0d1524] border-t border-slate-800/90 flex items-center gap-2 shrink-0"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-slate-800 text-amber-400 cursor-pointer"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-slate-800 text-amber-400 cursor-pointer"
          >
            <Camera className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="اكتب رسالتك الخاصة إلى Sami..."
            className="flex-1 bg-[#131d30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={isSending || (!inputText.trim() && !selectedImage)}
            className="p-2.5 sm:px-4 rounded-xl font-bold text-xs bg-amber-400 text-slate-950 flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <span>إرسال</span>
            <Send className="w-4 h-4 rotate-180" />
          </button>
        </form>

        <ImageViewerModal
          imageUrl={previewModalImage}
          title="عرض الصورة"
          onClose={() => setPreviewModalImage(null)}
        />
      </div>
    );
  }

  // ============================================================================
  // VIEW 3: ACTIVE CHANNEL CHAT SCREEN
  // ============================================================================
  const canModerate = currentUser.role === 'owner' || currentUser.role === 'moderator';
  const channelMembers = users.filter((u) => selectedChannel?.memberIds.includes(u.id));

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-170px)] bg-[#0b101a]/95 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl relative font-['Cairo'] pb-1">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Channel Header with Clear Back Button */}
      <div
        dir="rtl"
        className="px-3.5 py-3 bg-[#0e1626] border-b border-slate-800/90 flex items-center justify-between shadow-md shrink-0"
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedChannel(null)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 border border-slate-700 transition cursor-pointer"
            title="العودة إلى قائمة القنوات"
          >
            <ArrowRight className="w-4 h-4" />
            <span>رجوع</span>
          </button>

          {selectedChannel?.imageUrl ? (
            <CloudImage
              src={selectedChannel.imageUrl}
              alt={selectedChannel.name}
              className="w-10 h-10 rounded-2xl object-cover border border-amber-400/50"
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black">
              💬
            </div>
          )}

          <div>
            <h2 className="text-sm font-black text-white tracking-wide">
              {selectedChannel?.name}
            </h2>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3 text-amber-400" />
              <span>{selectedChannel?.memberIds.length || 0} عضواً • حذف تلقائي بعد 48 ساعة</span>
            </p>
          </div>
        </div>

        {/* Moderator / Owner Supervision Button */}
        {canModerate && (
          <button
            type="button"
            onClick={() => setSupervisionModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>الأعضاء والإنذارات</span>
          </button>
        )}
      </div>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div
          dir="rtl"
          className="bg-rose-500/20 border-b border-rose-500/40 px-4 py-2 flex items-center justify-center gap-2 text-rose-300 text-xs font-bold shrink-0"
        >
          <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
          <span>لا يوجد اتصال بالإنترنت.</span>
        </div>
      )}

      {/* In-App Notification Banner */}
      {alertBanner && (
        <div
          dir="rtl"
          className="bg-rose-500/20 border-b border-rose-500/40 px-4 py-2 flex items-center justify-between gap-2 text-rose-200 text-xs font-bold shrink-0"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{alertBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertBanner(null)}
            className="p-0.5 text-rose-300 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        dir="rtl"
        className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800"
      >
        {channelMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-amber-400 text-xl">
              💬
            </div>
            <p className="text-sm font-bold text-slate-400">لا توجد رسائل في هذه القناة بعد</p>
            <p className="text-xs text-slate-500 max-w-xs">
              كن أول من يبدأ المحادثة في قناة {selectedChannel?.name}!
            </p>
          </div>
        ) : (
          channelMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const meta = getSenderMeta(msg.senderId, msg.senderRole, msg.senderAvatarUrl);
            const isOwnerMsg = meta.role === 'owner' || msg.senderId === 1;
            const isModeratorMsg = meta.role === 'moderator' && !isOwnerMsg;

            // Role-distinct bubble styling
            const bubbleStyleClass = isOwnerMsg
              ? 'bg-gradient-to-br from-amber-500/35 via-amber-600/20 to-[#1f1705] border-2 border-amber-400 text-white shadow-lg shadow-amber-500/15'
              : isModeratorMsg
              ? 'bg-gradient-to-br from-emerald-900/45 via-teal-900/30 to-[#0f2228] border border-emerald-400/60 text-slate-100 shadow-md'
              : isMe
              ? 'bg-[#1b273d] border border-slate-700 text-slate-100'
              : 'bg-[#151f33] border border-slate-800/90 text-slate-200';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-start' : 'items-end'} animate-in fade-in duration-200`}
              >
                <div className={`max-w-[85%] sm:max-w-[72%] rounded-2xl p-3 relative ${bubbleStyleClass}`}>
                  {/* Sender Avatar + Name + Role Badge + Timestamp */}
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2">
                      {meta.avatarUrl ? (
                        <CloudImage
                          src={meta.avatarUrl}
                          alt={msg.senderName}
                          className={`w-6 h-6 rounded-full object-cover border ${
                            isOwnerMsg
                              ? 'border-amber-400'
                              : isModeratorMsg
                              ? 'border-emerald-400'
                              : 'border-slate-600'
                          }`}
                        />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-black shrink-0"
                          style={{ color: getUserNameColor(msg.senderId) }}
                        >
                          {msg.senderName.charAt(0)}
                        </div>
                      )}

                      <span
                        style={{ color: getUserNameColor(msg.senderId) }}
                        className="text-[11px] font-black tracking-tight"
                      >
                        {msg.senderName} {isMe && '(أنت)'}
                      </span>

                      {isOwnerMsg && (
                        <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 border border-amber-400/50 px-1.5 py-0.5 rounded">
                          👑 القائد
                        </span>
                      )}

                      {isModeratorMsg && (
                        <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 border border-emerald-400/50 px-1.5 py-0.5 rounded">
                          🛡️ مشرف
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatMessageTime(msg.timestamp)}
                    </span>
                  </div>

                  {/* Attached Image */}
                  {msg.imageUrl && (
                    <div className="relative my-1.5 rounded-xl overflow-hidden group cursor-pointer border border-slate-700/60 bg-black/40">
                      <CloudImage
                        src={msg.imageUrl}
                        alt="مرفق الدردشة"
                        className="max-h-60 w-auto rounded-xl object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.02]"
                        onClick={() => setPreviewModalImage(msg.imageUrl || null)}
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewModalImage(msg.imageUrl || null)}
                        className="absolute bottom-2 left-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm opacity-90 transition"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Text Message */}
                  {msg.text && (
                    <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap select-text">
                      {msg.text}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected Image Pending Preview Banner */}
      {selectedImage && (
        <div
          dir="rtl"
          className="px-4 py-2 bg-[#121c2e] border-t border-slate-800 flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-2">
            <img
              src={selectedImage}
              alt="صورة قيد الإرسال"
              className="w-10 h-10 rounded-lg object-cover border border-amber-500/50"
            />
            <span className="text-xs text-amber-300 font-bold">صورة جاهزة للإرسال</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedImage(null);
              setSelectedFile(null);
            }}
            className="p-1 rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={handleSendMessage}
        dir="rtl"
        className="p-3 bg-[#0d1524] border-t border-slate-800/90 flex items-center gap-2 shrink-0"
      >
        <button
          type="button"
          disabled={!isOnline || isSending}
          onClick={() => fileInputRef.current?.click()}
          title="إرسال صورة من المعرض"
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-amber-400 border border-slate-700/60 transition disabled:opacity-40 cursor-pointer"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          disabled={!isOnline || isSending}
          onClick={() => cameraInputRef.current?.click()}
          title="التقاط صورة بالكاميرا"
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-amber-400 border border-slate-700/60 transition disabled:opacity-40 cursor-pointer"
        >
          <Camera className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isOnline ? 'اكتب رسالتك للقناة...' : 'لا يوجد اتصال بالإنترنت'}
          disabled={!isOnline || isSending}
          className="flex-1 bg-[#131d30] border border-slate-700/80 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!isOnline || (!inputText.trim() && !selectedImage) || isSending}
          className="p-2.5 sm:px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md flex items-center gap-1.5 disabled:opacity-40 transition active:scale-95 cursor-pointer"
        >
          {isSending ? (
            <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span className="hidden sm:inline">إرسال</span>
              <Send className="w-4 h-4 rotate-180" />
            </>
          )}
        </button>
      </form>

      {/* Moderator & Owner Channel Supervision Modal (Warnings & Kicks) */}
      {supervisionModalOpen && selectedChannel && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto"
        >
          <div className="bg-[#121824] border border-amber-500/40 rounded-3xl p-5 w-full max-w-md space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-amber-400">
                  إدارة أعضاء القناة والإنذارات ({selectedChannel.name})
                </h3>
                <p className="text-[11px] text-slate-400">
                  إرسال إنذار أو طرد مشترك مع إرسال تقرير تلقائي بالصور إلى القائد Sami
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSupervisionModalOpen(false);
                  setActionTargetUser(null);
                }}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!actionTargetUser ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {channelMembers.map((member) => {
                  const isOwnerMember = member.id === 1 || member.role === 'owner';
                  return (
                    <div
                      key={member.id}
                      className="bg-[#0b101a] border border-slate-800 rounded-2xl p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        {member.avatarUrl ? (
                          <CloudImage
                            src={member.avatarUrl}
                            alt={member.displayName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-black"
                            style={{ color: getUserNameColor(member.id) }}
                          >
                            {member.displayName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <span
                            style={{ color: getUserNameColor(member.id) }}
                            className="text-xs font-black block"
                          >
                            {member.displayName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            الإنذارات الحالية: {member.warningsCount || 0} / 3
                          </span>
                        </div>
                      </div>

                      {!isOwnerMember && member.id !== currentUser.id && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActionTargetUser(member);
                              setActionType('warning');
                              setActionReason('');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>إنذار</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActionTargetUser(member);
                              setActionType('kick');
                              setActionReason('');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>طرد وتقرير</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <form onSubmit={handleExecuteSupervisionAction} className="space-y-3">
                <div className="p-3 rounded-2xl bg-[#0b101a] border border-slate-800">
                  <div className="text-xs font-black text-white">
                    {actionType === 'warning'
                      ? `⚠️ إرسال إنذار رسمي إلى: ${actionTargetUser.displayName}`
                      : `🚫 طرد ${actionTargetUser.displayName} من القناة وإرسال تقرير إلى Sami`}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    عدد الإنذارات الحالي: {actionTargetUser.warningsCount || 0} / 3
                  </div>
                </div>

                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="اكتب سبب المخالفة أو الطرد بالتفصيل..."
                  required
                  rows={3}
                  className="w-full bg-[#0b101a] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-400"
                />

                <div>
                  <input
                    type="file"
                    ref={evidenceInputRef}
                    onChange={(e) => setActionEvidenceFile(e.target.files?.[0] || null)}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => evidenceInputRef.current?.click()}
                    className="w-full py-2.5 rounded-xl bg-slate-800 text-amber-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>
                      {actionEvidenceFile
                        ? `تم إرفاق الدليل: ${actionEvidenceFile.name}`
                        : 'إرفاق صورة الصفقة المخالفة / الدليل (اختياري)'}
                    </span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isExecutingAction}
                    className={`flex-1 py-3 rounded-xl font-black text-xs cursor-pointer ${
                      actionType === 'warning'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {isExecutingAction
                      ? 'جاري التنفيذ...'
                      : actionType === 'warning'
                      ? 'تأكيد إرسال الإنذار'
                      : 'تأكيد الطرد وإرسال التقرير إلى Sami'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionTargetUser(null)}
                    className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    رجوع
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Full-Screen Image Viewer with Zoom, Pan, Pinch-to-Zoom, and Download */}
      <ImageViewerModal
        imageUrl={previewModalImage}
        title="عرض صورة المحادثة"
        onClose={() => setPreviewModalImage(null)}
      />
    </div>
  );
};
