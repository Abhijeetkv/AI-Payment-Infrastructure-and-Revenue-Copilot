import { inngest } from "./client";
import { db } from "@/lib/db";
import { extractWebhookEvent } from "@/lib/razorpay/webhooks";
import { LedgerService } from "@/lib/transactions/ledger";
import { AuditService } from "@/server/services/audit.service";
import {
  WebhookStatus,
  PaymentStatus,
  OrderStatus,
} from "@prisma/client";
import { logger } from "@/lib/logger";

interface StepTools {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
}

export const processWebhook = inngest.createFunction(
  {
    id: "process-webhook-event",
    retries: 3,
    triggers: [{ event: "webhook/received" }],
  },
  async ({
    event,
    step,
  }: {
    event: { data: { webhookEventId: string } };
    step: StepTools;
  }) => {
    const { webhookEventId } = event.data;

    // Step 1: Fetch and validate Webhook Event
    const webhookRecord = await step.run("fetch-webhook-event", async () => {
      const record = await db.webhookEvent.findUnique({
        where: { id: webhookEventId },
      });
      if (!record) {
        throw new Error(`WebhookEvent ${webhookEventId} not found`);
      }

      await db.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: WebhookStatus.PROCESSING },
      });

      return record;
    });

    // Step 2: Parse and route the event payload
    const executionResult = await step.run("process-event-payload", async () => {
      const parsed = extractWebhookEvent(webhookRecord.payload as Record<string, unknown>);
      if (!parsed) {
        return { status: "ignored", reason: "Invalid payload format" };
      }

      const { eventType, paymentId, orderId, amount, status } = parsed;

      // A. Payment Captured Event
      if (
        eventType === "payment.captured" ||
        eventType === "order.paid" ||
        (eventType === "payment.authorized" && status === "captured")
      ) {
        if (!paymentId) {
          return { status: "skipped", reason: "No payment ID found" };
        }

        // Find or associate payment record
        let payment = await db.payment.findUnique({
          where: { razorpayPaymentId: paymentId },
        });

        // If order exists and payment wasn't created via frontend yet, create it now
        if (!payment && orderId) {
          const order = await db.order.findFirst({
            where: { razorpayOrderId: orderId },
          });

          if (order) {
            payment = await db.payment.create({
              data: {
                merchantId: order.merchantId,
                orderId: order.id,
                razorpayPaymentId: paymentId,
                razorpayOrderId: orderId,
                amount: amount || order.amount,
                currency: order.currency,
                status: PaymentStatus.SUCCESS,
                paymentMethod: "webhook_capture",
              },
            });

            // Update order to PAID
            await db.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.PAID },
            });

            // Record Financial Ledger Entry (CREDIT)
            await LedgerService.recordPaymentTransaction({
              merchantId: order.merchantId,
              paymentId: payment.id,
              orderId: order.id,
              amount: payment.amount,
              referenceId: paymentId,
              currency: payment.currency,
              description: `Webhook capture for order ${order.receipt || order.id}`,
            });
          }
        } else if (payment && payment.status !== PaymentStatus.SUCCESS) {
          // Transition existing payment to SUCCESS
          await db.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.SUCCESS },
          });

          // Ensure order is PAID
          await db.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.PAID },
          });

          // Record Ledger Credit if not exists
          const existingTx = await db.transaction.findFirst({
            where: { paymentId: payment.id, referenceId: paymentId },
          });

          if (!existingTx) {
            await LedgerService.recordPaymentTransaction({
              merchantId: payment.merchantId,
              paymentId: payment.id,
              orderId: payment.orderId,
              amount: payment.amount,
              referenceId: paymentId,
              currency: payment.currency,
            });
          }
        }

        // Record Payment State Event & Reconcile Recovery Cases
        if (payment) {
          await db.paymentEvent.create({
            data: {
              merchantId: payment.merchantId,
              paymentId: payment.id,
              fromStatus: "PROCESSING",
              toStatus: PaymentStatus.SUCCESS,
              trigger: "webhook",
              metadata: { eventId: parsed.eventId, eventType },
            },
          });

          // Check if this payment or order was part of an active recovery case
          const activeCase = await db.recoveryCase.findFirst({
            where: {
              merchantId: payment.merchantId,
              OR: [
                { paymentId: payment.id },
                { orderId: payment.orderId },
                { actions: { some: { newOrderId: payment.orderId } } },
              ],
              status: {
                in: ["DETECTED", "ANALYZING", "ACTION_PENDING", "EXECUTING"],
              },
            },
          });

          if (activeCase) {
            await db.recoveryCase.update({
              where: { id: activeCase.id },
              data: {
                status: "RECOVERED",
                recoveredAmount: payment.amount,
                resolvedAt: new Date(),
              },
            });

            // Reconcile and complete active recovery action records
            await db.recoveryAction.updateMany({
              where: {
                recoveryCaseId: activeCase.id,
                status: "EXECUTING",
              },
              data: {
                status: "SUCCESS",
                newPaymentId: payment.id,
                newOrderId: payment.orderId,
                completedAt: new Date(),
                output: {
                  webhookEventId: parsed.eventId,
                  razorpayPaymentId: paymentId,
                  amount: payment.amount,
                },
              },
            });

            await db.recoveryTimeline.create({
              data: {
                recoveryCaseId: activeCase.id,
                event: "webhook_recovery_confirmed",
                description: `Payment captured via webhook (${paymentId}). ₹${(payment.amount / 100).toLocaleString("en-IN")} recovered.`,
                actor: "system",
                metadata: { paymentId, eventId: parsed.eventId, newPaymentId: payment.id },
              },
            });
          }
        }

        return { status: "processed", eventType, paymentId };
      }

      // B. Payment Failed Event
      if (eventType === "payment.failed") {
        if (paymentId) {
          const payment = await db.payment.findUnique({
            where: { razorpayPaymentId: paymentId },
          });

          if (payment) {
            await db.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.FAILED,
                failureReason: "Gateway transaction declined",
              },
            });

            await db.paymentEvent.create({
              data: {
                merchantId: payment.merchantId,
                paymentId: payment.id,
                fromStatus: payment.status,
                toStatus: PaymentStatus.FAILED,
                trigger: "webhook",
                metadata: { eventId: parsed.eventId, eventType },
              },
            });

            // Automatically detect and trigger AI Revenue Recovery Case
            try {
              const { RecoveryService } = await import("@/server/services/recovery.service");
              await RecoveryService.createRecoveryCase({
                merchantId: payment.merchantId,
                paymentId: payment.id,
                orderId: payment.orderId,
                riskAmount: payment.amount,
                failureType: "payment_failure",
                failureReason: "Gateway transaction declined",
                paymentMethod: payment.paymentMethod || undefined,
              });
            } catch (recoveryErr) {
              logger.warn("Failed to auto-create recovery case from webhook failure", { paymentId }, recoveryErr);
            }
          }
        }
        return { status: "failed_recorded", paymentId };
      }

      // C. Refund Processed / Created Event
      if (eventType === "refund.processed" || eventType === "refund.created") {
        const { refundId: rzpRefundId } = parsed;
        if (rzpRefundId && paymentId) {
          const payment = await db.payment.findUnique({
            where: { razorpayPaymentId: paymentId },
          });

          if (payment) {
            // Check if refund already recorded
            let refund = await db.refund.findUnique({
              where: { razorpayRefundId: rzpRefundId },
            });

            const refundAmount = amount || 0;

            if (!refund && refundAmount > 0) {
              refund = await db.refund.create({
                data: {
                  merchantId: payment.merchantId,
                  paymentId: payment.id,
                  razorpayRefundId: rzpRefundId,
                  amount: refundAmount,
                  currency: payment.currency,
                  status: "PROCESSED",
                  reason: "Razorpay webhook refund sync",
                },
              });

              // Record DEBIT in ledger if not already recorded
              await LedgerService.recordRefundTransaction({
                merchantId: payment.merchantId,
                paymentId: payment.id,
                orderId: payment.orderId,
                amount: refundAmount,
                refundId: refund.id,
                referenceId: rzpRefundId,
                currency: payment.currency,
                description: `Webhook sync refund ${rzpRefundId}`,
              });

              // Re-calculate ledger balance
              const { refundableBalance } = await LedgerService.getRefundableAmount(payment.id);
              const targetStatus =
                refundableBalance === 0
                  ? PaymentStatus.REFUNDED
                  : PaymentStatus.PARTIALLY_REFUNDED;

              await db.payment.update({
                where: { id: payment.id },
                data: { status: targetStatus },
              });

              await db.paymentEvent.create({
                data: {
                  merchantId: payment.merchantId,
                  paymentId: payment.id,
                  fromStatus: payment.status,
                  toStatus: targetStatus,
                  trigger: "webhook",
                  metadata: { eventId: parsed.eventId, eventType, rzpRefundId },
                },
              });
            }
          }
        }
        return { status: "refund_processed", rzpRefundId: parsed.refundId, paymentId };
      }

      return { status: "unhandled_event", eventType };
    });

    // Step 3: Mark Webhook as DELIVERED
    await step.run("mark-webhook-delivered", async () => {
      await db.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: WebhookStatus.DELIVERED,
          processedAt: new Date(),
        },
      });

      // Audit Log
      await AuditService.createAuditLog({
        merchantId: webhookRecord.merchantId || "system",
        entityType: "webhook",
        entityId: webhookRecord.id,
        action: "webhook_processed_durable",
        changes: executionResult,
      });

      logger.info("Webhook event processing completed successfully", {
        webhookEventId,
      });
    });

    return executionResult;
  }
);
