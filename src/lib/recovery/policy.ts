import { RecoveryActionType } from "@prisma/client";
import type { RecoveryPolicyConfig } from "./types";

/**
 * Default recovery policy configuration.
 * These are deterministic rules that AI cannot bypass.
 */
export const DEFAULT_RECOVERY_POLICY: RecoveryPolicyConfig = {
  maxAttempts: 3,
  maxRecoveryAmountPaise: 10000000, // ₹1,00,000 maximum allowable
  minRecoveryProbability: 0.15,      // 15% minimum probability
  retryDelayMinutes: 30,             // Cooldown between retries
  expirationHours: 72,              // 3 days window
  highValueApprovalThresholdPaise: 5000000, // ₹50,000 requires merchant approval
  allowedActions: [
    RecoveryActionType.PAYMENT_RETRY,
    RecoveryActionType.ALTERNATE_METHOD,
    RecoveryActionType.SCHEDULED_RETRY,
    RecoveryActionType.MERCHANT_ESCALATION,
    RecoveryActionType.STOP_RECOVERY,
  ],
};

/**
 * Failure type labels for UI display
 */
export const FAILURE_TYPE_LABELS: Record<string, string> = {
  payment_failure: "Payment Failure",
  checkout_abandonment: "Checkout Abandonment",
  subscription_failure: "Subscription Failure",
  repeated_failure: "Repeated Failure",
  method_degradation: "Payment Method Degradation",
};

/**
 * Recovery action labels for UI display
 */
export const ACTION_TYPE_LABELS: Record<string, string> = {
  PAYMENT_RETRY: "Payment Retry",
  ALTERNATE_METHOD: "Alternative Payment Method",
  SCHEDULED_RETRY: "Scheduled Retry",
  MERCHANT_ESCALATION: "Merchant Escalation",
  STOP_RECOVERY: "Stop Recovery",
};

/**
 * Recovery case status labels for UI display
 */
export const CASE_STATUS_LABELS: Record<string, string> = {
  DETECTED: "Detected",
  ANALYZING: "Analyzing",
  ACTION_PENDING: "Action Pending",
  EXECUTING: "Executing",
  RECOVERED: "Recovered",
  FAILED: "Failed",
  ESCALATED: "Escalated",
  STOPPED: "Stopped",
  EXPIRED: "Expired",
};

/**
 * Base recovery probability estimates by failure type.
 * These are starting points adjusted by customer history and payment method performance.
 */
export const BASE_RECOVERY_PROBABILITIES: Record<string, number> = {
  payment_failure: 0.65,
  checkout_abandonment: 0.40,
  subscription_failure: 0.55,
  repeated_failure: 0.30,
  method_degradation: 0.70,
};

/**
 * Payment method success rate adjustments for recovery probability.
 */
export const METHOD_RECOVERY_ADJUSTMENTS: Record<string, number> = {
  upi: 0.05,
  card: 0.10,
  netbanking: -0.05,
  wallet: 0.08,
};
