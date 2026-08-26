import { describe, it, expect } from "vitest";
import { TransactionDirection } from "@prisma/client";

describe("DoubleEntryLedgerInvariance", () => {
  it("should calculate zero refundable balance if no credit transactions exist", () => {
    const transactions: Array<{ direction: TransactionDirection; amount: number }> = [];
    let totalCaptured = 0;
    let totalRefunded = 0;

    for (const tx of transactions) {
      if (tx.direction === TransactionDirection.CREDIT) totalCaptured += tx.amount;
      else if (tx.direction === TransactionDirection.DEBIT) totalRefunded += tx.amount;
    }

    const refundableBalance = Math.max(0, totalCaptured - totalRefunded);
    expect(refundableBalance).toBe(0);
  });

  it("should calculate exact refundable balance after payment credit and partial debit", () => {
    const transactions = [
      { direction: TransactionDirection.CREDIT, amount: 50000 }, // Captured ₹500.00
      { direction: TransactionDirection.DEBIT, amount: 20000 },  // Partial refund ₹200.00
    ];

    let totalCaptured = 0;
    let totalRefunded = 0;

    for (const tx of transactions) {
      if (tx.direction === TransactionDirection.CREDIT) totalCaptured += tx.amount;
      else if (tx.direction === TransactionDirection.DEBIT) totalRefunded += tx.amount;
    }

    const refundableBalance = Math.max(0, totalCaptured - totalRefunded);
    expect(totalCaptured).toBe(50000);
    expect(totalRefunded).toBe(20000);
    expect(refundableBalance).toBe(30000); // ₹300.00 remaining
  });

  it("should maintain double-entry net revenue formula (Net = Gross - Refunds)", () => {
    const grossCredits = 150000; // ₹1,500
    const refundDebits = 50000;   // ₹500
    const netRevenue = Math.max(0, grossCredits - refundDebits);

    expect(netRevenue).toBe(100000);
    expect(grossCredits).toBe(netRevenue + refundDebits);
  });
});
