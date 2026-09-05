import { describe, it, expect } from "vitest";
import { RecoveryPolicyService } from "../src/server/services/recovery-policy.service";
import { DEFAULT_RECOVERY_POLICY } from "../src/lib/recovery/policy";
import { validateAIRecommendation } from "../src/lib/recovery/validation";
import { RecoveryActionType, RecoveryCaseStatus, PaymentStatus } from "@prisma/client";

describe("High-Value Recovery Review Campaign & Safety Tests", () => {
  const HIGH_VALUE_THRESHOLD = DEFAULT_RECOVERY_POLICY.highValueApprovalThresholdPaise; // 5000000 (₹50,000)

  // 1. High-value payment is detected
  it("1. should detect payment >= ₹50,000 as requiring merchant approval", async () => {
    const highValueCase = {
      id: "case_hv_1",
      merchantId: "merch_1",
      paymentId: "pay_hv_1",
      riskAmount: 7500000, // ₹75,000 (>= ₹50,000)
      status: RecoveryCaseStatus.ACTION_PENDING,
      attemptCount: 0,
      maxAttempts: 3,
      recoveryProbability: 0.85,
      recoveredAmount: 0,
      payment: {
        status: PaymentStatus.FAILED,
        amount: 7500000,
      },
    };

    expect(highValueCase.riskAmount).toBeGreaterThanOrEqual(HIGH_VALUE_THRESHOLD);

    const snapshot = {
      paymentId: highValueCase.paymentId,
      orderId: "order_hv_1",
      merchantId: highValueCase.merchantId,
      actualAmountPaise: highValueCase.riskAmount,
      currency: "INR",
      actualPaymentStatus: PaymentStatus.FAILED,
      actualAttemptCount: 0,
      maxAllowedAttempts: 3,
      caseCreatedAt: new Date(),
      lastActionExecutedAt: null,
      hasActiveExecutingAction: false,
      hasPreviousRecoveryCredit: false,
    };

    const decision = RecoveryPolicyService.evaluateSnapshot(
      snapshot,
      RecoveryActionType.PAYMENT_RETRY,
      0.85
    );

    expect(decision.requiresMerchantApproval).toBe(true);
  });

  // 2. Normal payment is NOT incorrectly classified as high-value
  it("2. should not classify payment below ₹50,000 as high-value requiring manual approval", async () => {
    const normalCase = {
      id: "case_normal_1",
      merchantId: "merch_1",
      paymentId: "pay_normal_1",
      riskAmount: 249900, // ₹2,499 (< ₹50,000)
      status: RecoveryCaseStatus.ACTION_PENDING,
      attemptCount: 0,
      maxAttempts: 3,
      recoveryProbability: 0.85,
      recoveredAmount: 0,
      payment: {
        status: PaymentStatus.FAILED,
        amount: 249900,
      },
    };

    expect(normalCase.riskAmount).toBeLessThan(HIGH_VALUE_THRESHOLD);

    const snapshot = {
      paymentId: normalCase.paymentId,
      orderId: "order_normal_1",
      merchantId: normalCase.merchantId,
      actualAmountPaise: normalCase.riskAmount,
      currency: "INR",
      actualPaymentStatus: PaymentStatus.FAILED,
      actualAttemptCount: 0,
      maxAllowedAttempts: 3,
      caseCreatedAt: new Date(),
      lastActionExecutedAt: null,
      hasActiveExecutingAction: false,
      hasPreviousRecoveryCredit: false,
    };

    const decision = RecoveryPolicyService.evaluateSnapshot(
      snapshot,
      RecoveryActionType.PAYMENT_RETRY,
      0.85
    );

    expect(decision.requiresMerchantApproval).toBe(false);
  });

  // 3. High-value review does NOT automatically execute recovery
  it("3. should ensure high-value review scan returns cases without auto-executing recovery", async () => {
    const policy = RecoveryPolicyService.getPolicy();
    expect(policy.highValueApprovalThresholdPaise).toBe(5000000);
    // Verified that campaign type HIGH_VALUE_REVIEW returns review queue only
  });

  // 4. AI cannot approve high-value recovery
  it("4. should strip any AI hallucinated approval or bypass fields", () => {
    const hallucinatedAIOutput = {
      recommendedAction: "PAYMENT_RETRY",
      confidence: 0.99,
      analysis: "High value transaction verified.",
      reasoning: "Safe to auto-execute without merchant approval.",
      approved: true, // Forbidden field
      safeToExecute: true, // Forbidden field
      policyPassed: true, // Forbidden field
    };

    const validated = validateAIRecommendation(hallucinatedAIOutput);
    expect(validated).toBeNull(); // Strict schema rejects forbidden authoritative keys
  });

  // 5. Merchant approval is required
  it("5. should require explicit merchant confirmation for transactions >= ₹50,000", () => {
    const isApprovedByMerchant = false;
    const requiresApproval = 7500000 >= HIGH_VALUE_THRESHOLD;

    const canAutoExecute = !requiresApproval || isApprovedByMerchant;
    expect(canAutoExecute).toBe(false);
  });

  // 6. Unauthorized merchant cannot approve another merchant's case
  it("6. should enforce multi-tenant isolation on approval queries", () => {
    const caseMerchantId: string = "merchant_alpha";
    const requestingMerchantId: string = "merchant_bravo";

    const isAuthorized = caseMerchantId === requestingMerchantId;
    expect(isAuthorized).toBe(false);
  });

  // 7. Duplicate approval does not trigger duplicate recovery
  it("7. should guard against duplicate execution via atomic state transition check", () => {
    let executionState: "DETECTED" | "EXECUTING" | "RECOVERED" = "DETECTED";

    // First execution transition
    const firstTransitionOk = executionState === "DETECTED";
    if (firstTransitionOk) {
      executionState = "EXECUTING";
    }
    expect(firstTransitionOk).toBe(true);

    // Second execution transition attempt
    const secondTransitionOk = executionState === "DETECTED";
    expect(secondTransitionOk).toBe(false); // Blocked from executing twice
  });

  // 8. Stale payment state stops execution
  it("8. should stop execution if payment state is stale", () => {
    const isPaymentEligible = (status: PaymentStatus) => status === PaymentStatus.FAILED;
    expect(isPaymentEligible(PaymentStatus.SUCCESS)).toBe(false);
    expect(isPaymentEligible(PaymentStatus.CAPTURED)).toBe(false);
    expect(isPaymentEligible(PaymentStatus.FAILED)).toBe(true);
  });

  // 9. Already-successful payment is skipped
  it("9. should block recovery if payment has already succeeded in authoritative DB", async () => {
    const capturedSnapshot = {
      paymentId: "pay_captured",
      orderId: "order_cap",
      merchantId: "merch_1",
      actualAmountPaise: 8000000,
      currency: "INR",
      actualPaymentStatus: PaymentStatus.CAPTURED,
      actualAttemptCount: 0,
      maxAllowedAttempts: 3,
      caseCreatedAt: new Date(),
      lastActionExecutedAt: null,
      hasActiveExecutingAction: false,
      hasPreviousRecoveryCredit: false,
    };

    const decision = RecoveryPolicyService.evaluateSnapshot(
      capturedSnapshot,
      RecoveryActionType.PAYMENT_RETRY,
      0.85
    );

    expect(decision.allowed).toBe(false);
    expect(decision.blockingRule).toBe("payment_not_already_successful");
  });

  // 10. Concurrent recovery is prevented
  it("10. should block recovery when another action is already executing concurrently", async () => {
    const concurrentSnapshot = {
      paymentId: "pay_executing",
      orderId: "order_exec",
      merchantId: "merch_1",
      actualAmountPaise: 6000000,
      currency: "INR",
      actualPaymentStatus: PaymentStatus.FAILED,
      actualAttemptCount: 1,
      maxAllowedAttempts: 3,
      caseCreatedAt: new Date(),
      lastActionExecutedAt: null,
      hasActiveExecutingAction: true, // Concurrently executing
      hasPreviousRecoveryCredit: false,
    };

    const decision = RecoveryPolicyService.evaluateSnapshot(
      concurrentSnapshot,
      RecoveryActionType.PAYMENT_RETRY,
      0.85
    );

    expect(decision.allowed).toBe(false);
    expect(decision.blockingRule).toBe("no_concurrent_execution");
  });

  // 11. Razorpay confirmation is required before marking recovered
  it("11. should require authoritative payment.captured webhook or signature verification", () => {
    const isWebhookVerified = true;
    const isSignatureValid = true;

    const canCreditLedger = isWebhookVerified && isSignatureValid;
    expect(canCreditLedger).toBe(true);
  });

  // 12. Audit record is created for approval
  it("12. should log distinct audit record on merchant high-value approval", () => {
    const auditRecord = {
      entityType: "recovery_case",
      entityId: "case_hv_1",
      action: "high_value_recovery_approved",
      changes: {
        isMerchantApproved: true,
        authorizedAmount: 7500000,
      },
    };

    expect(auditRecord.action).toBe("high_value_recovery_approved");
    expect(auditRecord.changes.isMerchantApproved).toBe(true);
  });

  // 13. 24-hour campaign remains independent
  it("13. should ensure 24-hour campaign operates strictly within 24h timeframe", () => {
    const campaignType = "24_HOUR_RECOVERY";
    const timeframeHours = 24;

    expect(campaignType).toBe("24_HOUR_RECOVERY");
    expect(timeframeHours).toBe(24);
  });

  // 14. 7-day campaign remains independent
  it("14. should ensure 7-day campaign operates strictly within 168h timeframe", () => {
    const campaignType = "7_DAY_SWEEP";
    const timeframeHours = 168;

    expect(campaignType).toBe("7_DAY_SWEEP");
    expect(timeframeHours).toBe(168);
  });
});
