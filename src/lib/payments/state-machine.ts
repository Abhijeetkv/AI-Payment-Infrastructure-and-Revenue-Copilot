import { PaymentStatus, type Payment } from "@prisma/client";
import { db } from "@/lib/db";
import { PaymentStateError, NotFoundError } from "@/server/errors";
import { logger } from "@/lib/logger";

/**
 * Deterministic allowed state transitions for the payment lifecycle
 */
export const VALID_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.CREATED]: [
    PaymentStatus.PROCESSING,
    PaymentStatus.FAILED,
  ],
  [PaymentStatus.PROCESSING]: [
    PaymentStatus.AUTHORIZED,
    PaymentStatus.CAPTURED,
    PaymentStatus.SUCCESS,
    PaymentStatus.FAILED,
    PaymentStatus.PENDING,
  ],
  [PaymentStatus.AUTHORIZED]: [
    PaymentStatus.CAPTURED,
    PaymentStatus.FAILED,
  ],
  [PaymentStatus.CAPTURED]: [
    PaymentStatus.SUCCESS,
    PaymentStatus.FAILED,
  ],
  [PaymentStatus.SUCCESS]: [
    PaymentStatus.PARTIALLY_REFUNDED,
    PaymentStatus.REFUNDED,
  ],
  [PaymentStatus.FAILED]: [], // Terminal state
  [PaymentStatus.PENDING]: [
    PaymentStatus.PROCESSING,
    PaymentStatus.SUCCESS,
    PaymentStatus.FAILED,
  ],
  [PaymentStatus.PARTIALLY_REFUNDED]: [
    PaymentStatus.PARTIALLY_REFUNDED,
    PaymentStatus.REFUNDED,
  ],
  [PaymentStatus.REFUNDED]: [], // Terminal state
};

/**
 * Validates if transition from current status to target status is permitted
 */
export function validateTransition(
  from: PaymentStatus,
  to: PaymentStatus
): boolean {
  if (from === to) return true; // Idempotent same-state transition
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export interface TransitionOptions {
  trigger?: string; // "webhook", "api", "inngest", "manual"
  metadata?: Record<string, unknown>;
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Executes a deterministic payment state transition within an atomic transaction
 */
export async function transitionPayment(
  paymentId: string,
  toStatus: PaymentStatus,
  options: TransitionOptions = {}
): Promise<Payment> {
  const trigger = options.trigger || "system";

  return await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundError(`Payment ${paymentId} not found`);
    }

    // Check validity
    if (!validateTransition(payment.status, toStatus)) {
      logger.warn("Invalid payment state transition rejected", {
        paymentId,
        fromStatus: payment.status,
        toStatus,
      });
      throw new PaymentStateError(
        `Cannot transition payment ${paymentId} from ${payment.status} to ${toStatus}`
      );
    }

    if (payment.status === toStatus) {
      // Idempotent return if state is already desired
      return payment;
    }

    const previousStatus = payment.status;

    // Update payment record
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: toStatus },
    });

    // Record PaymentEvent
    await tx.paymentEvent.create({
      data: {
        merchantId: payment.merchantId,
        paymentId: payment.id,
        fromStatus: previousStatus,
        toStatus: toStatus,
        trigger: trigger,
        metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
      },
    });

    // Record AuditLog
    await tx.auditLog.create({
      data: {
        merchantId: payment.merchantId,
        entityType: "payment",
        entityId: payment.id,
        action: `status_changed_to_${toStatus.toLowerCase()}`,
        changes: {
          from: previousStatus,
          to: toStatus,
          trigger,
        },
        performedBy: options.performedBy || "system",
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      },
    });

    logger.info("Payment transitioned successfully", {
      paymentId,
      from: previousStatus,
      to: toStatus,
      trigger,
    });

    return updatedPayment;
  });
}
