// Comprehensive Cloud Community System:
// - Channels (with independent passwords, images, and allowed members)
// - Channel Messages (with Role Badges, Profile Avatars, and 48h auto-delete)
// - Permanent Private Chat with Owner Sami (never deleted after 48h)
// - Moderator Warnings (1..3) & Channel Kicks with Reports to Sami
// - Real-time Targeted Notifications

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, uploadImageToCloud, deleteCloudImage } from '../services/firebase';
import { UserRole } from '../types';
import { UserAccount } from './auth';

export interface CommunityChannel {
  id: string;
  name: string;
  imageUrl?: string | null;
  storagePath?: string | null;
  password: string;
  memberIds: number[];
  createdBy: number;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: number;
  senderName: string;
  senderRole?: UserRole;
  senderAvatarUrl?: string | null;
  text?: string;
  imageUrl?: string;
  storagePath?: string;
  timestamp: number;
}

export interface PrivateMessage {
  id: string;
  participantId: number; // The non-owner user/moderator in the conversation with Sami
  participantName: string;
  senderId: number;
  senderName: string;
  senderRole: UserRole;
  senderAvatarUrl?: string | null;
  receiverId: number;
  text?: string;
  imageUrl?: string;
  storagePath?: string;
  isReport?: boolean;
  timestamp: number;
}

export interface UserWarning {
  id: string;
  channelId: string;
  channelName: string;
  targetUserId: number;
  targetUserName: string;
  issuedById: number;
  issuedByName: string;
  issuedByRole: UserRole;
  reason: string;
  warningNumber: number;
  evidenceImageUrl?: string | null;
  actionType: 'warning' | 'kick';
  timestamp: number;
}

export interface CommunityNotification {
  id: string;
  type: 'channel_important' | 'private_message' | 'warning' | 'kick';
  title: string;
  body: string;
  senderId: number;
  senderName: string;
  senderRole: UserRole;
  channelId?: string | null;
  targetUserIds: number[];
  timestamp: number;
}

export const DEFAULT_CHANNEL_ID = 'channel_default_3000';

const CHANNELS_COLLECTION = 'community_channels';
const CHAT_COLLECTION = 'chat_messages';
const PRIVATE_MESSAGES_COLLECTION = 'private_messages';
const WARNINGS_COLLECTION = 'user_warnings';
const NOTIFICATIONS_COLLECTION = 'community_notifications';
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/**
 * Deterministic high-contrast color palette for user names on dark backgrounds.
 * Owner Sami (userId === 1) always receives Royal Gold (#FFD700).
 */
const USER_NAME_COLOR_PALETTE: readonly string[] = [
  '#FFD700', // 1 - Royal Gold (Owner Sami)
  '#38BDF8', // 2 - Sky Blue
  '#34D399', // 3 - Emerald Green
  '#F472B6', // 4 - Pink Rose
  '#A78BFA', // 5 - Soft Violet
  '#FB923C', // 6 - Vibrant Orange
  '#2DD4BF', // 7 - Teal Cyan
  '#F87171', // 8 - Coral Red
  '#A3E635', // 9 - Lime Green
  '#60A5FA', // 10 - Royal Blue
  '#E879F9', // 11 - Fuchsia
  '#FBBF24', // 12 - Warm Amber
  '#22D3EE', // 13 - Bright Cyan
  '#FB7185', // 14 - Salmon Rose
  '#818CF8', // 15 - Indigo Light
  '#4ADE80', // 16 - Mint Green
  '#FDBA74', // 17 - Peach Gold
  '#C084FC', // 18 - Purple Orchid
  '#67E8F9', // 19 - Ice Aqua
  '#FDE047', // 20 - Lemon Yellow
];

export function getUserNameColor(userId: number | string): string {
  const paletteSize = USER_NAME_COLOR_PALETTE.length;
  if (typeof userId === 'number' && Number.isFinite(userId)) {
    if (userId === 1) return '#FFD700';
    const index = (((Math.trunc(userId) - 1) % paletteSize) + paletteSize) % paletteSize;
    return USER_NAME_COLOR_PALETTE[index];
  }
  const str = String(userId);
  const parsed = parseInt(str, 10);
  if (!Number.isNaN(parsed)) {
    if (parsed === 1) return '#FFD700';
    const index = (((parsed - 1) % paletteSize) + paletteSize) % paletteSize;
    return USER_NAME_COLOR_PALETTE[index];
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  const index = ((hash % paletteSize) + paletteSize) % paletteSize;
  return USER_NAME_COLOR_PALETTE[index];
}

// ============================================================================
// CHANNELS MANAGEMENT
// ============================================================================

let channelSeedPromise: Promise<void> | null = null;

export async function ensureDefaultChannelInitialized(): Promise<void> {
  if (channelSeedPromise) return channelSeedPromise;
  channelSeedPromise = (async () => {
    try {
      const snap = await getDocs(collection(db, CHANNELS_COLLECTION));
      if (snap.empty) {
        const now = Date.now();
        const defaultMembers = Array.from({ length: 20 }, (_, i) => i + 1);
        await setDoc(doc(db, CHANNELS_COLLECTION, DEFAULT_CHANNEL_ID), {
          id: DEFAULT_CHANNEL_ID,
          name: 'دفعة الرحلة إلى 3000$',
          imageUrl: null,
          password: '3000',
          memberIds: defaultMembers,
          createdBy: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch {
      // Ignore offline errors
    } finally {
      channelSeedPromise = null;
    }
  })();
  return channelSeedPromise;
}

export function subscribeToChannels(
  onChannelsChange: (channels: CommunityChannel[]) => void
): () => void {
  void ensureDefaultChannelInitialized();

  return onSnapshot(
    collection(db, CHANNELS_COLLECTION),
    (snapshot) => {
      const list: CommunityChannel[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const rawMembers = Array.isArray(data.memberIds) ? data.memberIds : [];
        const memberIds = Array.from(
          new Set([1, ...rawMembers.map((m) => Number(m)).filter((n) => n > 0)])
        );
        list.push({
          id: String(data.id || docSnap.id),
          name: String(data.name || 'قناة تداول'),
          imageUrl: typeof data.imageUrl === 'string' && data.imageUrl ? data.imageUrl : null,
          storagePath: typeof data.storagePath === 'string' ? data.storagePath : null,
          password: String(data.password ?? ''),
          memberIds,
          createdBy: Number(data.createdBy || 1),
          createdAt: Number(data.createdAt || Date.now()),
          updatedAt: Number(data.updatedAt || Date.now()),
        });
      });
      list.sort((a, b) => a.createdAt - b.createdAt);
      onChannelsChange(list);
    },
    () => {
      // Fallback
    }
  );
}

export async function createCloudChannel(params: {
  name: string;
  password: string;
  memberIds: number[];
  imageFileOrDataUrl?: File | string | null;
}): Promise<CommunityChannel> {
  const now = Date.now();
  const channelId = `channel_${now}_${Math.random().toString(36).substring(2, 7)}`;
  let imageUrl: string | null = null;
  let storagePath: string | null = null;

  if (params.imageFileOrDataUrl) {
    const uploaded = await uploadImageToCloud(params.imageFileOrDataUrl, 'channel_images', 1);
    imageUrl = uploaded.imageUrl;
    storagePath = uploaded.storagePath;
  }

  const memberIds = Array.from(new Set([1, ...params.memberIds]));
  const channel: CommunityChannel = {
    id: channelId,
    name: params.name.trim(),
    imageUrl,
    storagePath,
    password: params.password.trim(),
    memberIds,
    createdBy: 1,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, CHANNELS_COLLECTION, channelId), {
    id: channel.id,
    name: channel.name,
    imageUrl: channel.imageUrl || null,
    storagePath: channel.storagePath || null,
    password: channel.password,
    memberIds: channel.memberIds,
    createdBy: 1,
    createdAt: now,
    updatedAt: now,
  });

  return channel;
}

export async function updateCloudChannel(
  channelId: string,
  updates: {
    name?: string;
    password?: string;
    memberIds?: number[];
    imageFileOrDataUrl?: File | string | null;
    removeImage?: boolean;
  }
): Promise<void> {
  const payload: Record<string, unknown> = {
    updatedAt: Date.now(),
  };

  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.password !== undefined) payload.password = updates.password.trim();
  if (updates.memberIds !== undefined) {
    payload.memberIds = Array.from(new Set([1, ...updates.memberIds]));
  }
  if (updates.removeImage) {
    payload.imageUrl = null;
    payload.storagePath = null;
  } else if (updates.imageFileOrDataUrl) {
    const uploaded = await uploadImageToCloud(updates.imageFileOrDataUrl, 'channel_images', 1);
    payload.imageUrl = uploaded.imageUrl;
    payload.storagePath = uploaded.storagePath;
  }

  await updateDoc(doc(db, CHANNELS_COLLECTION, channelId), payload);
}

export async function deleteCloudChannel(channel: CommunityChannel): Promise<void> {
  await deleteDoc(doc(db, CHANNELS_COLLECTION, channel.id));
  if (channel.imageUrl || channel.storagePath) {
    await deleteCloudImage(channel.imageUrl, channel.storagePath);
  }
}

// ============================================================================
// CHANNEL MESSAGES (Auto-purged after 48 hours)
// ============================================================================

export function filterExpiredMessages(messages: ChatMessage[]): ChatMessage[] {
  const now = Date.now();
  return messages.filter((m) => now - m.timestamp < FORTY_EIGHT_HOURS_MS);
}

export async function purgeExpiredFirestoreMessages(expiredMessages: ChatMessage[]): Promise<void> {
  for (const msg of expiredMessages) {
    try {
      await deleteDoc(doc(db, CHAT_COLLECTION, msg.id));
      if (msg.imageUrl || msg.storagePath) {
        await deleteCloudImage(msg.imageUrl, msg.storagePath);
      }
    } catch {
      // Ignore
    }
  }
}

export async function sendChannelMessage(
  channel: CommunityChannel,
  sender: { id: number; displayName: string; role: UserRole; avatarUrl?: string | null },
  content: { text?: string; imageUrl?: string; imageFile?: File }
): Promise<ChatMessage> {
  const now = Date.now();
  const msgId = `msg_${now}_${sender.id}_${Math.random().toString(36).substring(2, 8)}`;

  let cloudImageUrl: string | undefined;
  let storagePath: string | undefined;

  if (content.imageFile) {
    const uploaded = await uploadImageToCloud(content.imageFile, 'chat_images', sender.id);
    cloudImageUrl = uploaded.imageUrl;
    storagePath = uploaded.storagePath;
  } else if (content.imageUrl) {
    if (content.imageUrl.startsWith('data:')) {
      const uploaded = await uploadImageToCloud(content.imageUrl, 'chat_images', sender.id);
      cloudImageUrl = uploaded.imageUrl;
      storagePath = uploaded.storagePath;
    } else {
      cloudImageUrl = content.imageUrl;
    }
  }

  const trimmedText = content.text?.trim();

  const firestorePayload: Record<string, unknown> = {
    id: msgId,
    channelId: channel.id,
    senderId: sender.id,
    senderName: sender.displayName,
    senderRole: sender.role,
    senderAvatarUrl: sender.avatarUrl || null,
    timestamp: now,
  };

  if (trimmedText) firestorePayload.text = trimmedText;
  if (cloudImageUrl) firestorePayload.imageUrl = cloudImageUrl;
  if (storagePath) firestorePayload.storagePath = storagePath;

  await setDoc(doc(db, CHAT_COLLECTION, msgId), firestorePayload);

  // If sent by Owner (Sami) or a Moderator, broadcast a notification ONLY to members of this channel
  if (sender.role === 'owner' || sender.role === 'moderator') {
    const targetIds = channel.memberIds.filter((uid) => uid !== sender.id);
    if (targetIds.length > 0) {
      const roleTitle = sender.role === 'owner' ? '👑 القائد Sami' : `🛡️ المشرف ${sender.displayName}`;
      await emitCommunityNotification({
        type: 'channel_important',
        title: `${roleTitle} • ${channel.name}`,
        body: trimmedText || 'أرسل صورة جديدة في القناة',
        senderId: sender.id,
        senderName: sender.displayName,
        senderRole: sender.role,
        channelId: channel.id,
        targetUserIds: targetIds,
      });
    }
  }

  return {
    id: msgId,
    channelId: channel.id,
    senderId: sender.id,
    senderName: sender.displayName,
    senderRole: sender.role,
    senderAvatarUrl: sender.avatarUrl || null,
    text: trimmedText || undefined,
    imageUrl: cloudImageUrl,
    storagePath,
    timestamp: now,
  };
}

export function subscribeToChannelMessages(
  channelId: string,
  onMessagesChange: (messages: ChatMessage[]) => void,
  onError?: (errorMsg: string) => void
): () => void {
  const q = query(collection(db, CHAT_COLLECTION), orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const validMessages: ChatMessage[] = [];
      const expiredMessages: ChatMessage[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docChannelId =
          typeof data.channelId === 'string' && data.channelId
            ? data.channelId
            : DEFAULT_CHANNEL_ID;

        const msg: ChatMessage = {
          id: String(data.id || docSnap.id),
          channelId: docChannelId,
          senderId: Number(data.senderId || 0),
          senderName: String(data.senderName || 'متداول'),
          senderRole:
            Number(data.senderId) === 1
              ? 'owner'
              : data.senderRole === 'moderator'
              ? 'moderator'
              : 'user',
          senderAvatarUrl: typeof data.senderAvatarUrl === 'string' ? data.senderAvatarUrl : null,
          text: typeof data.text === 'string' ? data.text : undefined,
          imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
          storagePath: typeof data.storagePath === 'string' ? data.storagePath : undefined,
          timestamp: Number(data.timestamp || now),
        };

        if (now - msg.timestamp < FORTY_EIGHT_HOURS_MS) {
          if (msg.channelId === channelId) {
            validMessages.push(msg);
          }
        } else {
          expiredMessages.push(msg);
        }
      });

      if (expiredMessages.length > 0) {
        void purgeExpiredFirestoreMessages(expiredMessages);
      }

      validMessages.sort((a, b) => a.timestamp - b.timestamp);
      onMessagesChange(validMessages);
    },
    (error) => {
      if (error?.code !== 'unavailable' && onError) {
        onError('تعذر الاتصال بخدمة القنوات السحابية.');
      }
    }
  );
}

// ============================================================================
// PERMANENT PRIVATE MESSAGES WITH SAMI (Never deleted after 48 hours)
// ============================================================================

export async function sendPrivateMessage(params: {
  participantId: number;
  participantName: string;
  sender: { id: number; displayName: string; role: UserRole; avatarUrl?: string | null };
  receiverId: number;
  text?: string;
  imageFileOrDataUrl?: File | string | null;
  isReport?: boolean;
}): Promise<PrivateMessage> {
  const now = Date.now();
  const msgId = `pm_${now}_${params.sender.id}_${Math.random().toString(36).substring(2, 8)}`;

  let cloudImageUrl: string | undefined;
  let storagePath: string | undefined;

  if (params.imageFileOrDataUrl) {
    const uploaded = await uploadImageToCloud(
      params.imageFileOrDataUrl,
      params.isReport ? 'warning_evidence' : 'chat_images',
      params.sender.id
    );
    cloudImageUrl = uploaded.imageUrl;
    storagePath = uploaded.storagePath;
  }

  const trimmedText = params.text?.trim();

  const payload: Record<string, unknown> = {
    id: msgId,
    participantId: params.participantId,
    participantName: params.participantName,
    senderId: params.sender.id,
    senderName: params.sender.displayName,
    senderRole: params.sender.role,
    senderAvatarUrl: params.sender.avatarUrl || null,
    receiverId: params.receiverId,
    isReport: Boolean(params.isReport),
    timestamp: now,
  };

  if (trimmedText) payload.text = trimmedText;
  if (cloudImageUrl) payload.imageUrl = cloudImageUrl;
  if (storagePath) payload.storagePath = storagePath;

  await setDoc(doc(db, PRIVATE_MESSAGES_COLLECTION, msgId), payload);

  // Emit real-time notification to the recipient
  const notifTitle =
    params.sender.id === 1
      ? '👑 رسالة خاصة من القائد Sami'
      : params.isReport
      ? `📋 بلاغ وتقرير من المشرف ${params.sender.displayName}`
      : `💬 رسالة خاصة من ${params.sender.displayName}`;

  await emitCommunityNotification({
    type: 'private_message',
    title: notifTitle,
    body: trimmedText || 'أرسل صورة مرفقة في المحادثة الخاصة',
    senderId: params.sender.id,
    senderName: params.sender.displayName,
    senderRole: params.sender.role,
    channelId: null,
    targetUserIds: [params.receiverId],
  });

  return {
    id: msgId,
    participantId: params.participantId,
    participantName: params.participantName,
    senderId: params.sender.id,
    senderName: params.sender.displayName,
    senderRole: params.sender.role,
    senderAvatarUrl: params.sender.avatarUrl || null,
    receiverId: params.receiverId,
    text: trimmedText || undefined,
    imageUrl: cloudImageUrl,
    storagePath,
    isReport: Boolean(params.isReport),
    timestamp: now,
  };
}

export function subscribeToPrivateMessages(
  participantId: number | null,
  onMessagesChange: (messages: PrivateMessage[]) => void
): () => void {
  const q = query(collection(db, PRIVATE_MESSAGES_COLLECTION), orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PrivateMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const pId = Number(data.participantId || 0);
        if (participantId !== null && pId !== participantId) return;

        list.push({
          id: String(data.id || docSnap.id),
          participantId: pId,
          participantName: String(data.participantName || 'مستخدم'),
          senderId: Number(data.senderId || 0),
          senderName: String(data.senderName || 'مستخدم'),
          senderRole:
            Number(data.senderId) === 1
              ? 'owner'
              : data.senderRole === 'moderator'
              ? 'moderator'
              : 'user',
          senderAvatarUrl: typeof data.senderAvatarUrl === 'string' ? data.senderAvatarUrl : null,
          receiverId: Number(data.receiverId || 1),
          text: typeof data.text === 'string' ? data.text : undefined,
          imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
          storagePath: typeof data.storagePath === 'string' ? data.storagePath : undefined,
          isReport: Boolean(data.isReport),
          timestamp: Number(data.timestamp || Date.now()),
        });
      });

      list.sort((a, b) => a.timestamp - b.timestamp);
      onMessagesChange(list);
    },
    () => {
      // Ignore
    }
  );
}

// ============================================================================
// WARNINGS & CHANNEL KICK ACTIONS
// ============================================================================

export function subscribeToWarnings(
  onWarningsChange: (warnings: UserWarning[]) => void
): () => void {
  const q = query(collection(db, WARNINGS_COLLECTION), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: UserWarning[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: String(data.id || docSnap.id),
          channelId: String(data.channelId || DEFAULT_CHANNEL_ID),
          channelName: String(data.channelName || ''),
          targetUserId: Number(data.targetUserId || 0),
          targetUserName: String(data.targetUserName || ''),
          issuedById: Number(data.issuedById || 1),
          issuedByName: String(data.issuedByName || ''),
          issuedByRole: data.issuedByRole === 'owner' ? 'owner' : 'moderator',
          reason: String(data.reason || ''),
          warningNumber: Number(data.warningNumber || 1),
          evidenceImageUrl: typeof data.evidenceImageUrl === 'string' ? data.evidenceImageUrl : null,
          actionType: data.actionType === 'kick' ? 'kick' : 'warning',
          timestamp: Number(data.timestamp || Date.now()),
        });
      });
      onWarningsChange(list);
    },
    () => {}
  );
}

export async function issueWarningToMember(params: {
  channel: CommunityChannel;
  targetUser: UserAccount;
  issuer: { id: number; displayName: string; role: UserRole; avatarUrl?: string | null };
  reason: string;
  evidenceFileOrDataUrl?: File | string | null;
}): Promise<number> {
  const now = Date.now();
  const newWarningCount = (params.targetUser.warningsCount || 0) + 1;
  const warningId = `warn_${now}_${params.targetUser.id}`;

  let evidenceUrl: string | null = null;
  if (params.evidenceFileOrDataUrl) {
    const uploaded = await uploadImageToCloud(
      params.evidenceFileOrDataUrl,
      'warning_evidence',
      params.issuer.id
    );
    evidenceUrl = uploaded.imageUrl;
  }

  await setDoc(doc(db, WARNINGS_COLLECTION, warningId), {
    id: warningId,
    channelId: params.channel.id,
    channelName: params.channel.name,
    targetUserId: params.targetUser.id,
    targetUserName: params.targetUser.displayName,
    issuedById: params.issuer.id,
    issuedByName: params.issuer.displayName,
    issuedByRole: params.issuer.role,
    reason: params.reason.trim(),
    warningNumber: newWarningCount,
    evidenceImageUrl: evidenceUrl,
    actionType: 'warning',
    timestamp: now,
  });

  await updateDoc(doc(db, 'community_users', String(params.targetUser.id)), {
    warningsCount: newWarningCount,
    updatedAt: now,
  });

  // Also post an official warning notice inside the channel
  await sendChannelMessage(params.channel, params.issuer, {
    text: `⚠️ إنذار رسمي (${newWarningCount}/3) للمشترك ${params.targetUser.displayName}: ${params.reason.trim()}`,
    imageUrl: evidenceUrl || undefined,
  });

  await emitCommunityNotification({
    type: 'warning',
    title: `⚠️ إنذار جديد (${newWarningCount}/3) • ${params.channel.name}`,
    body: `تم تسجيل مخالفة على ${params.targetUser.displayName}: ${params.reason.trim()}`,
    senderId: params.issuer.id,
    senderName: params.issuer.displayName,
    senderRole: params.issuer.role,
    channelId: params.channel.id,
    targetUserIds: Array.from(new Set([params.targetUser.id, 1])),
  });

  return newWarningCount;
}

export async function kickMemberFromChannelAndReport(params: {
  channel: CommunityChannel;
  targetUser: UserAccount;
  issuer: { id: number; displayName: string; role: UserRole; avatarUrl?: string | null };
  reason: string;
  evidenceFileOrDataUrl?: File | string | null;
}): Promise<void> {
  if (params.targetUser.id === 1) {
    throw new Error('لا يمكن طرد القائد Sami.');
  }

  const now = Date.now();
  let evidenceUrl: string | null = null;
  if (params.evidenceFileOrDataUrl) {
    const uploaded = await uploadImageToCloud(
      params.evidenceFileOrDataUrl,
      'warning_evidence',
      params.issuer.id
    );
    evidenceUrl = uploaded.imageUrl;
  }

  // 1. Remove member from channel and clear their verified password for this channel in cloud
  const updatedMembers = params.channel.memberIds.filter((id) => id !== params.targetUser.id);
  await updateCloudChannel(params.channel.id, { memberIds: updatedMembers });

  try {
    const updatedVerified = { ...(params.targetUser.verifiedChannels || {}) };
    delete updatedVerified[params.channel.id];
    await updateDoc(doc(db, 'community_users', String(params.targetUser.id)), {
      verifiedChannels: updatedVerified,
      updatedAt: now,
    });
  } catch {
    // Ignore
  }

  // 2. Log kick in user_warnings
  const kickId = `kick_${now}_${params.targetUser.id}`;
  await setDoc(doc(db, WARNINGS_COLLECTION, kickId), {
    id: kickId,
    channelId: params.channel.id,
    channelName: params.channel.name,
    targetUserId: params.targetUser.id,
    targetUserName: params.targetUser.displayName,
    issuedById: params.issuer.id,
    issuedByName: params.issuer.displayName,
    issuedByRole: params.issuer.role,
    reason: params.reason.trim(),
    warningNumber: params.targetUser.warningsCount || 3,
    evidenceImageUrl: evidenceUrl,
    actionType: 'kick',
    timestamp: now,
  });

  // 3. Automatically send official Report to Owner Sami via Permanent Private Chat
  const reportText = [
    `🚨 تقرير طرد مشترك من القناة (${params.channel.name})`,
    `• اسم المشترك: ${params.targetUser.displayName} (@${params.targetUser.username})`,
    `• عدد الإنذارات: ${params.targetUser.warningsCount || 3} / 3`,
    `• المشرف المنفذ: ${params.issuer.displayName}`,
    `• سبب الطرد والمخالفة: ${params.reason.trim()}`,
  ].join('\n');

  await sendPrivateMessage({
    participantId: params.issuer.id === 1 ? params.targetUser.id : params.issuer.id,
    participantName:
      params.issuer.id === 1 ? params.targetUser.displayName : params.issuer.displayName,
    sender: params.issuer,
    receiverId: 1,
    text: reportText,
    imageFileOrDataUrl: evidenceUrl,
    isReport: true,
  });

  // 4. Notify target user and Owner
  await emitCommunityNotification({
    type: 'kick',
    title: `🚫 تم استبعاد ${params.targetUser.displayName} من ${params.channel.name}`,
    body: params.reason.trim(),
    senderId: params.issuer.id,
    senderName: params.issuer.displayName,
    senderRole: params.issuer.role,
    channelId: params.channel.id,
    targetUserIds: Array.from(new Set([params.targetUser.id, 1])),
  });
}

// ============================================================================
// REAL-TIME TARGETED NOTIFICATIONS
// ============================================================================

export async function emitCommunityNotification(
  notif: Omit<CommunityNotification, 'id' | 'timestamp'>
): Promise<void> {
  try {
    const now = Date.now();
    const id = `notif_${now}_${notif.senderId}_${Math.random().toString(36).substring(2, 7)}`;
    await setDoc(doc(db, NOTIFICATIONS_COLLECTION, id), {
      id,
      type: notif.type,
      title: notif.title,
      body: notif.body,
      senderId: notif.senderId,
      senderName: notif.senderName,
      senderRole: notif.senderRole,
      channelId: notif.channelId || null,
      targetUserIds: notif.targetUserIds,
      timestamp: now,
    });
  } catch {
    // Ignore notification write errors
  }
}

export function subscribeToUserNotifications(
  currentUserId: number,
  onNotification: (notif: CommunityNotification) => void
): () => void {
  const sessionStartTime = Date.now();
  const seenIds = new Set<string>();
  const q = query(collection(db, NOTIFICATIONS_COLLECTION), orderBy('timestamp', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        const id = String(data.id || change.doc.id);
        if (seenIds.has(id)) return;
        seenIds.add(id);

        const timestamp = Number(data.timestamp || 0);
        if (timestamp < sessionStartTime - 5000) return;

        const senderId = Number(data.senderId || 0);
        if (senderId === currentUserId) return;

        const targetIds = Array.isArray(data.targetUserIds)
          ? data.targetUserIds.map((n) => Number(n))
          : [];
        if (!targetIds.includes(currentUserId)) return;

        const notif: CommunityNotification = {
          id,
          type: (data.type as CommunityNotification['type']) || 'channel_important',
          title: String(data.title || 'إشعار جديد'),
          body: String(data.body || ''),
          senderId,
          senderName: String(data.senderName || ''),
          senderRole:
            data.senderRole === 'owner'
              ? 'owner'
              : data.senderRole === 'moderator'
              ? 'moderator'
              : 'user',
          channelId: typeof data.channelId === 'string' ? data.channelId : null,
          targetUserIds: targetIds,
          timestamp,
        };

        onNotification(notif);

        // Trigger Browser/System Notification if supported and permitted
        try {
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(notif.title, {
                body: notif.body,
                icon: '/app-icon.png',
              });
            }
          }
        } catch {
          // Ignore browser notification restrictions
        }
      });
    },
    () => {}
  );
}
