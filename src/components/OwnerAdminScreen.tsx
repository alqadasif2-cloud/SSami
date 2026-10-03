import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Users,
  MessageCircle,
  Mail,
  Plus,
  Trash2,
  KeyRound,
  UserCheck,
  Image as ImageIcon,
  Check,
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Edit3,
} from 'lucide-react';
import {
  CurrentUser,
  UserAccount,
  subscribeToCommunityUsers,
  createCloudUser,
  updateCloudUser,
  deleteCloudUser,
} from '../data/auth';
import {
  CommunityChannel,
  PrivateMessage,
  subscribeToChannels,
  createCloudChannel,
  updateCloudChannel,
  deleteCloudChannel,
  subscribeToPrivateMessages,
  sendPrivateMessage,
  getUserNameColor,
} from '../data/chat';
import { CloudImage } from './CloudImage';
import { ImageViewerModal } from './ImageViewerModal';
import {
  AppUpdateConfig,
  subscribeToAppUpdateConfig,
  saveAppUpdateConfig,
  CURRENT_APP_VERSION_NAME,
  CURRENT_APP_VERSION_CODE,
} from '../services/appUpdates';
import { AppUpdateModal } from './AppUpdateModal';
import { Cloud, RefreshCw, Smartphone } from 'lucide-react';

interface OwnerAdminScreenProps {
  currentUser: CurrentUser;
}

export const OwnerAdminScreen: React.FC<OwnerAdminScreenProps> = ({ currentUser }) => {
  const [subTab, setSubTab] = useState<'users' | 'channels' | 'messages' | 'app_update'>('users');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [allPrivateMessages, setAllPrivateMessages] = useState<PrivateMessage[]>([]);

  // App Update Cloud Config State
  const [appUpdateConfig, setAppUpdateConfig] = useState<AppUpdateConfig | null>(null);
  const [editVersionName, setEditVersionName] = useState('1.2.0');
  const [editVersionCode, setEditVersionCode] = useState('10');
  const [editDownloadUrl, setEditDownloadUrl] = useState('https://github.com/alsonadi44/SamiTradingTracker/releases');
  const [editDescription, setEditDescription] = useState('الإصدار الأحدث متوفر الآن مع تحسينات في الأداء وتطوير الواجهة.');
  const [editIsMandatory, setEditIsMandatory] = useState(false);
  const [isSavingUpdate, setIsSavingUpdate] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // User Creation Form State
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'moderator'>('user');
  const [editingPasswordUser, setEditingPasswordUser] = useState<UserAccount | null>(null);
  const [updatedPasswordVal, setUpdatedPasswordVal] = useState('');

  // Channel Creation / Editing State
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<CommunityChannel | null>(null);
  const [channelNameInput, setChannelNameInput] = useState('');
  const [channelPasswordInput, setChannelPasswordInput] = useState('');
  const [channelMemberIds, setChannelMemberIds] = useState<number[]>([]);
  const [channelImageFile, setChannelImageFile] = useState<File | null>(null);
  const [channelImagePreview, setChannelImagePreview] = useState<string | null>(null);
  const [removeChannelImageFlag, setRemoveChannelImageFlag] = useState(false);
  const channelImageInputRef = useRef<HTMLInputElement>(null);

  // Private Messages Thread State
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const showNotice = (text: string, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    const unsubUsers = subscribeToCommunityUsers(setUsers);
    const unsubChannels = subscribeToChannels(setChannels);
    const unsubPMs = subscribeToPrivateMessages(null, setAllPrivateMessages);
    const unsubUpdate = subscribeToAppUpdateConfig((cfg) => {
      setAppUpdateConfig(cfg);
      setEditVersionName(cfg.versionName);
      setEditVersionCode(cfg.versionCode.toString());
      setEditDownloadUrl(cfg.downloadUrl);
      setEditDescription(cfg.description);
      setEditIsMandatory(cfg.isMandatory);
    });
    return () => {
      unsubUsers();
      unsubChannels();
      unsubPMs();
      unsubUpdate();
    };
  }, []);

  if (currentUser.role !== 'owner' && currentUser.id !== 1) {
    return null;
  }

  // --- USER MANAGEMENT HANDLERS ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCloudUser({
        username: newUsername,
        displayName: newDisplayName || newUsername,
        password: newUserPassword,
        role: newUserRole,
      });
      setNewUsername('');
      setNewDisplayName('');
      setNewUserPassword('');
      setNewUserRole('user');
      showNotice('تم إنشاء المستخدم الجديد وحفظه سحابياً بنجاح');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'تعذر إنشاء المستخدم', true);
    }
  };

  const handleToggleModerator = async (u: UserAccount) => {
    if (u.id === 1) return;
    const nextRole = u.role === 'moderator' ? 'user' : 'moderator';
    try {
      await updateCloudUser(u.id, { role: nextRole });
      showNotice(
        nextRole === 'moderator'
          ? `تم تعيين ${u.displayName} مشرفاً`
          : `تم إزالة صلاحية الإشراف من ${u.displayName}`
      );
    } catch {
      showNotice('تعذر تحديث صلاحية المستخدم', true);
    }
  };

  const handleSaveNewPassword = async () => {
    if (!editingPasswordUser || !updatedPasswordVal.trim()) return;
    try {
      await updateCloudUser(editingPasswordUser.id, { password: updatedPasswordVal.trim() });
      setEditingPasswordUser(null);
      setUpdatedPasswordVal('');
      showNotice(`تم تحديث كلمة مرور ${editingPasswordUser.displayName} بنجاح`);
    } catch {
      showNotice('تعذر تحديث كلمة المرور', true);
    }
  };

  const handleDeleteUser = async (u: UserAccount) => {
    if (u.id === 1) return;
    try {
      await deleteCloudUser(u.id);
      showNotice(`تم حذف المستخدم ${u.displayName}`);
    } catch {
      showNotice('تعذر حذف المستخدم', true);
    }
  };

  const handleResetWarnings = async (u: UserAccount) => {
    try {
      await updateCloudUser(u.id, { warningsCount: 0 });
      showNotice(`تم تصفير إنذارات ${u.displayName}`);
    } catch {
      showNotice('تعذر تصفير الإنذارات', true);
    }
  };

  // --- CHANNEL MANAGEMENT HANDLERS ---
  const openCreateChannelModal = () => {
    setEditingChannel(null);
    setChannelNameInput('');
    setChannelPasswordInput('');
    setChannelMemberIds(users.map((u) => u.id));
    setChannelImageFile(null);
    setChannelImagePreview(null);
    setRemoveChannelImageFlag(false);
    setChannelModalOpen(true);
  };

  const openEditChannelModal = (ch: CommunityChannel) => {
    setEditingChannel(ch);
    setChannelNameInput(ch.name);
    setChannelPasswordInput(ch.password);
    setChannelMemberIds(ch.memberIds);
    setChannelImageFile(null);
    setChannelImagePreview(ch.imageUrl || null);
    setRemoveChannelImageFlag(false);
    setChannelModalOpen(true);
  };

  const handleChannelImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setChannelImageFile(file);
    setRemoveChannelImageFlag(false);
    setChannelImagePreview(URL.createObjectURL(file));
  };

  const toggleMemberInChannel = (uid: number) => {
    if (uid === 1) return; // Sami is always member
    setChannelMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelNameInput.trim()) {
      showNotice('يرجى إدخال اسم القناة', true);
      return;
    }
    try {
      if (editingChannel) {
        await updateCloudChannel(editingChannel.id, {
          name: channelNameInput.trim(),
          password: channelPasswordInput.trim(),
          memberIds: channelMemberIds,
          imageFileOrDataUrl: channelImageFile,
          removeImage: removeChannelImageFlag,
        });
        showNotice('تم تحديث بيانات القناة بنجاح');
      } else {
        await createCloudChannel({
          name: channelNameInput.trim(),
          password: channelPasswordInput.trim(),
          memberIds: channelMemberIds,
          imageFileOrDataUrl: channelImageFile,
        });
        showNotice('تم إنشاء القناة الجديدة بنجاح');
      }
      setChannelModalOpen(false);
    } catch {
      showNotice('تعذر حفظ بيانات القناة', true);
    }
  };

  const handleDeleteChannel = async (ch: CommunityChannel) => {
    try {
      await deleteCloudChannel(ch);
      showNotice(`تم حذف القناة "${ch.name}"`);
    } catch {
      showNotice('تعذر حذف القناة', true);
    }
  };

  // --- PRIVATE MESSAGES HANDLERS ---
  const threadsMap = new Map<number, { participantId: number; participantName: string; lastMsg: PrivateMessage; count: number }>();
  allPrivateMessages.forEach((pm) => {
    const existing = threadsMap.get(pm.participantId);
    if (!existing || pm.timestamp >= existing.lastMsg.timestamp) {
      threadsMap.set(pm.participantId, {
        participantId: pm.participantId,
        participantName: pm.participantName,
        lastMsg: pm,
        count: (existing?.count || 0) + 1,
      });
    }
  });
  const privateThreads = Array.from(threadsMap.values()).sort(
    (a, b) => b.lastMsg.timestamp - a.lastMsg.timestamp
  );

  const activeThreadMessages = selectedParticipantId
    ? allPrivateMessages.filter((m) => m.participantId === selectedParticipantId)
    : [];
  const activeParticipantUser = users.find((u) => u.id === selectedParticipantId);

  const handleSendOwnerReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipantId || (!replyText.trim() && !replyImageFile)) return;
    setIsSendingReply(true);
    try {
      const pName =
        activeParticipantUser?.displayName ||
        threadsMap.get(selectedParticipantId)?.participantName ||
        'مشترك';
      await sendPrivateMessage({
        participantId: selectedParticipantId,
        participantName: pName,
        sender: {
          id: 1,
          displayName: currentUser.displayName,
          role: 'owner',
          avatarUrl: currentUser.avatarUrl,
        },
        receiverId: selectedParticipantId,
        text: replyText.trim(),
        imageFileOrDataUrl: replyImageFile,
      });
      setReplyText('');
      setReplyImageFile(null);
    } catch {
      showNotice('تعذر إرسال الرد الخاص', true);
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-4 pb-24 text-right animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/20 via-[#121824] to-[#121824] border border-amber-500/40 rounded-3xl p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-black text-white">لوحة تحكم القائد Sami</h2>
              <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 rounded-md">
                👑 Owner
              </span>
            </div>
            <p className="text-xs text-slate-400">
              إدارة شاملة للمستخدمين، المشرفين، القنوات، والرسائل الخاصة
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Notice */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold ${
            feedback.isError
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
          }`}
        >
          {feedback.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#0e1420] p-1.5 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setSubTab('users')}
          className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
            subTab === 'users'
              ? 'bg-amber-400 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المستخدمون ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('channels')}
          className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
            subTab === 'channels'
              ? 'bg-amber-400 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>القنوات ({channels.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('messages')}
          className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
            subTab === 'messages'
              ? 'bg-amber-400 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>الرسائل الخاصة ({privateThreads.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('app_update')}
          className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
            subTab === 'app_update'
              ? 'bg-amber-400 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>تحديث التطبيق 🚀</span>
        </button>
      </div>

      {/* TAB 1: USERS MANAGEMENT */}
      {subTab === 'users' && (
        <div className="space-y-4">
          {/* Create New User Card */}
          <form
            onSubmit={handleCreateUser}
            className="bg-[#121824] border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg"
          >
            <h3 className="text-sm font-black text-amber-400 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>إنشاء مستخدم جديد</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="اسم المستخدم للدخول (Username)"
                required
                className="bg-[#0b101a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
              />
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="الاسم المعروض (اختياري)"
                className="bg-[#0b101a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
              />
              <input
                type="text"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="كلمة المرور"
                required
                className="bg-[#0b101a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as 'user' | 'moderator')}
                className="bg-[#0b101a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
              >
                <option value="user">رتبة: مستخدم عادي</option>
                <option value="moderator">رتبة: مشرف (Moderator)</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer"
            >
              إضافة المستخدم وحفظه سحابياً
            </button>
          </form>

          {/* Users List */}
          <div className="space-y-2.5">
            {users.map((u) => {
              const isSami = u.id === 1 || u.role === 'owner';
              return (
                <div
                  key={u.id}
                  className="bg-[#121824] border border-slate-800/90 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {u.avatarUrl ? (
                        <CloudImage
                          src={u.avatarUrl}
                          alt={u.displayName}
                          className="w-10 h-10 rounded-full object-cover border border-amber-400/50"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border border-slate-700"
                          style={{
                            backgroundColor: '#0b101a',
                            color: getUserNameColor(u.id),
                          }}
                        >
                          {u.displayName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            style={{ color: getUserNameColor(u.id) }}
                            className="text-sm font-black"
                          >
                            {u.displayName}
                          </span>
                          {isSami ? (
                            <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 rounded">
                              👑 القائد
                            </span>
                          ) : u.role === 'moderator' ? (
                            <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.5 rounded">
                              🛡️ مشرف
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">عضو</span>
                          )}
                          {(u.warningsCount || 0) > 0 && (
                            <span className="text-[10px] font-bold text-rose-400">
                              • ⚠️ {u.warningsCount}/3 إنذارات
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-['JetBrains_Mono',monospace]">
                          @{u.username} • كلمة المرور: <span className="text-amber-300">{u.password}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPasswordUser(u);
                          setUpdatedPasswordVal(u.password);
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition cursor-pointer"
                        title="تعديل كلمة المرور"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>

                      {!isSami && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleModerator(u)}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                              u.role === 'moderator'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-300 hover:text-white'
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{u.role === 'moderator' ? 'إزالة إشراف' : 'تعيين مشرف'}</span>
                          </button>

                          {(u.warningsCount || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleResetWarnings(u)}
                              className="p-2 rounded-xl bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition cursor-pointer"
                              title="تصفير الإنذارات"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 transition cursor-pointer"
                            title="حذف المستخدم"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CHANNELS MANAGEMENT */}
      {subTab === 'channels' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={openCreateChannelModal}
            className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء قناة جديدة (بصورة وكلمة مرور مستقلة)</span>
          </button>

          <div className="space-y-3">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="bg-[#121824] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow"
              >
                <div className="flex items-center gap-3">
                  {ch.imageUrl ? (
                    <CloudImage
                      src={ch.imageUrl}
                      alt={ch.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-amber-400/50"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 font-black text-lg">
                      💬
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-black text-white">{ch.name}</h4>
                    <p className="text-[11px] text-slate-400">
                      الأعضاء: <span className="text-emerald-400 font-bold">{ch.memberIds.length}</span> • كلمة المرور:{' '}
                      <span className="text-amber-300 font-['JetBrains_Mono',monospace]">
                        {ch.password || 'بدون كلمة مرور'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditChannelModal(ch)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteChannel(ch)}
                    className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 cursor-pointer"
                    title="حذف القناة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PRIVATE MESSAGES & MODERATOR REPORTS */}
      {subTab === 'messages' && (
        <div className="space-y-3">
          {!selectedParticipantId ? (
            <div className="space-y-2.5">
              {/* Allow Owner Sami to start or open conversation with any user */}
              <div className="bg-[#121824] border border-slate-800 rounded-2xl p-3">
                <span className="text-xs font-bold text-slate-400 block mb-2">
                  بدء أو فتح محادثة خاصة مع أي عضو أو مشرف:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {users
                    .filter((u) => u.id !== 1)
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedParticipantId(u.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        style={{ color: getUserNameColor(u.id) }}
                      >
                        <span>{u.displayName}</span>
                        {u.role === 'moderator' && <span>🛡️</span>}
                      </button>
                    ))}
                </div>
              </div>

              {privateThreads.length === 0 ? (
                <div className="p-8 text-center bg-[#121824] border border-slate-800 rounded-2xl text-slate-400 text-xs font-bold">
                  لا توجد رسائل خاصة أو تقارير واردة حتى الآن.
                </div>
              ) : (
                privateThreads.map((th) => (
                  <div
                    key={th.participantId}
                    onClick={() => setSelectedParticipantId(th.participantId)}
                    className="bg-[#121824] hover:bg-[#161f30] border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          style={{ color: getUserNameColor(th.participantId) }}
                          className="text-sm font-black"
                        >
                          {th.participantName}
                        </span>
                        {th.lastMsg.isReport && (
                          <span className="text-[10px] font-black text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded">
                            🚨 تقرير مشرف
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate max-w-xs mt-1">
                        {th.lastMsg.text || '📷 صورة مرفقة'}
                      </p>
                    </div>
                    <span className="text-[11px] text-amber-400 font-bold">
                      فتح المحادثة ({th.count})
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="bg-[#0d131f] border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[520px]">
              <div className="p-3.5 bg-[#121a2b] border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-white">
                    محادثة خاصة مع:{' '}
                    <span style={{ color: getUserNameColor(selectedParticipantId) }}>
                      {activeParticipantUser?.displayName ||
                        threadsMap.get(selectedParticipantId)?.participantName}
                    </span>
                  </h4>
                  <span className="text-[10px] text-emerald-400">
                    محادثة دائمة محفوظة سحابياً (لا تُحذف بعد 48 ساعة)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedParticipantId(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  رجوع للقائمة
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeThreadMessages.map((pm) => {
                  const isMe = pm.senderId === 1;
                  return (
                    <div
                      key={pm.id}
                      className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 ${
                          isMe
                            ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/15 border border-amber-400/60 text-white'
                            : pm.isReport
                            ? 'bg-rose-950/50 border border-rose-500/50 text-slate-100'
                            : 'bg-[#151f33] border border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span
                            style={{ color: getUserNameColor(pm.senderId) }}
                            className="text-[11px] font-black"
                          >
                            {pm.senderName} {pm.senderId === 1 ? '👑 القائد' : ''}
                          </span>
                        </div>
                        {pm.imageUrl && (
                          <div
                            onClick={() => setPreviewImage(pm.imageUrl || null)}
                            className="my-1.5 rounded-xl overflow-hidden cursor-pointer border border-slate-700"
                          >
                            <CloudImage
                              src={pm.imageUrl}
                              alt="مرفق"
                              className="max-h-52 w-auto object-contain mx-auto"
                            />
                          </div>
                        )}
                        {pm.text && (
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{pm.text}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={handleSendOwnerReply}
                className="p-3 bg-[#111827] border-t border-slate-800 flex items-center gap-2"
              >
                <input
                  type="file"
                  ref={replyFileInputRef}
                  onChange={(e) => setReplyImageFile(e.target.files?.[0] || null)}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => replyFileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-slate-800 text-amber-400 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="اكتب ردك للمستخدم..."
                  className="flex-1 bg-[#0b101a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  disabled={isSendingReply}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>إرسال</span>
                  <Send className="w-3.5 h-3.5 rotate-180" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Password Edit Modal */}
      {editingPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#121824] border border-amber-500/40 rounded-3xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-sm font-black text-white">
              تعديل كلمة مرور: {editingPasswordUser.displayName}
            </h3>
            <input
              type="text"
              value={updatedPasswordVal}
              onChange={(e) => setUpdatedPasswordVal(e.target.value)}
              className="w-full bg-[#0b101a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveNewPassword}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                حفظ كلمة المرور
              </button>
              <button
                type="button"
                onClick={() => setEditingPasswordUser(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel Create / Edit Modal */}
      {channelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveChannel}
            className="bg-[#121824] border border-amber-500/40 rounded-3xl p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-amber-400">
                {editingChannel ? `تعديل القناة: ${editingChannel.name}` : 'إنشاء قناة جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setChannelModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">اسم القناة</label>
              <input
                type="text"
                value={channelNameInput}
                onChange={(e) => setChannelNameInput(e.target.value)}
                placeholder="مثال: قناة النخبة للتداول"
                required
                className="w-full bg-[#0b101a] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                كلمة المرور الخاصة بالقناة
              </label>
              <input
                type="text"
                value={channelPasswordInput}
                onChange={(e) => setChannelPasswordInput(e.target.value)}
                placeholder="كلمة مرور مستقلة لهذه القناة"
                required
                className="w-full bg-[#0b101a] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400"
              />
            </div>

            {/* Channel Image Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">صورة القناة</label>
              <input
                type="file"
                ref={channelImageInputRef}
                onChange={handleChannelImageSelect}
                accept="image/*"
                className="hidden"
              />
              <div className="flex items-center gap-3">
                {channelImagePreview && !removeChannelImageFlag ? (
                  <CloudImage
                    src={channelImagePreview}
                    alt="صورة القناة"
                    className="w-14 h-14 rounded-2xl object-cover border border-amber-400"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xl">
                    💬
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => channelImageInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>رفع / تغيير الصورة</span>
                </button>
                {channelImagePreview && !removeChannelImageFlag && (
                  <button
                    type="button"
                    onClick={() => {
                      setChannelImageFile(null);
                      setChannelImagePreview(null);
                      setRemoveChannelImageFlag(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-500/15 text-rose-400 text-xs font-bold cursor-pointer"
                  >
                    حذف الصورة
                  </button>
                )}
              </div>
            </div>

            {/* Members Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  الأعضاء المسموح لهم بالدخول ({channelMemberIds.length})
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setChannelMemberIds(users.map((u) => u.id))}
                    className="text-[11px] text-amber-400 font-bold cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelMemberIds([1])}
                    className="text-[11px] text-slate-400 font-bold cursor-pointer"
                  >
                    إلغاء الكل
                  </button>
                </div>
              </div>
              <div className="max-h-44 overflow-y-auto bg-[#0b101a] border border-slate-800 rounded-xl p-2 space-y-1">
                {users.map((u) => {
                  const selected = channelMemberIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleMemberInChannel(u.id)}
                      className={`p-2 rounded-lg flex items-center justify-between cursor-pointer ${
                        selected ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-slate-900'
                      }`}
                    >
                      <span
                        style={{ color: getUserNameColor(u.id) }}
                        className="text-xs font-bold"
                      >
                        {u.displayName} {u.id === 1 ? '(👑 القائد)' : u.role === 'moderator' ? '(🛡️ مشرف)' : ''}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center ${
                          selected ? 'bg-amber-400 text-slate-950' : 'border border-slate-700'
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                حفظ القناة
              </button>
              <button
                type="button"
                onClick={() => setChannelModalOpen(false)}
                className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: APP UPDATE MANAGEMENT */}
      {subTab === 'app_update' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-[#121824] border border-amber-500/40 rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-300">
                  نظام تحديث التطبيق السحابي المباشر
                </h3>
                <p className="text-xs text-slate-400">
                  إدارة الإصدارات وروابط الـ APK وتحديد التحديث كإجباري أو اختياري فورياً لجميع المستخدمين
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-[#0b0f17] p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">الإصدار المثبت محلياً:</span>
                <span className="font-bold text-slate-200">
                  v{CURRENT_APP_VERSION_NAME} (كود {CURRENT_APP_VERSION_CODE})
                </span>
              </div>
              <div className="bg-[#0b0f17] p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">الإصدار المنشور بالسحابة:</span>
                <span
                  className={`font-black ${
                    appUpdateConfig && appUpdateConfig.versionCode > CURRENT_APP_VERSION_CODE
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }`}
                >
                  v{appUpdateConfig?.versionName || '1.2.0'} (
                  {appUpdateConfig?.isMandatory ? 'إجباري ⚠️' : 'اختياري ✨'})
                </span>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-[#121824] border border-slate-800 rounded-3xl p-5 space-y-4">
            <h4 className="text-xs font-black text-amber-400 flex items-center gap-2">
              <span>⚙️ بيانات التحديث السحابي الجديد</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  رقم الإصدار الجديد (Version Name):
                </label>
                <input
                  type="text"
                  value={editVersionName}
                  onChange={(e) => setEditVersionName(e.target.value)}
                  placeholder="مثال: 1.3.0"
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 font-['JetBrains_Mono',monospace] focus:outline-none focus:border-amber-400"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  كود الإصدار الرقمي (Version Code):
                </label>
                <input
                  type="number"
                  value={editVersionCode}
                  onChange={(e) => setEditVersionCode(e.target.value)}
                  placeholder="مثال: 11"
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 font-['JetBrains_Mono',monospace] focus:outline-none focus:border-amber-400"
                  dir="ltr"
                />
                <span className="block text-[10px] text-slate-500 mt-1">
                  💡 يجب أن يكون أكبر من {CURRENT_APP_VERSION_CODE} لكي تظهر نافذة التحديث للمستخدمين.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  رابط تحميل ملف الـ APK المباشر (Download URL):
                </label>
                <input
                  type="text"
                  value={editDownloadUrl}
                  onChange={(e) => setEditDownloadUrl(e.target.value)}
                  placeholder="https://github.com/.../app.apk"
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 font-['JetBrains_Mono',monospace] focus:outline-none focus:border-amber-400"
                  dir="ltr"
                />
                <span className="block text-[10px] text-slate-500 mt-1">
                  الرابط المباشر الذي سيفتح عند ضغط المستخدم على زر "تحديث الآن".
                </span>
              </div>

              {/* Mandatory Toggle */}
              <div
                onClick={() => setEditIsMandatory(!editIsMandatory)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  editIsMandatory
                    ? 'bg-rose-500/10 border-rose-500/40'
                    : 'bg-amber-400/10 border-amber-400/30'
                }`}
              >
                <div>
                  <h5
                    className={`font-black text-xs ${
                      editIsMandatory ? 'text-rose-400' : 'text-amber-300'
                    }`}
                  >
                    {editIsMandatory ? '⚠️ تحديث إجباري (Mandatory)' : '✨ تحديث اختياري (Optional)'}
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {editIsMandatory
                      ? 'لا يسمح للمستخدم باستخدام التطبيق حتى يتم التحديث (لا يوجد زر لاحقاً).'
                      : 'يسمح للمستخدم بدخول التطبيق مع إظهار زر "لاحقاً".'}
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                    editIsMandatory ? 'bg-rose-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      editIsMandatory ? '-translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  وصف مختصر للتحديث / ما الجديد:
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="اكتب تفاصيل التحديث والميزات الجديدة..."
                  className="w-full bg-[#0b0f17] border border-slate-700 rounded-xl p-3 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Save & Actions */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={isSavingUpdate}
                  onClick={async () => {
                    const vName = editVersionName.trim();
                    const vCode = parseInt(editVersionCode, 10);
                    const dUrl = editDownloadUrl.trim();
                    if (!vName) {
                      showNotice('يرجى إدخال رقم الإصدار', true);
                      return;
                    }
                    if (isNaN(vCode)) {
                      showNotice('يرجى إدخال كود إصدار رقمي صحيح', true);
                      return;
                    }
                    if (!dUrl) {
                      showNotice('يرجى إدخال رابط تحميل الـ APK', true);
                      return;
                    }

                    setIsSavingUpdate(true);
                    try {
                      await saveAppUpdateConfig({
                        versionName: vName,
                        versionCode: vCode,
                        downloadUrl: dUrl,
                        description: editDescription.trim(),
                        isMandatory: editIsMandatory,
                      });
                      showNotice('تم نشر إعدادات التحديث السحابي بنجاح 🚀');
                    } catch {
                      showNotice('تعذر حفظ إعدادات التحديث', true);
                    } finally {
                      setIsSavingUpdate(false);
                    }
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <Cloud className="w-4 h-4" />
                  <span>
                    {isSavingUpdate ? 'جاري الحفظ والنشر...' : 'حفظ ونشر التحديث في السحابة فوراً 🚀'}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs border border-amber-400/30 transition cursor-pointer"
                  >
                    معاينة نافذة التحديث
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setEditVersionName('1.2.0');
                      setEditVersionCode('10');
                      setEditIsMandatory(false);
                      setIsSavingUpdate(true);
                      try {
                        await saveAppUpdateConfig({
                          versionName: '1.2.0',
                          versionCode: 10,
                          downloadUrl: editDownloadUrl.trim(),
                          description: 'الإصدار الأحدث متوفر الآن مع تحسينات في الأداء وتطوير الواجهة.',
                          isMandatory: false,
                        });
                        showNotice('تم إيقاف التحديث وإعادة الحالة إلى v1.2.0');
                      } catch {
                        showNotice('تعذر إيقاف التحديث', true);
                      } finally {
                        setIsSavingUpdate(false);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs border border-slate-800 transition cursor-pointer"
                  >
                    إيقاف التحديث (إعادة لـ 1.2.0)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && (
        <AppUpdateModal
          isOpen={showPreviewModal}
          config={{
            versionName: editVersionName.trim() || '1.3.0',
            versionCode: parseInt(editVersionCode, 10) || 11,
            downloadUrl: editDownloadUrl.trim(),
            description: editDescription.trim(),
            isMandatory: editIsMandatory,
          }}
          onDismiss={() => setShowPreviewModal(false)}
        />
      )}

      <ImageViewerModal
        imageUrl={previewImage}
        title="عرض المرفق"
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};
