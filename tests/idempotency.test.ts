import { describe, it, expect } from "vitest";
import crypto from "crypto";

describe("IdempotencyKeyHashing", () => {
  it("should deterministically hash identical request payloads", () => {
    const payload1 = { amount: 50000, orderId: "order_123", method: "upi" };
    const payload2 = { amount: 50000, orderId: "order_123", method: "upi" };

    const hash1 = crypto.createHash("sha256").update(JSON.stringify(payload1)).digest("hex");
    const hash2 = crypto.createHash("sha256").update(JSON.stringify(payload2)).digest("hex");

    expect(hash1).toBe(hash2);
  });

  it("should generate distinct hashes for differing payload amounts", () => {
    const payload1 = { amount: 50000, orderId: "order_123" };
    const payload2 = { amount: 60000, orderId: "order_123" };

    const hash1 = crypto.createHash("sha256").update(JSON.stringify(payload1)).digest("hex");
    const hash2 = crypto.createHash("sha256").update(JSON.stringify(payload2)).digest("hex");

    expect(hash1).not.toBe(hash2);
  });
});
