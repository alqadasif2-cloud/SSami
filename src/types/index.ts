export type TradeType = 'WIN' | 'LOSS';
export type MilestoneStatus = 'PENDING' | 'WIN' | 'LOSS';
export type UserRole = 'owner' | 'moderator' | 'user';

export interface Challenge {
  id: string;
  userName: string;
  initialCapitalCents: number;
  currentBalanceCents: number;
  targetBalanceCents: number;
  tradeCount: number;
  challengeStarted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Trade {
  id: string;
  challengeId: string;
  tradeNumber: number;
  resultCents: number;
  oldBalanceCents: number;
  newBalanceCents: number;
  type: TradeType;
  attachmentPath: string | null;
  timestamp: number;
  note?: string;
}

export interface Milestone {
  id: string;
  challengeId: string;
  milestoneNumber: number;
  profitCents: number | null;
  balanceCents: number | null;
  status: MilestoneStatus;
  tradeId: string | null;
  timestamp: number | null;
  attachmentPath: string | null;
}

export type ActiveTab =
  | 'dashboard'
  | 'channels'
  | 'admin'
  | 'private_chat'
  | 'history'
  | 'roadmap'
  | 'settings';

export type TradeFilter = 'all' | 'win' | 'loss' | 'with_image';
