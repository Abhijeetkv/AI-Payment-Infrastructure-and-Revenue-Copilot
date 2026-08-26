import { db } from "@/lib/db";
import { createRazorpayRefund } from "@/lib/razorpay/refunds";
import { LedgerService } from "@/lib/transactions/ledger";
import { AuditService } from "@/server/services/audit.service";
import { inngest } from "@/inngest/client";
import { validateTransition } from "@/lib/payments/state-machine";
import {
  ValidationError,
  NotFoundError,
  PaymentStateError,
} from "@/server/errors";
import { logger } from "@/lib/logger";
import {
  PaymentStatus,
  RefundStatus,
  type Prisma,
} from "@prisma/client";

export interface CreateRefundDTO {
  paymentId: string;
  amount?: number; // In paise. If omitted, full refundable balance is refunded.
  reason?: string;
  speed?: "normal" | "optimum";
  notes?: Record<string, string>;
  performedBy?: string;
}

export interface ListRefundsQuery {
  page?: number;
  limit?: number;
  status?: RefundStatus;
  search?: string;
  paymentId?: string;
}

export class RefundService {
  /**
   * Orchestrates full or partial refund with live ledger balance validation,
   * gateway execution, atomic DEBIT ledger entry, and payment state transitions.
   */
  static async createRefund(merchantId: string, dto: CreateRefundDTO) {
    const {
      paymentId,
      amount: requestedAmount,
      reason = "Customer requested refund",
      speed = "normal",
      notes,
      performedBy = "system",
    } = dto;

    // 1. Fetch and validate payment ownership
    const payment = await db.payment.findFirst({
      where: {
        id: paymentId,
        merchantId,
      },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundError(`Payment ${paymentId} not found for this merchant`);
    }

    // 2. Validate Payment State allows refunding
    const refundableStates: PaymentStatus[] = [
      PaymentStatus.SUCCESS,
      PaymentStatus.CAPTURED,
      PaymentStatus.PARTIALLY_REFUNDED,
    ];

    if (!refundableStates.includes(payment.status)) {
      throw new PaymentStateError(
        `Cannot refund payment in status '${payment.status}'. Payment must be SUCCESS, CAPTURED, or PARTIALLY_REFUNDED.`
      );
    }

    // 3. Compute live ledger refundable balance (CRITICAL INVARIANCE)
    const { refundableBalance } = await LedgerService.getRefundableAmount(payment.id);

    if (refundableBalance <= 0) {
      throw new ValidationError(
        "This payment has already been fully refunded (available refundable balance is 0)."
      );
    }

    // Determine target refund amount
    const refundAmount = requestedAmount !== undefined ? requestedAmount : refundableBalance;

    if (refundAmount <= 0) {
      throw new ValidationError("Refund amount must be greater than zero.");
    }

    if (refundAmount > refundableBalance) {
      throw new ValidationError(
        `Refund amount of ${refundAmount} paise exceeds the available refundable balance of ${refundableBalance} paise.`
      );
    }

    // Determine target payment status
    const remainingBalance = refundableBalance - refundAmount;
    const targetPaymentStatus =
      remainingBalance === 0
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    // Validate state machine transition
    if (!validateTransition(payment.status, targetPaymentStatus)) {
      throw new PaymentStateError(
        `Invalid state transition from ${payment.status} to ${targetPaymentStatus}`
      );
    }

    // 4. Execute refund with Razorpay Gateway
    const razorpayPaymentId = payment.razorpayPaymentId || `pay_${payment.id}`;
    const rzpRefund = await createRazorpayRefund(razorpayPaymentId, {
      amount: refundAmount,
      speed,
      notes: notes || { reason },
      receipt: `ref_${Date.now()}`,
    });

    // 5. Execute Atomic Database Transaction
    const result = await db.$transaction(async (tx) => {
      // A. Create Refund Record
      const refund = await tx.refund.create({
        data: {
          merchantId,
          paymentId: payment.id,
          razorpayRefundId: rzpRefund.id,
          amount: refundAmount,
          currency: payment.currency,
          status: RefundStatus.PROCESSED,
          reason,
        },
      });

      // B. Create Immutable Ledger DEBIT Transaction
      const transaction = await LedgerService.recordRefundTransaction(
        {
          merchantId,
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: refundAmount,
          refundId: refund.id,
          referenceId: rzpRefund.id,
          currency: payment.currency,
          description: `Refund (${remainingBalance === 0 ? "Full" : "Partial"}): ${reason}`,
        },
        tx
      );

      // C. Transition Payment State
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: targetPaymentStatus,
        },
      });

      // D. Record Payment State Machine Event
      await tx.paymentEvent.create({
        data: {
          merchantId,
          paymentId: payment.id,
          fromStatus: payment.status,
          toStatus: targetPaymentStatus,
          trigger: "refund_api",
          metadata: {
            refundId: refund.id,
            razorpayRefundId: rzpRefund.id,
            refundAmount,
            remainingBalance,
            reason,
          },
        },
      });

      // E. Record Audit Logs
      await AuditService.createAuditLog(
        {
          merchantId,
          entityType: "refund",
          entityId: refund.id,
          action: "refund_issued",
          changes: {
            amount: refundAmount,
            status: RefundStatus.PROCESSED,
            paymentStatus: targetPaymentStatus,
            remainingBalance,
            reason,
          },
          performedBy,
        },
        tx
      );

      return {
        refund,
        transaction,
        payment: updatedPayment,
        remainingBalance,
      };
    });

    // 6. Dispatch Inngest Event for background durability & notifications
    try {
      await inngest.send({
        name: "refund/process",
        data: {
          refundId: result.refund.id,
          paymentId: payment.id,
          merchantId,
        },
      });
    } catch (err) {
      logger.warn("Failed to dispatch refund Inngest event", { refundId: result.refund.id }, err);
    }

    logger.info("Refund created and ledger debited successfully", {
      refundId: result.refund.id,
      paymentId: payment.id,
      amount: refundAmount,
      targetPaymentStatus,
      remainingBalance,
    });

    return result;
  }

  /**
   * Fetch single refund with linked payment, order, ledger entries, and audit logs
   */
  static async getRefund(merchantId: string, refundId: string) {
    const refund = await db.refund.findFirst({
      where: {
        id: refundId,
        merchantId,
      },
      include: {
        payment: {
          include: {
            order: true,
            transactions: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundError(`Refund with ID ${refundId} not found`);
    }

    const auditLogs = await AuditService.getEntityAuditLogs(
      merchantId,
      "refund",
      refund.id
    );

    const ledgerBalance = await LedgerService.getRefundableAmount(refund.paymentId);

    return {
      ...refund,
      ledgerBalance,
      auditLogs,
    };
  }

  /**
   * List refunds with pagination, search, and status filters
   */
  static async listRefunds(merchantId: string, query: ListRefundsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.RefundWhereInput = {
      merchantId,
      ...(query.status && { status: query.status }),
      ...(query.paymentId && { paymentId: query.paymentId }),
      ...(query.search && {
        OR: [
          { id: { contains: query.search, mode: "insensitive" } },
          { razorpayRefundId: { contains: query.search, mode: "insensitive" } },
          { paymentId: { contains: query.search, mode: "insensitive" } },
          { reason: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    const [total, refunds] = await Promise.all([
      db.refund.count({ where }),
      db.refund.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          payment: {
            include: {
              order: true,
            },
          },
        },
      }),
    ]);

    return {
      refunds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Aggregate refund metrics for the merchant dashboard
   */
  static async getRefundMetrics(merchantId: string) {
    const [totalRefunds, processedRefunds, pendingRefunds, sumResult, paymentsTotal] =
      await Promise.all([
        db.refund.count({ where: { merchantId } }),
        db.refund.count({
          where: { merchantId, status: RefundStatus.PROCESSED },
        }),
        db.refund.count({
          where: {
            merchantId,
            status: { in: [RefundStatus.PROCESSING, RefundStatus.CREATED] },
          },
        }),
        db.refund.aggregate({
          where: { merchantId, status: RefundStatus.PROCESSED },
          _sum: { amount: true },
          _avg: { amount: true },
        }),
        db.payment.count({
          where: {
            merchantId,
            status: { in: [PaymentStatus.SUCCESS, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] },
          },
        }),
      ]);

    const totalRefundVolume = sumResult._sum.amount || 0;
    const avgRefundAmount = Math.round(sumResult._avg.amount || 0);
    const refundRate = paymentsTotal > 0 ? (totalRefunds / paymentsTotal) * 100 : 0;

    const partialRefundsCount = await db.payment.count({
      where: { merchantId, status: PaymentStatus.PARTIALLY_REFUNDED },
    });

    const fullRefundsCount = await db.payment.count({
      where: { merchantId, status: PaymentStatus.REFUNDED },
    });

    return {
      totalRefundVolume,
      totalRefunds,
      processedRefunds,
      pendingRefunds,
      avgRefundAmount,
      refundRate: Number(refundRate.toFixed(2)),
      partialRefundsCount,
      fullRefundsCount,
    };
  }
}
