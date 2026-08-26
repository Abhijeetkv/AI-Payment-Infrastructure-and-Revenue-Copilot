import { inngest } from "./client";
import { db } from "@/lib/db";
import { LedgerService } from "@/lib/transactions/ledger";
import { PaymentStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

interface StepTools {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
}

export const processPayment = inngest.createFunction(
  {
    id: "process-payment-durable",
    retries: 3,
    triggers: [{ event: "payment/process" }],
  },
  async ({
    event,
    step,
  }: {
    event: { data: { paymentId: string; merchantId: string } };
    step: StepTools;
  }) => {
    const { paymentId, merchantId } = event.data;

    const payment = await step.run("verify-payment-record", async () => {
      const p = await db.payment.findUnique({
        where: { id: paymentId },
      });
      if (!p) throw new Error(`Payment ${paymentId} not found`);
      return p;
    });

    await step.run("ensure-financial-ledger-entry", async () => {
      if (payment.status === PaymentStatus.SUCCESS) {
        const existingTx = await db.transaction.findFirst({
          where: { paymentId: payment.id },
        });

        if (!existingTx) {
          await LedgerService.recordPaymentTransaction({
            merchantId,
            paymentId: payment.id,
            orderId: payment.orderId,
            amount: payment.amount,
            referenceId: payment.razorpayPaymentId || payment.id,
            currency: payment.currency,
          });
          logger.info("Ledger reconciled via Inngest background job", {
            paymentId: payment.id,
          });
        }
      }
    });

    return { status: "processed", paymentId };
  }
);
