import { describe, it, expect } from "vitest";
import { validateTransition } from "../src/lib/payments/state-machine";
import { PaymentStatus } from "@prisma/client";

describe("PaymentStateMachine", () => {
  it("should allow valid state transitions from CREATED to PROCESSING or FAILED", () => {
    expect(validateTransition(PaymentStatus.CREATED, PaymentStatus.PROCESSING)).toBe(true);
    expect(validateTransition(PaymentStatus.CREATED, PaymentStatus.FAILED)).toBe(true);
  });

  it("should allow transition from PROCESSING to CAPTURED or SUCCESS", () => {
    expect(validateTransition(PaymentStatus.PROCESSING, PaymentStatus.CAPTURED)).toBe(true);
    expect(validateTransition(PaymentStatus.PROCESSING, PaymentStatus.SUCCESS)).toBe(true);
  });

  it("should allow transition from SUCCESS to PARTIALLY_REFUNDED or REFUNDED", () => {
    expect(validateTransition(PaymentStatus.SUCCESS, PaymentStatus.PARTIALLY_REFUNDED)).toBe(true);
    expect(validateTransition(PaymentStatus.SUCCESS, PaymentStatus.REFUNDED)).toBe(true);
  });

  it("should reject illegal backward transitions such as FAILED to CAPTURED", () => {
    expect(validateTransition(PaymentStatus.FAILED, PaymentStatus.CAPTURED)).toBe(false);
    expect(validateTransition(PaymentStatus.FAILED, PaymentStatus.SUCCESS)).toBe(false);
  });

  it("should reject transitions out of terminal REFUNDED state", () => {
    expect(validateTransition(PaymentStatus.REFUNDED, PaymentStatus.PENDING)).toBe(false);
    expect(validateTransition(PaymentStatus.REFUNDED, PaymentStatus.SUCCESS)).toBe(false);
  });

  it("should allow idempotent same-state transitions", () => {
    expect(validateTransition(PaymentStatus.CAPTURED, PaymentStatus.CAPTURED)).toBe(true);
    expect(validateTransition(PaymentStatus.SUCCESS, PaymentStatus.SUCCESS)).toBe(true);
  });
});
