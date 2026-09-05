import { describe, it, expect } from "vitest";
import { RecoveryPolicyService } from "../src/server/services/recovery-policy.service";
import { RecoveryActionType, RecoveryCaseStatus, PaymentStatus } from "@prisma/client";

describe("Recovery Policy Engine Guardrails", () => {
  it("should approve valid recovery action within policy boundaries", async () => {
    const validCase = {
      id: "case_test_1",
      merchantId: "merch_1",
      paymentId: "pay_1",
      riskAmount: 250000, // ₹2,500
      status: RecoveryCaseStatus.ACTION_PENDING,
      attemptCount: 0,
      maxAttempts: 3,
      recoveryProbability: 0.75,
      recoveredAmount: 0,
      payment: {
        status: PaymentStatus.FAILED,
        amount: 250000,
      },
    };

    const result = await RecoveryPolicyService.validateAction(
      validCase,
      RecoveryActionType.PAYMENT_RETRY
    );

    expect(result.allowed).toBe(true);
    expect(result.reasons.length).toBe(0);
    expect(result.checks.every((c: { passed: boolean }) => c.passed)).toBe(true);
  });

  it("should block action when maximum attempts (3) have already been reached", async () => {
    const maxAttemptsCase = {
      id: "case_test_2",
      merchantId: "merch_1",
      paymentId: "pay_2",
      riskAmount: 250000,
      status: RecoveryCaseStatus.ACTION_PENDING,
      attemptCount: 3, // Already reached 3
      maxAttempts: 3,
      recoveryProbability: 0.75,
      recoveredAmount: 0,
      payment: {
        status: PaymentStatus.FAILED,
        amount: 250000,
      },
    };

    const result = await RecoveryPolicyService.validateAction(
      maxAttemptsCase,
      RecoveryActionType.PAYMENT_RETRY
    );

    expect(result.allowed).toBe(false);
    expect(result.blockingRule).toBe("max_attempts_not_exceeded");
  });

  it("should block action if payment is already in SUCCESS/CAPTURED status", async () => {
    const capturedCase = {
      id: "case_test_3",
      merchantId: "merch_1",
      paymentId: "pay_3",
      riskAmount: 250000,
      status: RecoveryCaseStatus.ACTION_PENDING,
      attemptCount: 0,
      maxAttempts: 3,
      recoveryProbability: 0.75,
      recoveredAmount: 0,
      payment: {
        status: PaymentStatus.SUCCESS,
        amount: 250000,
      },
    };

    const result = await RecoveryPolicyService.validateAction(
      capturedCase,
      RecoveryActionType.PAYMENT_RETRY
    );

    expect(result.allowed).toBe(false);
    expect(result.blockingRule).toBe("payment_not_already_successful");
  });

  it("should block action if payment has been REFUNDED", async () => {
    const refundedCase = {
      id: "case_test_4",
      merchantId: "merch_1",
      paymentId: "pay_4",
      riskAmount: 250000,
      status: RecoveryCaseStatus.ACTION_PENDING,
      attemptCount: 0,
      maxAttempts: 3,
      recoveryProbability: 0.75,
      recoveredAmount: 0,
      payment: {
        status: PaymentStatus.REFUNDED,
        amount: 250000,
      },
    };

    const result = await RecoveryPolicyService.validateAction(
      refundedCase,
      RecoveryActionType.PAYMENT_RETRY
    );

    expect(result.allowed).toBe(false);
    expect(result.blockingRule).toBe("payment_not_refunded");
  });

  it("should block automated retry if recovery probability is below policy threshold (< 15%)", async () => {
    const lowProbCase = {
      id: "case_test_5",
      merchantId: "merch_1",
      paymentId: "pay_5",
      riskAmount: 250000,
      status: RecoveryCaseStatus.ACTION_PENDING,
      attemptCount: 0,
      maxAttempts: 3,
      recoveryProbability: 0.08, // 8% < 15%
      recoveredAmount: 0,
      payment: {
        status: PaymentStatus.FAILED,
        amount: 250000,
      },
    };

    const result = await RecoveryPolicyService.validateAction(
      lowProbCase,
      RecoveryActionType.PAYMENT_RETRY
    );

    expect(result.allowed).toBe(false);
    expect(result.blockingRule).toBe("recovery_probability_sufficient");
  });

  it("should allow escalation even when recovery probability is low", async () => {
    const lowProbCase = {
      id: "case_test_6",
      merchantId: "merch_1",
      paymentId: "pay_6",
      riskAmount: 250000,
      status: RecoveryCaseStatus.ACTION_PENDING,
      attemptCount: 0,
      maxAttempts: 3,
      recoveryProbability: 0.08,
      recoveredAmount: 0,
      payment: {
        status: PaymentStatus.FAILED,
        amount: 250000,
      },
    };

    const result = await RecoveryPolicyService.validateAction(
      lowProbCase,
      RecoveryActionType.MERCHANT_ESCALATION
    );

    expect(result.allowed).toBe(true);
  });

  it("should block action if recovery window has expired", async () => {
    const expiredCase = {
      id: "case_test_7",
      merchantId: "merch_1",
      paymentId: "pay_7",
      riskAmount: 250000,
      status: RecoveryCaseStatus.ACTION_PENDING,
      attemptCount: 0,
      maxAttempts: 3,
      recoveryProbability: 0.75,
      recoveredAmount: 0,
      createdAt: new Date(Date.now() - 75 * 60 * 60 * 1000), // 75h ago > 72h expiration
      payment: {
        status: PaymentStatus.FAILED,
        amount: 250000,
      },
    };

    const result = await RecoveryPolicyService.validateAction(
      expiredCase,
      RecoveryActionType.PAYMENT_RETRY
    );

    expect(result.allowed).toBe(false);
    expect(result.blockingRule).toBe("not_expired");
  });

  it("should block action if recovery amount exceeds policy max limit", async () => {
    const excessiveAmountCase = {
      id: "case_test_8",
      merchantId: "merch_1",
      paymentId: "pay_8",
      riskAmount: 20000000, // ₹2,00,000 > ₹1,00,000 max limit
      status: RecoveryCaseStatus.ACTION_PENDING,
      attemptCount: 0,
      maxAttempts: 3,
      recoveryProbability: 0.75,
      recoveredAmount: 0,
      payment: {
        status: PaymentStatus.FAILED,
        amount: 20000000,
      },
    };

    const result = await RecoveryPolicyService.validateAction(
      excessiveAmountCase,
      RecoveryActionType.PAYMENT_RETRY
    );

    expect(result.allowed).toBe(false);
    expect(result.blockingRule).toBe("amount_within_limit");
  });
});
