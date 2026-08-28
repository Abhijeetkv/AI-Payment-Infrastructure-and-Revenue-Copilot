import { RecoveryActionType, RecoveryCaseStatus, PaymentStatus } from "@prisma/client";
import { DEFAULT_RECOVERY_POLICY } from "@/lib/recovery/policy";
import type { PolicyCheck, PolicyValidationResult, RecoveryPolicyConfig } from "@/lib/recovery/types";
import { logger } from "@/lib/logger";

interface RecoveryCaseForPolicy {
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
   * Validate whether a recovery action is allowed.
   * This is the DETERMINISTIC gatekeeper — AI cannot bypass it.
   */
  static async validateAction(
    recoveryCase: RecoveryCaseForPolicy,
    actionType: RecoveryActionType,
  ): Promise<PolicyValidationResult> {
    const checks: PolicyCheck[] = [];
    const reasons: string[] = [];

    // Rule 1: Action type must be allowed
    const actionAllowed = this.config.allowedActions.includes(actionType);
    checks.push({
      rule: "action_type_allowed",
      passed: actionAllowed,
      reason: actionAllowed
        ? `Action ${actionType} is permitted`
        : `Action ${actionType} is not in allowed actions list`,
    });
    if (!actionAllowed) reasons.push(`Action type ${actionType} is not permitted`);

    // Rule 2: Case must be in a valid state for action execution
    const validStates: RecoveryCaseStatus[] = [
      RecoveryCaseStatus.DETECTED,
      RecoveryCaseStatus.ANALYZING,
      RecoveryCaseStatus.ACTION_PENDING,
    ];
    const stateValid = validStates.includes(recoveryCase.status);
    checks.push({
      rule: "case_status_valid",
      passed: stateValid,
      reason: stateValid
        ? `Case status ${recoveryCase.status} allows actions`
        : `Case status ${recoveryCase.status} does not allow new actions`,
    });
    if (!stateValid) reasons.push(`Case is in ${recoveryCase.status} state`);

    // Rule 3: Maximum attempts not exceeded
    const attemptsOk = recoveryCase.attemptCount < recoveryCase.maxAttempts;
    checks.push({
      rule: "max_attempts_not_exceeded",
      passed: attemptsOk,
      reason: attemptsOk
        ? `Attempt ${recoveryCase.attemptCount + 1} of ${recoveryCase.maxAttempts}`
        : `Maximum attempts (${recoveryCase.maxAttempts}) already reached`,
    });
    if (!attemptsOk) reasons.push("Maximum recovery attempts reached");

    // Rule 4: Payment is not already recovered/successful
    const paymentStatus = recoveryCase.payment?.status;
    const notAlreadyPaid = paymentStatus !== PaymentStatus.SUCCESS &&
      paymentStatus !== PaymentStatus.CAPTURED;
    checks.push({
      rule: "payment_not_already_successful",
      passed: notAlreadyPaid,
      reason: notAlreadyPaid
        ? "Payment is not already successful"
        : `Payment is already in ${paymentStatus} status`,
    });
    if (!notAlreadyPaid) reasons.push("Payment has already been captured");

    // Rule 5: Payment is not refunded
    const notRefunded = paymentStatus !== PaymentStatus.REFUNDED &&
      paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED;
    checks.push({
      rule: "payment_not_refunded",
      passed: notRefunded,
      reason: notRefunded
        ? "Payment has not been refunded"
        : `Payment has been ${paymentStatus}`,
    });
    if (!notRefunded) reasons.push("Payment has been refunded");

    // Rule 6: Recovery amount within limits
    const amountOk = recoveryCase.riskAmount <= this.config.maxRecoveryAmountPaise;
    checks.push({
      rule: "amount_within_limit",
      passed: amountOk,
      reason: amountOk
        ? `Amount ₹${(recoveryCase.riskAmount / 100).toLocaleString()} is within limit`
        : `Amount ₹${(recoveryCase.riskAmount / 100).toLocaleString()} exceeds max ₹${(this.config.maxRecoveryAmountPaise / 100).toLocaleString()}`,
    });
    if (!amountOk) reasons.push("Recovery amount exceeds policy limit");

    // Rule 7: Recovery probability above threshold (skip for escalation/stop)
    if (actionType !== RecoveryActionType.MERCHANT_ESCALATION &&
        actionType !== RecoveryActionType.STOP_RECOVERY) {
      const probOk = recoveryCase.recoveryProbability >= this.config.minRecoveryProbability;
      checks.push({
        rule: "recovery_probability_sufficient",
        passed: probOk,
        reason: probOk
          ? `Recovery probability ${(recoveryCase.recoveryProbability * 100).toFixed(1)}% exceeds minimum ${(this.config.minRecoveryProbability * 100).toFixed(1)}%`
          : `Recovery probability ${(recoveryCase.recoveryProbability * 100).toFixed(1)}% is below minimum ${(this.config.minRecoveryProbability * 100).toFixed(1)}%`,
      });
      if (!probOk) reasons.push("Recovery probability too low");
    }

    // Rule 8: Not already recovered
    const notRecovered = recoveryCase.recoveredAmount === 0;
    checks.push({
      rule: "not_already_recovered",
      passed: notRecovered,
      reason: notRecovered
        ? "No previous recovery recorded"
        : `Already recovered ₹${(recoveryCase.recoveredAmount / 100).toLocaleString()}`,
    });
    if (!notRecovered) reasons.push("Revenue has already been recovered");

    // Rule 9: Check if payment has expired (for Razorpay, orders expire after a certain period)
    const caseCreatedAt = recoveryCase.createdAt
      ? new Date(recoveryCase.createdAt).getTime()
      : Date.now();
    const caseAgeHours = (Date.now() - caseCreatedAt) / (1000 * 60 * 60);
    const notExpired = caseAgeHours <= this.config.expirationHours;
    checks.push({
      rule: "not_expired",
      passed: notExpired,
      reason: notExpired
        ? "Recovery window has not expired"
        : `Recovery window expired (${caseAgeHours.toFixed(1)}h exceeds ${this.config.expirationHours}h limit)`,
    });
    if (!notExpired) reasons.push("Recovery window has expired");

    const allPassed = checks.every((c) => c.passed);

    logger.info("Policy validation completed", {
      caseId: recoveryCase.id,
      actionType,
      allowed: allPassed,
      failedChecks: checks.filter((c) => !c.passed).map((c) => c.rule),
    });

    return {
      allowed: allPassed,
      checks,
      reasons,
      blockingRule: allPassed ? undefined : checks.find((c) => !c.passed)?.rule,
    };
  }
}
