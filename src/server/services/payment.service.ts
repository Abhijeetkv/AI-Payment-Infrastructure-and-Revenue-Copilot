import { db } from "@/lib/db";
import { verifyPaymentSignature, fetchRazorpayPayment } from "@/lib/razorpay/payments";
import { inngest } from "@/inngest/client";
import { ValidationError, NotFoundError } from "@/server/errors";
import { logger } from "@/lib/logger";
import {
  PaymentStatus,
  OrderStatus,
  TransactionType,
  TransactionDirection,
  TransactionStatus,
  type Prisma,
} from "@prisma/client";

export interface VerifyPaymentDTO {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
}

export interface ListPaymentsQuery {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  search?: string;
}

export class PaymentService {
  /**
   * Verify signature and record successful payment
   */
  static async verifyAndRecordPayment(
    merchantId: string,
    dto: VerifyPaymentDTO
  ) {
    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amount,
      currency = "INR",
      paymentMethod = "upi",
    } = dto;

    // 1. Verify signature authenticity
    const isValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      logger.warn("Invalid payment signature received", {
        razorpayOrderId,
        razorpayPaymentId,
      });
      throw new ValidationError("Invalid Razorpay payment signature");
    }

    // 2. Fetch payment metadata from Razorpay if available
    let resolvedMethod = paymentMethod;
    try {
      const rzpPayment = await fetchRazorpayPayment(razorpayPaymentId);
      if (rzpPayment.method) {
        resolvedMethod = rzpPayment.method;
      }
    } catch {
      // Use fallback provided method if fetch fails in test mode
    }

    // 3. Atomically update DB records
    const result = await db.$transaction(async (tx) => {
      // Find and verify order belongs to merchant
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          merchantId,
        },
      });

      if (!order) {
        throw new NotFoundError(`Order ${orderId} not found for this merchant`);
      }

      // Check if payment already recorded
      const existingPayment = await tx.payment.findUnique({
        where: { razorpayPaymentId },
      });

      if (existingPayment) {
        return { payment: existingPayment, order, alreadyProcessed: true };
      }

      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          merchantId,
          orderId: order.id,
          razorpayPaymentId,
          razorpayOrderId,
          amount,
          currency,
          paymentMethod: resolvedMethod,
          status: PaymentStatus.SUCCESS,
        },
      });

      // Update Order to PAID
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
        },
      });

      // Create Financial Ledger Entry (Transaction)
      await tx.transaction.create({
        data: {
          merchantId,
          paymentId: payment.id,
          orderId: order.id,
          type: TransactionType.PAYMENT,
          direction: TransactionDirection.CREDIT,
          amount,
          currency,
          status: TransactionStatus.COMPLETED,
          referenceId: razorpayPaymentId,
          description: `Payment for order ${order.receipt || order.id}`,
        },
      });

      // Record Payment State Event
      await tx.paymentEvent.create({
        data: {
          merchantId,
          paymentId: payment.id,
          fromStatus: "CREATED",
          toStatus: PaymentStatus.SUCCESS,
          trigger: "api_verify",
          metadata: {
            razorpayPaymentId,
            razorpayOrderId,
            method: resolvedMethod,
          },
        },
      });

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          merchantId,
          entityType: "payment",
          entityId: payment.id,
          action: "verified_and_captured",
          changes: {
            status: PaymentStatus.SUCCESS,
            amount,
            method: resolvedMethod,
          },
          performedBy: "system",
        },
      });

      return { payment, order: updatedOrder, alreadyProcessed: false };
    });

    // 4. Dispatch Inngest Event for async tasks (analytics, notifications)
    try {
      await inngest.send({
        name: "payment/created",
        data: {
          paymentId: result.payment.id,
          merchantId,
        },
      });
    } catch (err) {
      logger.warn("Failed to dispatch Inngest event", { paymentId: result.payment.id }, err);
    }

    logger.info("Payment verified and recorded successfully", {
      paymentId: result.payment.id,
      orderId: result.order.id,
      amount,
    });

    return result;
  }

  /**
   * Fetch single payment by ID
   */
  static async getPayment(merchantId: string, paymentId: string) {
    const payment = await db.payment.findFirst({
      where: {
        id: paymentId,
        merchantId,
      },
      include: {
        order: true,
        transactions: true,
        refunds: true,
        paymentEvents: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError(`Payment with ID ${paymentId} not found`);
    }

    return payment;
  }

  /**
   * List payments with pagination & filters
   */
  static async listPayments(merchantId: string, query: ListPaymentsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      merchantId,
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { id: { contains: query.search, mode: "insensitive" } },
          { razorpayPaymentId: { contains: query.search, mode: "insensitive" } },
          { razorpayOrderId: { contains: query.search, mode: "insensitive" } },
          { paymentMethod: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    const [total, payments] = await Promise.all([
      db.payment.count({ where }),
      db.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          order: true,
          transactions: true,
          refunds: true,
        },
      }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
