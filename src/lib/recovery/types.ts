import {
  RecoveryCaseStatus,
  RecoveryActionType,
  RecoveryStopReason,
  PaymentStatus,
} from "@prisma/client";

// ─── Trusted Snapshot Type ───────────────────────────

export interface TrustedFinancialSnapshot {
  paymentId: string;
  orderId: string;
  merchantId: string;
  actualAmountPaise: number;
  currency: string;
  actualPaymentStatus: PaymentStatus | string;
  actualAttemptCount: number;
  maxAllowedAttempts: number;
  caseCreatedAt: Date;
  lastActionExecutedAt: Date | null;
  hasActiveExecutingAction: boolean;
  hasPreviousRecoveryCredit: boolean;
}

// ─── AI Advisory Types (Untrusted) ───────────────────

export interface AIRecommendation {
  analysis: string;
  recommendedAction: RecoveryActionType;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
  evidenceFactors: string[];
  alternativeAction?: RecoveryActionType;
  provider: "gemini" | "openai" | "deterministic_engine";
  generatedAt: Date;
  rawAnalysis?: string;
}

// ─── Policy Engine Types (Deterministic Gatekeeper) ──

export interface PolicyCheck {
  rule: string;
  passed: boolean;
  reason: string;
}

export interface PolicyValidationResult {
  allowed: boolean;
  checks: PolicyCheck[];
  reasons: string[];
  blockingRule?: string;
}

export interface PolicyDecision {
  allowed: boolean;
  action: RecoveryActionType;
  reasons: string[];
  checks: PolicyCheck[];
  blockingRule?: string;
  requiresMerchantApproval: boolean;
  evaluatedAt: Date;
  trustedSnapshot: TrustedFinancialSnapshot;
}

export interface RecoveryPolicyConfig {
  maxAttempts: number;
  maxRecoveryAmountPaise: number;
  minRecoveryProbability: number;
  retryDelayMinutes: number;
  expirationHours: number;
  allowedActions: RecoveryActionType[];
  highValueApprovalThresholdPaise: number;
}

// ─── Recovery Command (Validated Execution Payload) ──

export interface RecoveryCommand {
  commandId: string;
  recoveryCaseId: string;
  merchantId: string;
  validatedAction: RecoveryActionType;
  attemptNumber: number;
  authorizedAmountPaise: number;
  currency: string;
  policyDecision: PolicyDecision;
  dispatchedAt: Date;
}

// ─── Recovery Result (Verified Outcome) ──────────────

export interface RecoveryResult {
  recoveryCaseId: string;
  actionId: string;
  status: "SUCCESS" | "FAILED" | "BLOCKED" | "AWAITING_PAYMENT";
  recoveredAmountPaise: number;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  verifiedVia: "webhook" | "direct_api" | "simulation";
  completedAt: Date;
  error?: string;
}

// ─── Recovery Case Models & DTOs ────────────────────

export interface RecoveryCaseCreateInput {
  merchantId: string;
  paymentId: string;
  orderId: string;
  customerId?: string;
  riskAmount: number;
  failureType: string;
  failureReason?: string;
  paymentMethod?: string;
  isSimulated?: boolean;
}

export interface RecoveryCaseWithDetails {
  id: string;
  merchantId: string;
  paymentId: string;
  orderId: string;
  customerId: string | null;
  riskAmount: number;
  failureType: string;
  failureReason: string | null;
  paymentMethod: string | null;
  recoveryProbability: number;
  expectedRecoveryAmount: number;
  recommendedAction: RecoveryActionType | null;
  selectedAction: RecoveryActionType | null;
  status: RecoveryCaseStatus;
  attemptCount: number;
  maxAttempts: number;
  recoveredAmount: number;
  stopReason: RecoveryStopReason | null;
  escalationReason: string | null;
  aiReasoningFactors: unknown;
  policyCheckResults: unknown;
  isSimulated: boolean;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  actions: RecoveryActionRecord[];
  timeline: RecoveryTimelineRecord[];
  payment?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string | null;
    razorpayPaymentId: string | null;
    failureReason: string | null;
  };
  order?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    receipt: string | null;
    razorpayOrderId: string | null;
  };
}

export interface RecoveryActionRecord {
  id: string;
  recoveryCaseId: string;
  merchantId: string;
  actionType: RecoveryActionType;
  attemptNumber: number;
  status: string;
  input: unknown;
  output: unknown;
  newPaymentId: string | null;
  newOrderId: string | null;
  executedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface RecoveryTimelineRecord {
  id: string;
  recoveryCaseId: string;
  event: string;
  description: string;
  actor: string;
  metadata: unknown;
  createdAt: Date;
}

// ─── Recovery Metrics Types ─────────────────────────

export interface RecoveryMetrics {
  revenueAtRisk: number;          // Total ₹ at risk (paise)
  expectedRecovery: number;       // Expected ₹ recoverable (paise)
  recoveredRevenue: number;       // Actually recovered ₹ (paise)
  recoveryRate: number;           // Percentage (0-100)
  activeCases: number;
  totalCases: number;
  recoveredCases: number;
  failedCases: number;
  escalatedCases: number;
  stoppedCases: number;
  avgRecoveryTime: number | null; // Minutes
  byFailureType: FailureTypeBreakdown[];
  byPaymentMethod: MethodBreakdown[];
  byAction: ActionBreakdown[];
  trajectory?: {
    "7d": Array<{ name: string; risk: number; recovered: number }>;
    "30d": Array<{ name: string; risk: number; recovered: number }>;
    "90d": Array<{ name: string; risk: number; recovered: number }>;
  };
}

export interface FailureTypeBreakdown {
  failureType: string;
  count: number;
  riskAmount: number;
  recoveredAmount: number;
  recoveryRate: number;
}

export interface MethodBreakdown {
  method: string;
  count: number;
  riskAmount: number;
  recoveredAmount: number;
  recoveryRate: number;
}

export interface ActionBreakdown {
  actionType: string;
  count: number;
  successCount: number;
  successRate: number;
}

// ─── Agent Activity Types ───────────────────────────

export interface AgentActivityItem {
  id: string;
  recoveryCaseId: string;
  event: string;
  description: string;
  actor: string;
  riskAmount?: number;
  recoveredAmount?: number;
  metadata: unknown;
  createdAt: Date;
}

// ─── Recovery List Query ────────────────────────────

export interface ListRecoveryCasesQuery {
  page?: number;
  limit?: number;
  status?: RecoveryCaseStatus;
  failureType?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Re-export enums for convenience
export {
  RecoveryCaseStatus,
  RecoveryActionType,
  RecoveryStopReason,
  PaymentStatus,
};
