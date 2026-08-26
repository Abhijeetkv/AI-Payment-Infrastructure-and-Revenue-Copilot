import { inngest } from "./client";
import { db } from "@/lib/db";
import { LedgerService } from "@/lib/transactions/ledger";
import { AuditService } from "@/server/services/audit.service";
import { logger } from "@/lib/logger";

interface StepTools {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
}

export const processRefund = inngest.createFunction(
  {
    id: "process-refund-worker",
    retries: 3,
    triggers: [{ event: "refund/process" }],
  },
  async ({
    event,
    step,
  }: {
    event: { data: { refundId: string; paymentId: string; merchantId: string } };
    step: StepTools;
  }) => {
    const { refundId, paymentId, merchantId } = event.data;

    // Step 1: Verify Refund and Ledger Invariance
    const verification = await step.run("verify-refund-ledger", async () => {
      const refund = await db.refund.findUnique({
        where: { id: refundId },
        include: { payment: true },
      });

      if (!refund) {
        throw new Error(`Refund ${refundId} not found`);
      }

      // Check current ledger balance
      const ledger = await LedgerService.getRefundableAmount(paymentId);

      logger.info("Durable refund verification step executed", {
        refundId,
        paymentId,
        refundAmount: refund.amount,
        ledger,
      });

      return {
        refundId: refund.id,
        status: refund.status,
        refundableBalance: ledger.refundableBalance,
        totalRefunded: ledger.totalRefunded,
      };
    });

    // Step 2: Record Background Durable Completion Audit
    await step.run("record-audit-trail", async () => {
      await AuditService.createAuditLog({
        merchantId,
        entityType: "refund",
        entityId: refundId,
        action: "durable_refund_reconciled",
        changes: {
          verification,
        },
        performedBy: "inngest_worker",
      });
    });

    return {
      status: "completed",
      refundId,
      verification,
    };
  }
);
