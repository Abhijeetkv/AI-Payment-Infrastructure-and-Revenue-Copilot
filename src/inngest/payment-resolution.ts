import { inngest } from "./client";
import { db } from "@/lib/db";
import { fetchRazorpayPayment } from "@/lib/razorpay/payments";
import { PaymentStatus, OrderStatus } from "@prisma/client";
import { LedgerService } from "@/lib/transactions/ledger";
import { logger } from "@/lib/logger";

interface StepTools {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  sleep: (name: string, duration: string) => Promise<void>;
}

export const resolvePendingPayment = inngest.createFunction(
  {
    id: "resolve-pending-payment",
    retries: 2,
    triggers: [{ event: "payment/status.changed" }],
  },
  async ({
    event,
    step,
  }: {
    event: { data: { paymentId: string; toStatus: string; merchantId: string } };
    step: StepTools;
  }) => {
    const { paymentId, toStatus, merchantId } = event.data;

    // Only resolve if payment entered PENDING status
    if (toStatus !== "PENDING") {
      return { status: "skipped", reason: "Status is not PENDING" };
    }

    // Wait 30 seconds before probing Razorpay for final bank status
    await step.sleep("wait-for-gateway-confirmation", "30s");

    const resolved = await step.run("probe-razorpay-status", async () => {
      const payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: { order: true },
      });

      if (!payment || payment.status !== PaymentStatus.PENDING) {
        return { status: "already_resolved" };
      }

      if (!payment.razorpayPaymentId) {
        return { status: "no_gateway_id" };
      }

      try {
        const rzpPayment = await fetchRazorpayPayment(payment.razorpayPaymentId);

        if (rzpPayment.status === "captured") {
          await db.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.SUCCESS },
          });

          await db.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.PAID },
          });

          await LedgerService.recordPaymentTransaction({
            merchantId,
            paymentId: payment.id,
            orderId: payment.orderId,
            amount: payment.amount,
            referenceId: payment.razorpayPaymentId,
            currency: payment.currency,
          });

          logger.info("Pending payment successfully confirmed and captured", {
            paymentId,
          });

          return { status: "confirmed_captured" };
        } else if (rzpPayment.status === "failed") {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              failureReason: "Bank reconciliation declined",
            },
          });
          return { status: "confirmed_failed" };
        }
      } catch (err) {
        logger.warn("Failed to probe Razorpay status for pending payment", { paymentId }, err);
      }

      return { status: "still_pending" };
    });

    return resolved;
  }
);
