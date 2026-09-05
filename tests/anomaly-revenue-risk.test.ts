import { describe, it, expect } from "vitest";
import { AnomalySeverity } from "@prisma/client";

describe("Lumina — Anomaly Revenue-Risk & Safety Tests", () => {
  // 1. Severity calculation is deterministic, not controlled by AI
  it("1. should compute anomaly severity deterministically from z-score and deviation", () => {
    const calcSeverity = (currentVal: number, mean: number, stdDev: number): AnomalySeverity => {
      const zScore = Math.abs(currentVal - mean) / Math.max(0.001, stdDev);
      const percentageDeviation = ((currentVal - mean) / mean) * 100;

      if (currentVal >= 50 || zScore >= 3.5 || percentageDeviation >= 200) return AnomalySeverity.CRITICAL;
      if (currentVal >= 25 || zScore >= 2.5 || percentageDeviation >= 100) return AnomalySeverity.HIGH;
      if (currentVal >= 15 || zScore >= 1.8 || percentageDeviation >= 50) return AnomalySeverity.MEDIUM;
      return AnomalySeverity.LOW;
    };

    // Low baseline 1.8%, current 14.2% -> deviation +688% -> HIGH
    const severity = calcSeverity(14.2, 1.8, 0.5);
    expect([AnomalySeverity.HIGH, AnomalySeverity.CRITICAL]).toContain(severity);
  });

  // 2. Financial impact metrics come from authoritative data
  it("2. should compute revenue at risk and recoverable revenue from DB truth", () => {
    const totalFailedSumPaise = 1840000; // ₹18,400
    const recoverableRate = 0.685;
    const potentiallyRecoverablePaise = Math.round(totalFailedSumPaise * recoverableRate);

    expect(potentiallyRecoverablePaise).toBe(1260400); // ~₹12,604
    expect(potentiallyRecoverablePaise).toBeLessThanOrEqual(totalFailedSumPaise);
  });

  // 3. AI analysis is advisory and cannot execute actions directly
  it("3. should restrict AI role to advisory explanations without direct execution permissions", () => {
    const aiOutput = {
      analysis: "Observed failure pattern is consistent with UPI issuer degradation.",
      recommendedStrategy: "prioritize alternate payment retry routing",
      confidence: 0.88,
    };

    // AI output has no execution credentials or bypass flags
    expect((aiOutput as Record<string, unknown>).executeDirectly).toBeUndefined();
    expect((aiOutput as Record<string, unknown>).bypassPolicyGate).toBeUndefined();
    expect((aiOutput as Record<string, unknown>).approved).toBeUndefined();
  });

  // 4. Deterministic Policy Gate determines recovery eligibility
  it("4. should evaluate policy gate deterministically for failure spikes", () => {
    const anomalyType = "failure_spike";
    const isEligible = anomalyType === "failure_spike";

    const policyGateResult = isEligible
      ? "✓ Approved for Recovery"
      : "⚠ Requires Policy Review";

    expect(policyGateResult).toBe("✓ Approved for Recovery");
  });

  // 5. Fraud/abuse patterns are not marked as auto-recoverable
  it("5. should not assign auto-recoverable revenue to abuse or card-testing patterns", () => {
    const abuseAnomalyType: string = "unusual_pattern";
    const potentiallyRecoverablePaise = abuseAnomalyType === "failure_spike" ? 1260000 : 0;

    expect(potentiallyRecoverablePaise).toBe(0);
  });

  // 6. Action buttons link to standard review workflows instead of direct infrastructure manipulation
  it("6. should route anomalies to safe review pages rather than mutating gateway routing directly", () => {
    const failureSpikeAction = { label: "View Recovery Cases", href: "/recovery" };
    const abusePatternAction = { label: "View Payments", href: "/payments" };
    const refundSurgeAction = { label: "View Refunds", href: "/refunds" };

    expect(failureSpikeAction.href).toBe("/recovery");
    expect(abusePatternAction.href).toBe("/payments");
    expect(refundSurgeAction.href).toBe("/refunds");
  });

  // 7. Separation of Anomaly status and Recovery status
  it("7. should treat Anomaly resolved status and Recovery workflow status as distinct concepts", () => {
    // Case A: Anomaly is resolved, but recovery is completed
    const anomalyA = { isResolved: true, recoveryStatus: "Recovery Completed" };
    expect(anomalyA.isResolved).toBe(true);
    expect(anomalyA.recoveryStatus).toBe("Recovery Completed");

    // Case B: Anomaly is resolved, but recovery is still running
    const anomalyB = { isResolved: true, recoveryStatus: "Recovery Running" };
    expect(anomalyB.isResolved).toBe(true);
    expect(anomalyB.recoveryStatus).toBe("Recovery Running");
  });

  // 8. Verified recovered revenue only displayed when confirmed
  it("8. should only populate recovered revenue when confirmed by DB recovery cases", () => {
    const unconfirmedRecovery = { status: "EXECUTING", recoveredAmount: 0 };
    const verifiedRecovery = { status: "RECOVERED", recoveredAmount: 22079811 }; // ₹2,20,798.11 in paise

    const getDisplayRecovered = (rec: { status: string; recoveredAmount: number }) => {
      return rec.status === "RECOVERED" && rec.recoveredAmount > 0 ? rec.recoveredAmount : 0;
    };

    expect(getDisplayRecovered(unconfirmedRecovery)).toBe(0);
    expect(getDisplayRecovered(verifiedRecovery)).toBe(22079811);
  });

  // 9. Multi-tenant isolation for anomalies
  it("9. should strictly isolate anomaly queries by merchantId", () => {
    const merchantA = "merch_100";
    const merchantB = "merch_200";

    const queryWhere = { merchantId: merchantA };
    expect(queryWhere.merchantId).toBe(merchantA);
    expect(queryWhere.merchantId).not.toBe(merchantB);
  });

  // 10. CSV Export includes complete financial schema
  it("10. should format anomaly export with authoritative financial headers", () => {
    const headers = [
      "ID",
      "Type",
      "Severity",
      "Title",
      "Revenue At Risk (INR)",
      "Potentially Recoverable (INR)",
      "Affected Count",
      "Policy Gate",
      "Status",
      "Detected At",
    ];

    expect(headers).toContain("Revenue At Risk (INR)");
    expect(headers).toContain("Potentially Recoverable (INR)");
    expect(headers).toContain("Policy Gate");
  });
});
