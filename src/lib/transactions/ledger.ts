import { db } from "@/lib/db";
import {
  TransactionType,
  TransactionDirection,
  TransactionStatus,
  type Prisma,
} from "@prisma/client";
import { logger } from "@/lib/logger";

type PrismaTransactionClient = Prisma.TransactionClient;

export class LedgerService {
  /**
   * Record a PAYMENT CREDIT transaction in the ledger
   */
  static async recordPaymentTransaction(
    params: {
      merchantId: string;
      paymentId: string;
      orderId: string;
      amount: number;
      referenceId?: string;
      currency?: string;
      description?: string;
    },
    txClient?: PrismaTransactionClient
  ) {
    const client = txClient || db;
    const {
      merchantId,
      paymentId,
      orderId,
      amount,
      referenceId,
      currency = "INR",
      description,
    } = params;

    const transaction = await client.transaction.create({
      data: {
        merchantId,
        paymentId,
        orderId,
        type: TransactionType.PAYMENT,
        direction: TransactionDirection.CREDIT,
        amount,
        currency,
        status: TransactionStatus.COMPLETED,
        referenceId,
        description: description || `Payment capture for order ${orderId}`,
      },
    });

    logger.info("Ledger entry created (CREDIT)", {
      transactionId: transaction.id,
      paymentId,
      amount,
    });

    return transaction;
  }

  /**
   * Record a REFUND DEBIT transaction in the ledger
   */
  static async recordRefundTransaction(
    params: {
      merchantId: string;
      paymentId: string;
      orderId: string;
      amount: number;
      refundId: string;
      referenceId?: string;
      currency?: string;
      description?: string;
    },
    txClient?: PrismaTransactionClient
  ) {
    const client = txClient || db;
    const {
      merchantId,
      paymentId,
      orderId,
      amount,
      referenceId,
      currency = "INR",
      description,
    } = params;

    const transaction = await client.transaction.create({
      data: {
        merchantId,
        paymentId,
        orderId,
        type: TransactionType.REFUND,
        direction: TransactionDirection.DEBIT,
        amount,
        currency,
        status: TransactionStatus.COMPLETED,
        referenceId,
        description: description || `Refund debit for payment ${paymentId}`,
      },
    });

    logger.info("Ledger entry created (DEBIT)", {
      transactionId: transaction.id,
      paymentId,
      amount,
    });

    return transaction;
  }

  /**
   * Calculate refundable balance strictly from the immutable ledger
   * Refundable Amount = Total Completed Credits - Total Completed Debits
   */
  static async getRefundableAmount(
    paymentId: string,
    txClient?: PrismaTransactionClient
  ): Promise<{
    totalCaptured: number;
    totalRefunded: number;
    refundableBalance: number;
  }> {
    const client = txClient || db;

    const transactions = await client.transaction.findMany({
      where: {
        paymentId,
        status: TransactionStatus.COMPLETED,
      },
    });

    let totalCaptured = 0;
    let totalRefunded = 0;

    for (const tx of transactions) {
      if (tx.direction === TransactionDirection.CREDIT) {
        totalCaptured += tx.amount;
      } else if (tx.direction === TransactionDirection.DEBIT) {
        totalRefunded += tx.amount;
      }
    }

    const refundableBalance = Math.max(0, totalCaptured - totalRefunded);

    return {
      totalCaptured,
      totalRefunded,
      refundableBalance,
    };
  }

  /**
   * Fetch transaction list with filters
   */
  static async listTransactions(
    merchantId: string,
    query: {
      page?: number;
      limit?: number;
      type?: TransactionType;
      direction?: TransactionDirection;
      search?: string;
    }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      merchantId,
      ...(query.type && { type: query.type }),
      ...(query.direction && { direction: query.direction }),
      ...(query.search && {
        OR: [
          { id: { contains: query.search, mode: "insensitive" } },
          { paymentId: { contains: query.search, mode: "insensitive" } },
          { orderId: { contains: query.search, mode: "insensitive" } },
          { referenceId: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    const [total, transactions] = await Promise.all([
      db.transaction.count({ where }),
      db.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          payment: true,
        },
      }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
