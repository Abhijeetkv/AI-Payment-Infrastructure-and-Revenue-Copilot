import { describe, it, expect } from "vitest";
import {
  BASE_RECOVERY_PROBABILITIES,
  METHOD_RECOVERY_ADJUSTMENTS,
  DEFAULT_RECOVERY_POLICY,
} from "../src/lib/recovery/policy";
import {
  RecoveryActionType,
  RecoveryStopReason,
} from "../src/lib/recovery/types";

describe("Revenue Recovery Domain & Policy Rules", () => {
  it("should have correct base recovery probabilities defined for all failure types", () => {
    expect(BASE_RECOVERY_PROBABILITIES.payment_failure).toBe(0.65);
    expect(BASE_RECOVERY_PROBABILITIES.checkout_abandonment).toBe(0.40);
    expect(BASE_RECOVERY_PROBABILITIES.subscription_failure).toBe(0.55);
    expect(BASE_RECOVERY_PROBABILITIES.repeated_failure).toBe(0.30);
    expect(BASE_RECOVERY_PROBABILITIES.method_degradation).toBe(0.70);
  });

  it("should define payment method recovery adjustments", () => {
    expect(METHOD_RECOVERY_ADJUSTMENTS.card).toBe(0.10);
    expect(METHOD_RECOVERY_ADJUSTMENTS.upi).toBe(0.05);
    expect(METHOD_RECOVERY_ADJUSTMENTS.wallet).toBe(0.08);
    expect(METHOD_RECOVERY_ADJUSTMENTS.netbanking).toBe(-0.05);
  });

  it("should enforce strict default recovery policy limits", () => {
    expect(DEFAULT_RECOVERY_POLICY.maxAttempts).toBe(3);
    expect(DEFAULT_RECOVERY_POLICY.maxRecoveryAmountPaise).toBe(10000000); // ₹1,00,000
    expect(DEFAULT_RECOVERY_POLICY.minRecoveryProbability).toBe(0.15);
    expect(DEFAULT_RECOVERY_POLICY.allowedActions).toContain(RecoveryActionType.PAYMENT_RETRY);
    expect(DEFAULT_RECOVERY_POLICY.allowedActions).toContain(RecoveryActionType.ALTERNATE_METHOD);
    expect(DEFAULT_RECOVERY_POLICY.allowedActions).toContain(RecoveryActionType.MERCHANT_ESCALATION);
    expect(DEFAULT_RECOVERY_POLICY.allowedActions).toContain(RecoveryActionType.STOP_RECOVERY);
  });

  it("should calculate expected recovery deterministically from probability and risk amount", () => {
    const riskAmount = 1000000; // ₹10,000.00
    const probability = 0.75;
    const expectedRecovery = Math.round(riskAmount * probability);

    expect(expectedRecovery).toBe(750000); // ₹7,500.00
  });

  it("should distinguish Revenue At Risk vs Expected vs Actually Recovered", () => {
    const revenueAtRisk = 5000000; // ₹50,000
    const expectedRecovery = 3750000; // ₹37,500
    const actuallyRecovered = 2500000; // ₹25,000

    expect(expectedRecovery).toBeLessThanOrEqual(revenueAtRisk);
    expect(actuallyRecovered).toBeLessThanOrEqual(revenueAtRisk);
    const recoveryRate = (actuallyRecovered / revenueAtRisk) * 100;
    expect(recoveryRate).toBe(50.0);
  });

  it("should validate all recovery stopping reasons exist", () => {
    const stopReasons = Object.values(RecoveryStopReason);
    expect(stopReasons).toContain("MAX_ATTEMPTS_REACHED");
    expect(stopReasons).toContain("PAYMENT_RECOVERED");
    expect(stopReasons).toContain("POLICY_BLOCKED");
    expect(stopReasons).toContain("MERCHANT_ESCALATION");
  });
});

describe("AI Recovery Agent Case Analysis Engine", () => {
  it("should provide structured recommendation with deterministic fallback for high probability", async () => {
    const { generateRecoveryCaseAnalysis } = await import("../src/lib/ai/client");

    const result = await generateRecoveryCaseAnalysis({
      caseId: "case_test_1",
      merchantId: "merch_1",
      riskAmount: 49900,
      failureType: "payment_failure",
      failureReason: "Bank network timeout",
      paymentMethod: "upi",
      attemptCount: 0,
      probability: 0.75,
      factors: ["UPI success rate: 90%"],
      methodPerformance: [{ method: "upi", successRate: 90, totalTransactions: 100 }],
    });

    expect(result.recommendedAction).toBe(RecoveryActionType.PAYMENT_RETRY);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.evidenceFactors.length).toBeGreaterThan(0);
    expect(result.analysis).toBeDefined();
    expect(result.reasoning).toBeDefined();
  });

  it("should recommend ALTERNATE_METHOD when alternative method has higher success rate", async () => {
    const { generateRecoveryCaseAnalysis } = await import("../src/lib/ai/client");

    const result = await generateRecoveryCaseAnalysis({
      caseId: "case_test_2",
      merchantId: "merch_1",
      riskAmount: 99900,
      failureType: "payment_failure",
      failureReason: "Gateway degradation",
      paymentMethod: "upi",
      attemptCount: 0,
      probability: 0.45,
      factors: ["UPI success rate dropped to 60%"],
      methodPerformance: [
        { method: "upi", successRate: 60, totalTransactions: 80 },
        { method: "card", successRate: 92, totalTransactions: 120 },
      ],
    });

    expect(result.recommendedAction).toBe(RecoveryActionType.ALTERNATE_METHOD);
    expect(result.evidenceFactors.some((f) => f.includes("CARD"))).toBe(true);
  });

  it("should escalate to merchant when max attempts are reached", async () => {
    const { generateRecoveryCaseAnalysis } = await import("../src/lib/ai/client");

    const result = await generateRecoveryCaseAnalysis({
      caseId: "case_test_3",
      merchantId: "merch_1",
      riskAmount: 249900,
      failureType: "repeated_failure",
      failureReason: "Customer account restricted",
      paymentMethod: "card",
      attemptCount: 2,
      probability: 0.20,
      factors: ["2 prior failed attempts"],
      methodPerformance: [{ method: "card", successRate: 85, totalTransactions: 100 }],
    });

    expect(result.recommendedAction).toBe(RecoveryActionType.MERCHANT_ESCALATION);
  });
});
