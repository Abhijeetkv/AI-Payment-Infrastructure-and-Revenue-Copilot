import { db } from "@/lib/db";
import {
  RecoveryActionType,
  RecoveryCaseStatus,
  PaymentStatus,
} from "@prisma/client";
import { DEFAULT_RECOVERY_POLICY } from "@/lib/recovery/policy";
import type {
  PolicyCheck,
  PolicyDecision,
  PolicyValidationResult,
  RecoveryPolicyConfig,
  TrustedFinancialSnapshot,
  AIRecommendation,
} from "@/lib/recovery/types";
import { logger } from "@/lib/logger";

interface RecoveryCaseForPolicyInput {
  id: string;
  merchantId: string;
  paymentId: string;
  riskAmount: number;
  status: RecoveryCaseStatus;
  attemptCount: number;
  maxAttempts: number;
  recoveryProbability: number;
  recoveredAmount: number;
  createdAt?: Date | string;
  payment?: {
    status: PaymentStatus | string;
    amount: number;
  } | null;
  actions?: Array<{
    status: string;
    executedAt: Date | string | null;
  }>;
}

export class RecoveryPolicyService {
  private static config: RecoveryPolicyConfig = DEFAULT_RECOVERY_POLICY;

  /**
   * Get current policy configuration
   */
  static getPolicy(): RecoveryPolicyConfig {
    return { ...this.config };
  }

  /**
   * Update runtime policy configuration
   */
  static updatePolicy(newConfig: Partial<RecoveryPolicyConfig>): RecoveryPolicyConfig {
    this.config = { ...this.config, ...newConfig };
    return { ...this.config };
  }

  /**
   * Independently re-read authoritative financial & payment data from database
   * and evaluate an untrusted AI recommendation.
   */
  static async evaluateCase(
    merchantId: string,
    caseId: string,
    recommendation: AIRecommendation | { recommendedAction: RecoveryActionType; confidence?: number }
  ): Promise<PolicyDecision> {
    const emptySnapshot: TrustedFinancialSnapshot = {
      paymentId: "unknown",
      orderId: "unknown",
      merchantId,
      actualAmountPaise: 0,
      currency: "INR",
      actualPaymentStatus: "NOT_FOUND",
      actualAttemptCount: 0,
      maxAllowedAttempts: this.config.maxAttempts,
      caseCreatedAt: new Date(),
      lastActionExecutedAt: null,
      hasActiveExecutingAction: false,
      hasPreviousRecoveryCredit: false,
    };

    let freshCase = null;
    let existingCredit = null;

    try {
      // 1. Fetch fresh authoritative state from database
      freshCase = await db.recoveryCase.findFirst({
        where: { id: caseId, merchantId },
        include: {
          payment: true,
          order: true,
          actions: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      if (freshCase) {
        existingCredit = await db.transaction.findFirst({
          where: {
            paymentId: freshCase.paymentId,
            type: "PAYMENT",
            status: "COMPLETED",
          },
        });
      }
    } catch (dbErr) {
      logger.warn("Database lookup failed during policy evaluation, failing safely", { caseId, merchantId }, dbErr);
    }

    if (!freshCase) {
      return {
        allowed: false,
        action: recommendation.recommendedAction,
        reasons: ["Recovery case does not exist in authoritative database"],
        checks: [
          {
            rule: "case_exists",
            passed: false,
            reason: `Recovery case ${caseId} not found for merchant ${merchantId}`,
          },
        ],
        blockingRule: "case_exists",
        requiresMerchantApproval: false,
        evaluatedAt: new Date(),
        trustedSnapshot: emptySnapshot,
      };
    }

    const lastAction = freshCase.actions[0];
    const hasActiveExecuting = freshCase.actions.some((a) => a.status === "EXECUTING");

    // Construct immutable trusted snapshot
    const trustedSnapshot: TrustedFinancialSnapshot = {
      paymentId: freshCase.paymentId,
      orderId: freshCase.orderId,
      merchantId: freshCase.merchantId,
      actualAmountPaise: freshCase.payment?.amount ?? freshCase.riskAmount,
      currency: freshCase.payment?.currency ?? "INR",
      actualPaymentStatus: freshCase.payment?.status ?? PaymentStatus.FAILED,
      actualAttemptCount: freshCase.attemptCount,
      maxAllowedAttempts: freshCase.maxAttempts,
      caseCreatedAt: freshCase.createdAt,
      lastActionExecutedAt: lastAction?.executedAt ? new Date(lastAction.executedAt) : null,
      hasActiveExecutingAction: hasActiveExecuting,
      hasPreviousRecoveryCredit: !!existingCredit || freshCase.recoveredAmount > 0,
    };

    // 2. Perform deterministic rule evaluation
    return this.evaluateSnapshot(trustedSnapshot, recommendation.recommendedAction, freshCase.recoveryProbability);
  }

  /**
   * Core deterministic rule evaluation engine based strictly on trusted snapshot data
   */
  static evaluateSnapshot(
    snapshot: TrustedFinancialSnapshot,
    actionType: RecoveryActionType,
    recoveryProbability: number
  ): PolicyDecision {
    const checks: PolicyCheck[] = [];
    const reasons: string[] = [];

    // Rule 1: Action allowlist check
    const actionAllowed = this.config.allowedActions.includes(actionType);
    checks.push({
      rule: "action_type_allowed",
      passed: actionAllowed,
      reason: actionAllowed
        ? `Action ${actionType} is in the permitted allowlist`
        : `Action ${actionType} is NOT a supported recovery action`,
    });
    if (!actionAllowed) {
      reasons.push(`Action type ${actionType} is not permitted by policy allowlist`);
    }

    // Rule 2: Payment state eligibility (Payment must NOT already be captured/successful)
    const paymentStatus = snapshot.actualPaymentStatus;
    const notAlreadyPaid =
      paymentStatus !== PaymentStatus.SUCCESS &&
      paymentStatus !== PaymentStatus.CAPTURED;
    checks.push({
      rule: "payment_not_already_successful",
      passed: notAlreadyPaid,
      reason: notAlreadyPaid
        ? "Payment is currently in an uncaptured/failed state eligible for recovery"
        : `Payment is already in ${paymentStatus} state (authoritative DB truth)`,
    });
    if (!notAlreadyPaid) {
      reasons.push(`Payment is already marked as ${paymentStatus}`);
    }

    // Rule 3: Payment must NOT be refunded
    const notRefunded =
      paymentStatus !== PaymentStatus.REFUNDED &&
      paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED;
    checks.push({
      rule: "payment_not_refunded",
      passed: notRefunded,
      reason: notRefunded
        ? "Payment has not been refunded"
        : `Payment has already been refunded (${paymentStatus})`,
    });
    if (!notRefunded) {
      reasons.push("Payment has been refunded");
    }

    // Rule 4: Maximum attempts limit
    const attemptsOk = snapshot.actualAttemptCount < snapshot.maxAllowedAttempts;
    checks.push({
      rule: "max_attempts_not_exceeded",
      passed: attemptsOk,
      reason: attemptsOk
        ? `Attempt ${snapshot.actualAttemptCount + 1} is within limit of ${snapshot.maxAllowedAttempts}`
        : `Maximum attempts (${snapshot.maxAllowedAttempts}) reached (actual count: ${snapshot.actualAttemptCount})`,
    });
    if (!attemptsOk) {
      reasons.push(`Maximum recovery attempts (${snapshot.maxAllowedAttempts}) exceeded`);
    }

    // Rule 5: Amount within configured policy limit (e.g. ₹1,00,000)
    const amountOk = snapshot.actualAmountPaise <= this.config.maxRecoveryAmountPaise;
    checks.push({
      rule: "amount_within_limit",
      passed: amountOk,
      reason: amountOk
        ? `Amount ₹${(snapshot.actualAmountPaise / 100).toLocaleString("en-IN")} is within policy limit`
        : `Amount ₹${(snapshot.actualAmountPaise / 100).toLocaleString("en-IN")} exceeds maximum policy limit ₹${(this.config.maxRecoveryAmountPaise / 100).toLocaleString("en-IN")}`,
    });
    if (!amountOk) {
      reasons.push("Recovery amount exceeds policy ceiling");
    }

    // Rule 6: Recovery probability above threshold (exempt for ESCALATION and STOP)
    if (
      actionType !== RecoveryActionType.MERCHANT_ESCALATION &&
      actionType !== RecoveryActionType.STOP_RECOVERY
    ) {
      const probOk = recoveryProbability >= this.config.minRecoveryProbability;
      checks.push({
        rule: "recovery_probability_sufficient",
        passed: probOk,
        reason: probOk
          ? `Estimated recovery probability ${(recoveryProbability * 100).toFixed(1)}% satisfies minimum ${(this.config.minRecoveryProbability * 100).toFixed(1)}%`
          : `Recovery probability ${(recoveryProbability * 100).toFixed(1)}% is below minimum required ${(this.config.minRecoveryProbability * 100).toFixed(1)}%`,
      });
      if (!probOk) {
        reasons.push("Recovery probability is below automated execution threshold");
      }
    }

    // Rule 7: Duplicate / Concurrency Guard (No active executing action)
    const noConcurrentExecution = !snapshot.hasActiveExecutingAction;
    checks.push({
      rule: "no_concurrent_execution",
      passed: noConcurrentExecution,
      reason: noConcurrentExecution
        ? "No other recovery action is currently executing for this case"
        : "Another recovery workflow is already actively executing for this case",
    });
    if (!noConcurrentExecution) {
      reasons.push("Concurrent recovery action already in progress");
    }

    // Rule 8: No previous successful recovery credit
    const notAlreadyRecovered = !snapshot.hasPreviousRecoveryCredit;
    checks.push({
      rule: "not_already_recovered",
      passed: notAlreadyRecovered,
      reason: notAlreadyRecovered
        ? "No prior recovery credit recorded for this payment"
        : "Payment has already been credited as recovered in financial ledger",
    });
    if (!notAlreadyRecovered) {
      reasons.push("Revenue has already been recovered in ledger");
    }

    // Rule 9: Expiration window check
    const caseCreatedAtMs = new Date(snapshot.caseCreatedAt).getTime();
    const caseAgeHours = (Date.now() - caseCreatedAtMs) / (1000 * 60 * 60);
    const notExpired = caseAgeHours <= this.config.expirationHours;
    checks.push({
      rule: "not_expired",
      passed: notExpired,
      reason: notExpired
        ? "Recovery window is active"
        : `Recovery window expired (${caseAgeHours.toFixed(1)}h > ${this.config.expirationHours}h limit)`,
    });
    if (!notExpired) {
      reasons.push("Recovery expiration window elapsed");
    }

    // Rule 10: Cooldown delay between retries
    if (snapshot.lastActionExecutedAt && actionType === RecoveryActionType.PAYMENT_RETRY) {
      const minutesSinceLast = (Date.now() - new Date(snapshot.lastActionExecutedAt).getTime()) / (1000 * 60);
      const cooldownSatisfied = minutesSinceLast >= this.config.retryDelayMinutes;
      checks.push({
        rule: "cooldown_satisfied",
        passed: cooldownSatisfied,
        reason: cooldownSatisfied
          ? "Retry cooldown window satisfied"
          : `Retry cooldown active (${minutesSinceLast.toFixed(0)}m < ${this.config.retryDelayMinutes}m required)`,
      });
      if (!cooldownSatisfied) {
        reasons.push("Retry cooldown period has not elapsed");
      }
    }

    const allPassed = checks.every((c) => c.passed);
    const requiresApproval = snapshot.actualAmountPaise >= this.config.highValueApprovalThresholdPaise;

    logger.info("Deterministic policy decision evaluated", {
      paymentId: snapshot.paymentId,
      actionType,
      allowed: allPassed,
      failedChecks: checks.filter((c) => !c.passed).map((c) => c.rule),
      requiresApproval,
    });

    return {
      allowed: allPassed,
      action: actionType,
      reasons,
      checks,
      blockingRule: allPassed ? undefined : checks.find((c) => !c.passed)?.rule,
      requiresMerchantApproval: requiresApproval,
      evaluatedAt: new Date(),
      trustedSnapshot: snapshot,
    };
  }

  /**
   * Compatibility wrapper for existing tests and synchronous callers
   */
  static async validateAction(
    recoveryCase: RecoveryCaseForPolicyInput,
    actionType: RecoveryActionType
  ): Promise<PolicyValidationResult> {
    const paymentStatus = recoveryCase.payment?.status ?? PaymentStatus.FAILED;
    const hasExecuting = recoveryCase.actions?.some((a) => a.status === "EXECUTING") ?? false;

    const snapshot: TrustedFinancialSnapshot = {
      paymentId: recoveryCase.paymentId || "test_payment",
      orderId: "test_order",
      merchantId: recoveryCase.merchantId || "test_merchant",
      actualAmountPaise: recoveryCase.payment?.amount ?? recoveryCase.riskAmount,
      currency: "INR",
      actualPaymentStatus: paymentStatus,
      actualAttemptCount: recoveryCase.attemptCount,
      maxAllowedAttempts: recoveryCase.maxAttempts,
      caseCreatedAt: recoveryCase.createdAt ? new Date(recoveryCase.createdAt) : new Date(),
      lastActionExecutedAt: null,
      hasActiveExecutingAction: hasExecuting,
      hasPreviousRecoveryCredit: recoveryCase.recoveredAmount > 0,
    };

    const decision = this.evaluateSnapshot(snapshot, actionType, recoveryCase.recoveryProbability);

    return {
      allowed: decision.allowed,
      checks: decision.checks,
      reasons: decision.reasons,
      blockingRule: decision.blockingRule,
    };
  }
}
