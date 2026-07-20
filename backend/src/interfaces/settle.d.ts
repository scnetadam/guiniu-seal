export interface SettlementRequest {
  channel: 'alipay' | 'wechat' | 'ecny';
  totalAmount: number;
  subject: string;
  payerId: string;
  payeeId: string;
  splits?: SplitRule[];
  ruleId?: string;
  agentId?: string;
  payMode?: 'page' | 'qrcode' | 'app' | 'jsapi';
  kolTrack?: 'A' | 'B' | 'C';
  monthlyAccumulated?: number;
  dailyCount?: number;
}

export interface PrepareResponse {
  paymentId: string;
  channel: string;
  totalAmount: number;
  subject: string;
  payerId: string;
  payeeId: string;
  splits: SplitResult[];
  taxResult: TaxResult | null;
  walletCheck: WalletCheckResult;
  channelProfile: ChannelProfile;
  thresholdEval: ThresholdEvaluation;
  guiniuEval: GuiniuPointEvaluation;
  evidence: EvidenceSummary;
  hash: string;
  status: 'prepared';
  nextStep: 'confirm';
  confirmUrl: '/api/settle/confirm';
}

export interface ConfirmRequest {
  paymentId: string;
  firstConsent: boolean;
  secondConsent?: boolean;
  consentMethod?: 'api' | 'passkey' | 'face' | 'password';
  channel?: string;
  payMode?: string;
}

export interface SplitRule {
  partyId: string;
  weight: number;
  wallet?: string;
  memo?: string;
}

export interface SplitResult {
  partyId: string;
  amount: number;
  weight: number;
  wallet?: string;
  memo: string;
}

export interface TaxResult {
  netAmount: number;
  taxWithheld: number;
  needInvoice: boolean;
  riskTags: string[];
  track: 'A' | 'B' | 'C';
  detail: string;
}

export interface TaxRecord {
  id: string;
  userId: string;
  orderId: string | null;
  amount: number;
  track: string;
  taxWithheld: number;
  netAmount: number;
  state: 'pending' | 'declared' | 'verified' | 'incentivized' | 'penalized' | 'void';
  stateHistory: TaxStateTransition[];
  incentiveWeight: number;
  penaltyWeight: number;
}

export interface TaxStateTransition {
  state: string;
  at: string;
  reason: string;
}

export interface EvidenceSummary {
  evidenceId: string;
  digest: string;
  status: string;
  timestamp: string;
  fundFlowSnapshot?: FundFlowSnapshot;
}

export interface FundFlowSnapshot {
  totalAmount: number;
  splits: Array<{ partyId: string; amount: number; memo: string }>;
  taxWithheld: number;
  netAmount: number;
  taxTrack: string | null;
  taxRiskTags: string[];
}

export interface WalletCheckResult {
  available: number;
  requested: number;
  channel: string;
  probeMethod: string;
  canReserve: boolean;
  reason: string | null;
  estimatedHold: number;
  probeNote?: string;
}

export interface WalletReserveResult {
  reserved: boolean;
  orderId: string;
  amount: number;
  channel: string;
  reservedAt: string;
  expiresAt: string;
  reason?: string;
}

export interface ChannelProfile {
  id: string;
  name: string;
  modes: string[];
  balanceProbe: string;
  reserveMethod: string;
  executeMethod: string;
  costPerTx: number;
  supportsSplit: boolean;
  supportsUmbrella: boolean;
  kycRequired: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
}

export interface ThresholdEvaluation {
  action: 'direct_settle' | 'accumulate_guiniu_point';
  reason: string;
  amount: number;
  channel: string;
  pointsAdded?: number;
  costSaving?: boolean;
}

export interface GuiniuPointEvaluation {
  currentPoints: number;
  pointValue: number;
  totalValue: number;
  threshold: number;
  canTrigger: boolean;
  netAfterCost: number;
  costBreakdown: { channelCost: number; taxCost: number };
  remainingToThreshold: number;
  complianceLevel: string;
  recommendation: string;
}

export interface CollectorEvent {
  orderFlow: { orderId: string; payerId: string; payeeId: string; subject: string; status: string };
  fundFlow: { amount: number; channel: string; splits: SplitResult[]; status: string };
  taxFlow: { status: string };
  notaryFlow: { provider: string; evidenceId: string; status: string };
}

export interface CollectorResult {
  accepted: boolean;
  collectionId?: string;
  queueDepth?: number;
  reason?: string;
  blockedStreams?: string[];
}

export interface NotificationRequest {
  userId: string;
  category: string;
  channel: 'sms' | 'email' | 'login' | 'in_app';
  templateId?: string;
  variables?: Record<string, string>;
  customTitle?: string;
  customBody?: string;
  channels?: string[];
}

export interface SsoTokenSet {
  seal: string;
  deveco: string;
  verify: string;
  guiniu: string;
}

export interface LoginResponse {
  token: string;
  ssoTokens: SsoTokenSet;
  user: { id: string; nickName: string; avatarUrl: string; role: string };
  hasEarnings: boolean;
  pendingEarnings: number;
}

export interface IdempotencyCheck {
  isDuplicate: boolean;
  result?: unknown;
}

export interface DeadLetterEntry {
  id: string;
  type: string;
  source: string;
  target: string;
  payload: unknown;
  status: 'dead';
  retries: number;
  maxRetries: number;
  deadReason: string;
  deadAt: string;
}
