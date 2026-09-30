import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { Challenge, Milestone, Trade } from '../types';
import { getSavedUserSession, AUTHORIZED_USERS } from '../data/auth';
import { db, deleteCloudImage, deleteMultipleCloudImages } from './firebase';

export const TOTAL_MILESTONES = 150;

// Purge legacy un-scoped keys so users never see another user's data or old base64 images
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('trading_challenge_state_v1');
    window.localStorage.removeItem('trading_challenge_trades_v1');
    window.localStorage.removeItem('trading_challenge_milestones_v1');
    window.localStorage.removeItem('sami_chat_messages_v2');
  }
} catch {
  // Ignore
}

export function createInitialMilestones(
  challengeId: string,
  totalCount: number = TOTAL_MILESTONES
): Milestone[] {
  const milestones: Milestone[] = [];
  for (let i = 1; i <= totalCount; i++) {
    milestones.push({
      id: `${challengeId}_milestone_${i}`,
      challengeId,
      milestoneNumber: i,
      profitCents: null,
      balanceCents: null,
      status: 'PENDING',
      tradeId: null,
      timestamp: null,
      attachmentPath: null,
    });
  }
  return milestones;
}

export function createInitialChallenge(
  userId: number,
  defaultUserName = '',
  timestamp = Date.now()
): Challenge {
  return {
    id: `challenge_u${userId}_${timestamp || 1}`,
    userName: defaultUserName,
    initialCapitalCents: 10000, // $100.00
    currentBalanceCents: 10000, // $100.00
    targetBalanceCents: 300000, // $3,000.00
    tradeCount: 0,
    challengeStarted: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Rebuild the milestones deterministically from a Challenge and its Trades list.
 * Includes the 150 base milestones plus 1 additional milestone at the end for each losing trade.
 */
export function buildMilestonesFromTrades(challengeId: string, trades: Trade[]): Milestone[] {
  const lossCount = trades.filter((t) => t.type === 'LOSS').length;
  const totalSlots = TOTAL_MILESTONES + lossCount;
  const milestones = createInitialMilestones(challengeId, totalSlots);
  for (const t of trades) {
    const idx = t.tradeNumber - 1;
    if (idx >= 0 && idx < milestones.length) {
      milestones[idx] = {
        id: `${challengeId}_milestone_${t.tradeNumber}`,
        challengeId,
        milestoneNumber: t.tradeNumber,
        profitCents: t.resultCents,
        balanceCents: t.newBalanceCents,
        status: t.type,
        tradeId: t.id,
        timestamp: t.timestamp,
        attachmentPath:
          t.attachmentPath && !t.attachmentPath.startsWith('data:') ? t.attachmentPath : null,
      };
    }
  }
  return milestones;
}

export class StorageService {
  private static isSubmitting = false;
  private static activeUserId: number = getSavedUserSession()?.id || 0;
  private static activeUserName: string = getSavedUserSession()?.displayName || '';

  private static getChallengeKey(userId: number): string {
    return `sami_u_${userId}_challenge_v3`;
  }

  private static getTradesKey(userId: number): string {
    return `sami_u_${userId}_trades_v3`;
  }

  private static getMilestonesKey(userId: number): string {
    return `sami_u_${userId}_milestones_v3`;
  }

  /**
   * Switches the active user context so each user's data is strictly isolated.
   */
  public static setCurrentUser(userId: number | null, displayName = ''): void {
    this.activeUserId = userId ?? 0;
    this.activeUserName = displayName;
  }

  public static getActiveUserId(): number {
    if (!this.activeUserId) {
      const saved = getSavedUserSession();
      if (saved) {
        this.activeUserId = saved.id;
        this.activeUserName = saved.displayName;
      }
    }
    return this.activeUserId;
  }

  public static hasLocalChallenge(userId: number): boolean {
    if (!userId) return false;
    try {
      return Boolean(localStorage.getItem(this.getChallengeKey(userId)));
    } catch {
      return false;
    }
  }

  public static getChallenge(): Challenge {
    const userId = this.getActiveUserId();
    if (!userId) {
      return createInitialChallenge(0, '', 0);
    }

    try {
      const data = localStorage.getItem(this.getChallengeKey(userId));
      if (data) {
        const parsed = JSON.parse(data) as Challenge;
        if (parsed && parsed.id) {
          if (!parsed.userName && this.activeUserName) {
            parsed.userName = this.activeUserName;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load user challenge', e);
    }

    // Return an un-persisted placeholder (updatedAt = 0) until cloud sync or user action occurs
    // so a fresh install or new device never overwrites existing cloud data in Firestore.
    return createInitialChallenge(userId, this.activeUserName, 0);
  }

  public static saveChallenge(challenge: Challenge, preserveTimestamp = false): void {
    const userId = this.getActiveUserId();
    if (!userId) return;
    try {
      if (!preserveTimestamp) {
        challenge.updatedAt = Date.now();
      }
      localStorage.setItem(this.getChallengeKey(userId), JSON.stringify(challenge));
    } catch (e) {
      console.error('Failed to save user challenge', e);
    }
  }

  public static getTrades(): Trade[] {
    const userId = this.getActiveUserId();
    if (!userId) return [];

    try {
      const data = localStorage.getItem(this.getTradesKey(userId));
      if (data) {
        const parsed = JSON.parse(data) as Trade[];
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load user trades', e);
    }
    return [];
  }

  /**
   * Saves trades without ever storing raw base64 images in localStorage.
   * Only cloud URLs (Firebase Storage) are stored.
   */
  public static saveTrades(trades: Trade[]): void {
    const userId = this.getActiveUserId();
    if (!userId) return;
    try {
      const sanitized = trades.map((t) => ({
        ...t,
        attachmentPath:
          t.attachmentPath && !t.attachmentPath.startsWith('data:') ? t.attachmentPath : null,
      }));
      localStorage.setItem(this.getTradesKey(userId), JSON.stringify(sanitized));
    } catch (e) {
      console.error('Failed to save user trades', e);
    }
  }

  public static getMilestones(challengeId?: string): Milestone[] {
    const userId = this.getActiveUserId();
    if (!userId) {
      return createInitialMilestones(challengeId || 'inactive');
    }

    const trades = this.getTrades();
    const expectedTotal = TOTAL_MILESTONES + trades.filter((t) => t.type === 'LOSS').length;

    try {
      const data = localStorage.getItem(this.getMilestonesKey(userId));
      if (data) {
        const parsed: Milestone[] = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length === expectedTotal) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load user milestones', e);
    }

    const activeChallenge = this.getChallenge();
    const built = buildMilestonesFromTrades(challengeId || activeChallenge.id, trades);
    if (this.hasLocalChallenge(userId)) {
      this.saveMilestones(built);
    }
    return built;
  }

  public static saveMilestones(milestones: Milestone[]): void {
    const userId = this.getActiveUserId();
    if (!userId) return;
    try {
      const sanitized = milestones.map((m) => ({
        ...m,
        attachmentPath:
          m.attachmentPath && !m.attachmentPath.startsWith('data:') ? m.attachmentPath : null,
      }));
      localStorage.setItem(this.getMilestonesKey(userId), JSON.stringify(sanitized));
    } catch (e) {
      console.error('Failed to save user milestones', e);
    }
  }

  /**
   * Syncs the active user's complete challenge, trades, milestones (including extra slots from losses), counts, and settings to Firestore.
   * Only cloud image URLs (never base64 data) are stored in Firestore.
   */
  public static async syncToFirestore(
    challenge: Challenge,
    trades: Trade[],
    milestones?: Milestone[]
  ): Promise<void> {
    const userId = this.getActiveUserId();
    if (!userId) return;

    const account = AUTHORIZED_USERS.find((u) => u.id === userId);
    const username = account?.username || challenge.userName || this.activeUserName;

    const sanitizedTrades = trades.map((t) => ({
      id: t.id,
      challengeId: t.challengeId,
      tradeNumber: t.tradeNumber,
      resultCents: t.resultCents,
      oldBalanceCents: t.oldBalanceCents,
      newBalanceCents: t.newBalanceCents,
      type: t.type,
      attachmentPath:
        t.attachmentPath && !t.attachmentPath.startsWith('data:') ? t.attachmentPath : null,
      timestamp: t.timestamp,
      ...(t.note ? { note: t.note } : {}),
    }));

    const completedCount = sanitizedTrades.filter((t) => t.type === 'WIN').length;
    const failedCount = sanitizedTrades.filter((t) => t.type === 'LOSS').length;
    const expectedMilestoneCount = TOTAL_MILESTONES + failedCount;

    const resolvedMilestones = (
      milestones && milestones.length === expectedMilestoneCount
        ? milestones
        : buildMilestonesFromTrades(challenge.id, sanitizedTrades)
    ).map((m) => ({
      id: m.id,
      challengeId: m.challengeId,
      milestoneNumber: m.milestoneNumber,
      profitCents: m.profitCents,
      balanceCents: m.balanceCents,
      status: m.status,
      tradeId: m.tradeId,
      timestamp: m.timestamp,
      attachmentPath:
        m.attachmentPath && !m.attachmentPath.startsWith('data:') ? m.attachmentPath : null,
    }));

    const remainingCount = Math.max(0, TOTAL_MILESTONES - completedCount);
    const updatedAt = Math.floor(challenge.updatedAt || Date.now());

    try {
      await setDoc(doc(db, 'user_challenges', String(userId)), {
        userId,
        username,
        challenge: {
          ...challenge,
          updatedAt,
        },
        completedCount,
        remainingCount,
        failedCount,
        trades: sanitizedTrades,
        milestones: resolvedMilestones,
        settings: {
          userName: challenge.userName || username,
          initialCapitalCents: challenge.initialCapitalCents,
          targetBalanceCents: challenge.targetBalanceCents,
        },
        updatedAt,
      });
    } catch (err) {
      console.warn('Firestore user challenge sync error:', err);
    }
  }

  /**
   * Applies a Firestore user document snapshot to local cache.
   */
  private static applyCloudDataToLocal(data: Record<string, unknown>): boolean {
    if (!data || !data.challenge) return false;

    const cloudChallenge = data.challenge as Challenge;
    const cloudTrades = Array.isArray(data.trades) ? (data.trades as Trade[]) : [];
    const expectedMilestoneCount =
      TOTAL_MILESTONES + cloudTrades.filter((t) => t.type === 'LOSS').length;
    const cloudMilestones =
      Array.isArray(data.milestones) && data.milestones.length === expectedMilestoneCount
        ? (data.milestones as Milestone[])
        : buildMilestonesFromTrades(cloudChallenge.id, cloudTrades);

    const localChallenge = this.getChallenge();

    if ((cloudChallenge.updatedAt || 0) >= (localChallenge.updatedAt || 0)) {
      this.saveChallenge(cloudChallenge, true);
      this.saveTrades(cloudTrades);
      this.saveMilestones(cloudMilestones);
      return true;
    }
    return false;
  }

  /**
   * Explicitly loads a user's complete data from Firebase Cloud Firestore upon login.
   */
  public static async loadUserFromCloud(
    userId: number,
    defaultDisplayName: string
  ): Promise<{ challenge: Challenge; trades: Trade[]; milestones: Milestone[] }> {
    this.setCurrentUser(userId, defaultDisplayName);
    const userDocRef = doc(db, 'user_challenges', String(userId));

    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as Record<string, unknown>;
        this.applyCloudDataToLocal(data);
      } else {
        // First time this user has ever logged in on any device
        if (!this.hasLocalChallenge(userId)) {
          const initial = createInitialChallenge(userId, defaultDisplayName, Date.now());
          const initialMilestones = createInitialMilestones(initial.id);
          this.saveChallenge(initial, true);
          this.saveTrades([]);
          this.saveMilestones(initialMilestones);
          await this.syncToFirestore(initial, [], initialMilestones);
        } else {
          const localChallenge = this.getChallenge();
          const localTrades = this.getTrades();
          const localMilestones = this.getMilestones(localChallenge.id);
          await this.syncToFirestore(localChallenge, localTrades, localMilestones);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch user cloud data on login:', err);
    }

    const challenge = this.getChallenge();
    const trades = this.getTrades();
    const milestones = this.getMilestones(challenge.id);
    return { challenge, trades, milestones };
  }

  /**
   * Subscribes to the user's cloud challenge & trade data in Firestore so data stays synced across devices.
   */
  public static subscribeToUserCloudData(
    userId: number,
    defaultDisplayName: string,
    onUpdate: () => void
  ): () => void {
    this.setCurrentUser(userId, defaultDisplayName);
    const userDocRef = doc(db, 'user_challenges', String(userId));

    return onSnapshot(
      userDocRef,
      (snap) => {
        if (!snap.exists()) {
          if (!this.hasLocalChallenge(userId)) {
            const initial = createInitialChallenge(userId, defaultDisplayName, Date.now());
            const initialMilestones = createInitialMilestones(initial.id);
            this.saveChallenge(initial, true);
            this.saveTrades([]);
            this.saveMilestones(initialMilestones);
            void this.syncToFirestore(initial, [], initialMilestones);
            onUpdate();
          } else {
            const localChallenge = this.getChallenge();
            const localTrades = this.getTrades();
            const localMilestones = this.getMilestones(localChallenge.id);
            void this.syncToFirestore(localChallenge, localTrades, localMilestones);
          }
          return;
        }

        const data = snap.data() as Record<string, unknown>;
        if (this.applyCloudDataToLocal(data)) {
          onUpdate();
        }
      },
      (err) => {
        console.warn('Failed to subscribe to user cloud data:', err);
      }
    );
  }

  public static updateSettings(
    userName: string,
    initialCapitalCents: number,
    targetBalanceCents: number
  ): Challenge {
    const challenge = this.getChallenge();
    challenge.userName = userName.trim() || this.activeUserName;
    challenge.targetBalanceCents = targetBalanceCents;

    if (!challenge.challengeStarted) {
      challenge.initialCapitalCents = initialCapitalCents;
      challenge.currentBalanceCents = initialCapitalCents;
    }

    this.saveChallenge(challenge);
    const trades = this.getTrades();
    const milestones = this.getMilestones(challenge.id);
    void this.syncToFirestore(challenge, trades, milestones);
    return challenge;
  }

  public static startChallenge(initialCapitalCents?: number): Challenge {
    const challenge = this.getChallenge();
    const existingTrades = this.getTrades();
    const existingMilestones = this.getMilestones(challenge.id);

    // Delete any existing trade images from Firebase Storage
    const urlsToDelete = [
      ...existingTrades.map((t) => t.attachmentPath),
      ...existingMilestones.map((m) => m.attachmentPath),
    ];
    void deleteMultipleCloudImages(urlsToDelete);

    const capital = initialCapitalCents ?? challenge.initialCapitalCents;

    challenge.initialCapitalCents = capital;
    challenge.currentBalanceCents = capital;
    challenge.tradeCount = 0;
    challenge.challengeStarted = true;
    challenge.updatedAt = Date.now();

    const initialMilestones = createInitialMilestones(challenge.id);
    this.saveChallenge(challenge, true);
    this.saveTrades([]);
    this.saveMilestones(initialMilestones);
    void this.syncToFirestore(challenge, [], initialMilestones);

    return challenge;
  }

  public static recordTrade(
    resultCents: number,
    attachmentUrl: string | null = null,
    note?: string
  ): { challenge: Challenge; trade: Trade; milestone: Milestone } {
    if (this.isSubmitting) {
      throw new Error('عملية التسجيل قيد التنفيذ، يرجى الانتظار.');
    }

    this.isSubmitting = true;
    try {
      const challenge = this.getChallenge();

      if (!challenge.challengeStarted) {
        throw new Error('يجب بدء الرحلة أولاً.');
      }

      if (resultCents === 0) {
        throw new Error('لا يمكن أن تكون نتيجة الصفقة صفراً.');
      }

      const trades = this.getTrades();
      const completedWins = trades.filter((t) => t.type === 'WIN').length;

      if (completedWins >= TOTAL_MILESTONES) {
        throw new Error('تم إكمال جميع محطات الرحلة الـ150.');
      }

      const milestones = this.getMilestones(challenge.id);

      const oldBalance = challenge.currentBalanceCents;
      const newBalance = oldBalance + resultCents;
      const tradeNumber = challenge.tradeCount + 1;
      const type = resultCents > 0 ? 'WIN' : 'LOSS';
      const timestamp = Date.now();
      const tradeId = `trade_${tradeNumber}_${timestamp}`;

      // Ensure only Cloud URL is stored (never base64 in localStorage or Firestore)
      const safeAttachmentUrl =
        attachmentUrl && !attachmentUrl.startsWith('data:') ? attachmentUrl : null;

      const newTrade: Trade = {
        id: tradeId,
        challengeId: challenge.id,
        tradeNumber,
        resultCents,
        oldBalanceCents: oldBalance,
        newBalanceCents: newBalance,
        type,
        attachmentPath: safeAttachmentUrl,
        timestamp,
        note,
      };

      const milestoneIndex = tradeNumber - 1;
      if (milestones[milestoneIndex]) {
        milestones[milestoneIndex] = {
          ...milestones[milestoneIndex],
          profitCents: resultCents,
          balanceCents: newBalance,
          status: type,
          tradeId,
          timestamp,
          attachmentPath: safeAttachmentUrl,
        };
      }

      // When a losing trade is recorded, automatically append a new pending milestone slot at the end of the table
      if (type === 'LOSS') {
        const nextMilestoneNumber = milestones.length + 1;
        milestones.push({
          id: `${challenge.id}_milestone_${nextMilestoneNumber}`,
          challengeId: challenge.id,
          milestoneNumber: nextMilestoneNumber,
          profitCents: null,
          balanceCents: null,
          status: 'PENDING',
          tradeId: null,
          timestamp: null,
          attachmentPath: null,
        });
      }

      challenge.currentBalanceCents = newBalance;
      challenge.tradeCount = tradeNumber;
      challenge.updatedAt = timestamp;

      trades.push(newTrade);
      this.saveTrades(trades);
      this.saveMilestones(milestones);
      this.saveChallenge(challenge, true);
      void this.syncToFirestore(challenge, trades, milestones);

      return {
        challenge,
        trade: newTrade,
        milestone: milestones[milestoneIndex],
      };
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Deletes a specific trade, removes its associated image from Firebase Storage,
   * recalculates balances/milestones, and syncs to Firestore.
   */
  public static async deleteTrade(tradeId: string): Promise<Challenge> {
    const challenge = this.getChallenge();
    const trades = this.getTrades();
    const target = trades.find((t) => t.id === tradeId);

    if (target?.attachmentPath) {
      await deleteCloudImage(target.attachmentPath);
    }

    const remaining = trades
      .filter((t) => t.id !== tradeId)
      .sort((a, b) => a.tradeNumber - b.tradeNumber);

    let runningBalance = challenge.initialCapitalCents;
    const recalculatedTrades: Trade[] = remaining.map((t, index) => {
      const oldBalanceCents = runningBalance;
      const newBalanceCents = oldBalanceCents + t.resultCents;
      runningBalance = newBalanceCents;
      return {
        ...t,
        tradeNumber: index + 1,
        oldBalanceCents,
        newBalanceCents,
      };
    });

    challenge.currentBalanceCents = runningBalance;
    challenge.tradeCount = recalculatedTrades.length;
    challenge.updatedAt = Date.now();

    const rebuiltMilestones = buildMilestonesFromTrades(challenge.id, recalculatedTrades);
    this.saveChallenge(challenge, true);
    this.saveTrades(recalculatedTrades);
    this.saveMilestones(rebuiltMilestones);
    await this.syncToFirestore(challenge, recalculatedTrades, rebuiltMilestones);

    return challenge;
  }

  /**
   * Resets the current challenge and deletes all associated trade images from Firebase Storage.
   */
  public static resetChallenge(): Challenge {
    const challenge = this.getChallenge();
    const existingTrades = this.getTrades();
    const existingMilestones = this.getMilestones(challenge.id);

    const urlsToDelete = [
      ...existingTrades.map((t) => t.attachmentPath),
      ...existingMilestones.map((m) => m.attachmentPath),
    ];
    void deleteMultipleCloudImages(urlsToDelete);

    challenge.currentBalanceCents = challenge.initialCapitalCents;
    challenge.tradeCount = 0;
    challenge.updatedAt = Date.now();

    const initialMilestones = createInitialMilestones(challenge.id);
    this.saveChallenge(challenge, true);
    this.saveTrades([]);
    this.saveMilestones(initialMilestones);
    void this.syncToFirestore(challenge, [], initialMilestones);

    return challenge;
  }

  /**
   * Starts a brand new challenge with a new initial capital and deletes all old trade images from Firebase Storage.
   */
  public static startNewChallenge(newInitialCapitalCents: number): Challenge {
    const userId = this.getActiveUserId();
    const challenge = this.getChallenge();
    const existingTrades = this.getTrades();
    const existingMilestones = this.getMilestones(challenge.id);

    const urlsToDelete = [
      ...existingTrades.map((t) => t.attachmentPath),
      ...existingMilestones.map((m) => m.attachmentPath),
    ];
    void deleteMultipleCloudImages(urlsToDelete);

    const now = Date.now();

    challenge.id = `challenge_u${userId}_${now}`;
    challenge.initialCapitalCents = newInitialCapitalCents;
    challenge.currentBalanceCents = newInitialCapitalCents;
    challenge.tradeCount = 0;
    challenge.challengeStarted = true;
    challenge.createdAt = now;
    challenge.updatedAt = now;

    const initialMilestones = createInitialMilestones(challenge.id);
    this.saveChallenge(challenge, true);
    this.saveTrades([]);
    this.saveMilestones(initialMilestones);
    void this.syncToFirestore(challenge, [], initialMilestones);

    return challenge;
  }
}
