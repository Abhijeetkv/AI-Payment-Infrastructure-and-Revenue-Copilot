import { describe, it, expect } from "vitest";

describe("SafeRefundCalculations", () => {
  it("should permit refund when requested amount is less than or equal to refundable balance", () => {
    const refundableBalance = 100000; // ₹1,000.00
    const requestedRefund = 40000;    // ₹400.00

    const isPermitted = requestedRefund > 0 && requestedRefund <= refundableBalance;
    const remainingAfter = refundableBalance - requestedRefund;

    expect(isPermitted).toBe(true);
    expect(remainingAfter).toBe(60000);
  });

  it("should reject refund when requested amount exceeds refundable balance", () => {
    const refundableBalance = 50000;  // ₹500.00
    const requestedRefund = 60000;    // ₹600.00

    const isPermitted = requestedRefund > 0 && requestedRefund <= refundableBalance;
    expect(isPermitted).toBe(false);
  });

  it("should reject non-positive refund amounts", () => {
    const refundableBalance = 50000;
    const requestedZero = 0;
    const requestedNegative = -1000;

    expect(requestedZero > 0 && requestedZero <= refundableBalance).toBe(false);
    expect(requestedNegative > 0 && requestedNegative <= refundableBalance).toBe(false);
  });
});
