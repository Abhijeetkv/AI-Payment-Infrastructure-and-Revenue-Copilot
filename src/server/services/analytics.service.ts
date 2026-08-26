import { db } from "@/lib/db";
import { PaymentStatus, TransactionType, TransactionDirection, TransactionStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

export interface AnalyticsDateRangeOptions {
  startDate?: Date;
  endDate?: Date;
}

export interface TimeseriesOptions {
  startDate: Date;
  endDate: Date;
  granularity?: "day" | "week" | "month";
}

export interface OverviewMetricsResult {
  grossRevenue: number; // in paise
  refundAmount: number; // in paise
  netRevenue: number;   // in paise
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  partiallyRefundedPayments: number;
  refundedPayments: number;
  successRate: number; // percentage (0-100)
  failureRate: number; // percentage (0-100)
  refundRate: number;  // percentage (0-100)
  avgTransactionValue: number; // in paise
  comparison?: {
    grossRevenueGrowth: number; // % change
    netRevenueGrowth: number;   // % change
    volumeGrowth: number;       // % change
    successRateDelta: number;   // delta
  };
}

export interface TimeseriesDataPoint {
  date: string;
  grossRevenue: number; // formatted in currency unit (Rupees for display or paise)
  netRevenue: number;
  refundAmount: number;
  transactionCount: number;
  successfulCount: number;
  failedCount: number;
  successRate: number;
}

export interface MethodBreakdownItem {
  method: string;
  count: number;
  volume: number; // in paise
  successRate: number; // %
  percentageShare: number; // % of total volume
}

export class AnalyticsService {
  /**
   * Computes high-level KPI overview metrics for a given date window with period comparison
   */
  static async getOverviewMetrics(
    merchantId: string,
    options: AnalyticsDateRangeOptions = {}
  ): Promise<OverviewMetricsResult> {
    const now = new Date();
    const endDate = options.endDate || now;
    const startDate = options.startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days default

    // Previous window for period-over-period comparison
    const durationMs = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - durationMs);
    const prevEndDate = new Date(startDate.getTime());

    // Current period aggregations
    const [
      creditSum,
      debitSum,
      paymentsCount,
      successCount,
      failedCount,
      pendingCount,
      partialRefundCount,
      fullRefundCount,
    ] = await Promise.all([
      db.transaction.aggregate({
        where: {
          merchantId,
          type: TransactionType.PAYMENT,
          direction: TransactionDirection.CREDIT,
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _avg: { amount: true },
        _count: { id: true },
      }),
      db.transaction.aggregate({
        where: {
          merchantId,
          type: TransactionType.REFUND,
          direction: TransactionDirection.DEBIT,
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      db.payment.count({
        where: { merchantId, createdAt: { gte: startDate, lte: endDate } },
      }),
      db.payment.count({
        where: {
          merchantId,
          status: { in: [PaymentStatus.SUCCESS, PaymentStatus.CAPTURED, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      db.payment.count({
        where: {
          merchantId,
          status: PaymentStatus.FAILED,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      db.payment.count({
        where: {
          merchantId,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING, PaymentStatus.CREATED] },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      db.payment.count({
        where: {
          merchantId,
          status: PaymentStatus.PARTIALLY_REFUNDED,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      db.payment.count({
        where: {
          merchantId,
          status: PaymentStatus.REFUNDED,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const grossRevenue = creditSum._sum.amount || 0;
    const refundAmount = debitSum._sum.amount || 0;
    const netRevenue = Math.max(0, grossRevenue - refundAmount);
    const totalTransactions = paymentsCount;
    const successfulPayments = successCount;
    const failedPayments = failedCount;
    const pendingPayments = pendingCount;
    const avgTransactionValue = creditSum._avg.amount ? Math.round(creditSum._avg.amount) : 0;

    const successRate = totalTransactions > 0 ? Number(((successfulPayments / totalTransactions) * 100).toFixed(1)) : 0;
    const failureRate = totalTransactions > 0 ? Number(((failedCount / totalTransactions) * 100).toFixed(1)) : 0;
    const refundRate = successfulPayments > 0 ? Number((((partialRefundCount + fullRefundCount) / successfulPayments) * 100).toFixed(1)) : 0;

    // Previous period aggregations for growth calculations
    const [prevCreditSum, prevDebitSum, prevPaymentsCount, prevSuccessCount] = await Promise.all([
      db.transaction.aggregate({
        where: {
          merchantId,
          type: TransactionType.PAYMENT,
          direction: TransactionDirection.CREDIT,
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: prevStartDate, lte: prevEndDate },
        },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: {
          merchantId,
          type: TransactionType.REFUND,
          direction: TransactionDirection.DEBIT,
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: prevStartDate, lte: prevEndDate },
        },
        _sum: { amount: true },
      }),
      db.payment.count({
        where: { merchantId, createdAt: { gte: prevStartDate, lte: prevEndDate } },
      }),
      db.payment.count({
        where: {
          merchantId,
          status: { in: [PaymentStatus.SUCCESS, PaymentStatus.CAPTURED, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] },
          createdAt: { gte: prevStartDate, lte: prevEndDate },
        },
      }),
    ]);

    const prevGrossRevenue = prevCreditSum._sum.amount || 0;
    const prevNetRevenue = Math.max(0, prevGrossRevenue - (prevDebitSum._sum.amount || 0));
    const prevSuccessRate = prevPaymentsCount > 0 ? (prevSuccessCount / prevPaymentsCount) * 100 : 0;

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    return {
      grossRevenue,
      refundAmount,
      netRevenue,
      totalTransactions,
      successfulPayments,
      failedPayments,
      pendingPayments,
      partiallyRefundedPayments: partialRefundCount,
      refundedPayments: fullRefundCount,
      successRate,
      failureRate,
      refundRate,
      avgTransactionValue,
      comparison: {
        grossRevenueGrowth: calculateGrowth(grossRevenue, prevGrossRevenue),
        netRevenueGrowth: calculateGrowth(netRevenue, prevNetRevenue),
        volumeGrowth: calculateGrowth(totalTransactions, prevPaymentsCount),
        successRateDelta: Number((successRate - prevSuccessRate).toFixed(1)),
      },
    };
  }

  /**
   * Generates time-bucketed timeseries data for charts
   */
  static async getTimeseriesData(
    merchantId: string,
    options: TimeseriesOptions
  ): Promise<TimeseriesDataPoint[]> {
    const { startDate, endDate, granularity = "day" } = options;

    // Fetch all transactions and payments in the window
    const [transactions, payments] = await Promise.all([
      db.transaction.findMany({
        where: {
          merchantId,
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          type: true,
          direction: true,
          amount: true,
          createdAt: true,
        },
      }),
      db.payment.findMany({
        where: {
          merchantId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // Format helper based on granularity
    const formatDateBucket = (d: Date): string => {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");

      if (granularity === "month") {
        return `${year}-${month}`;
      }
      if (granularity === "week") {
        // Approximate to Monday of the week
        const dayOfWeek = d.getUTCDay();
        const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`;
      }
      return `${year}-${month}-${day}`;
    };

    // Initialize date buckets across the range
    const bucketMap = new Map<
      string,
      {
        grossRevenue: number;
        refundAmount: number;
        transactionCount: number;
        successfulCount: number;
        failedCount: number;
      }
    >();

    const cursor = new Date(startDate.getTime());
    cursor.setUTCHours(0, 0, 0, 0);

    while (cursor <= endDate) {
      const key = formatDateBucket(cursor);
      if (!bucketMap.has(key)) {
        bucketMap.set(key, {
          grossRevenue: 0,
          refundAmount: 0,
          transactionCount: 0,
          successfulCount: 0,
          failedCount: 0,
        });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // Populate transaction amounts
    for (const tx of transactions) {
      const key = formatDateBucket(new Date(tx.createdAt));
      const entry = bucketMap.get(key) || {
        grossRevenue: 0,
        refundAmount: 0,
        transactionCount: 0,
        successfulCount: 0,
        failedCount: 0,
      };

      if (tx.direction === TransactionDirection.CREDIT) {
        entry.grossRevenue += tx.amount;
      } else if (tx.direction === TransactionDirection.DEBIT) {
        entry.refundAmount += tx.amount;
      }
      bucketMap.set(key, entry);
    }

    // Populate payment counts
    for (const p of payments) {
      const key = formatDateBucket(new Date(p.createdAt));
      const entry = bucketMap.get(key) || {
        grossRevenue: 0,
        refundAmount: 0,
        transactionCount: 0,
        successfulCount: 0,
        failedCount: 0,
      };

      entry.transactionCount += 1;
      if (
        p.status === PaymentStatus.SUCCESS ||
        p.status === PaymentStatus.CAPTURED ||
        p.status === PaymentStatus.PARTIALLY_REFUNDED ||
        p.status === PaymentStatus.REFUNDED
      ) {
        entry.successfulCount += 1;
      } else if (p.status === PaymentStatus.FAILED) {
        entry.failedCount += 1;
      }
      bucketMap.set(key, entry);
    }

    // Convert map to sorted timeseries
    const result: TimeseriesDataPoint[] = [];
    const sortedKeys = Array.from(bucketMap.keys()).sort();

    for (const date of sortedKeys) {
      const val = bucketMap.get(date)!;
      const netRevenue = Math.max(0, val.grossRevenue - val.refundAmount);
      const successRate =
        val.transactionCount > 0
          ? Number(((val.successfulCount / val.transactionCount) * 100).toFixed(1))
          : 0;

      result.push({
        date,
        grossRevenue: val.grossRevenue,
        netRevenue,
        refundAmount: val.refundAmount,
        transactionCount: val.transactionCount,
        successfulCount: val.successfulCount,
        failedCount: val.failedCount,
        successRate,
      });
    }

    return result;
  }

  /**
   * Computes method-level volume, share %, and success rate breakdown
   */
  static async getMethodBreakdown(
    merchantId: string,
    options: AnalyticsDateRangeOptions = {}
  ): Promise<MethodBreakdownItem[]> {
    const now = new Date();
    const endDate = options.endDate || now;
    const startDate = options.startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const payments = await db.payment.findMany({
      where: {
        merchantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        paymentMethod: true,
        amount: true,
        status: true,
      },
    });

    const methodStats = new Map<
      string,
      { totalCount: number; successCount: number; volume: number }
    >();

    let grandTotalVolume = 0;

    for (const p of payments) {
      const rawMethod = (p.paymentMethod || "other").toLowerCase();
      // Normalize common method aliases
      let normalized = "other";
      if (rawMethod.includes("upi")) normalized = "upi";
      else if (rawMethod.includes("card")) normalized = "card";
      else if (rawMethod.includes("netbanking")) normalized = "netbanking";
      else if (rawMethod.includes("wallet")) normalized = "wallet";
      else normalized = rawMethod;

      const current = methodStats.get(normalized) || {
        totalCount: 0,
        successCount: 0,
        volume: 0,
      };

      current.totalCount += 1;
      const isSuccess =
        p.status === PaymentStatus.SUCCESS ||
        p.status === PaymentStatus.CAPTURED ||
        p.status === PaymentStatus.PARTIALLY_REFUNDED ||
        p.status === PaymentStatus.REFUNDED;

      if (isSuccess) {
        current.successCount += 1;
        current.volume += p.amount;
        grandTotalVolume += p.amount;
      }

      methodStats.set(normalized, current);
    }

    const items: MethodBreakdownItem[] = [];
    for (const [method, stats] of methodStats.entries()) {
      const successRate =
        stats.totalCount > 0
          ? Number(((stats.successCount / stats.totalCount) * 100).toFixed(1))
          : 0;

      const percentageShare =
        grandTotalVolume > 0
          ? Number(((stats.volume / grandTotalVolume) * 100).toFixed(1))
          : 0;

      items.push({
        method: method.toUpperCase(),
        count: stats.totalCount,
        volume: stats.volume,
        successRate,
        percentageShare,
      });
    }

    // Sort by volume descending
    return items.sort((a, b) => b.volume - a.volume);
  }

  /**
   * Persists / updates DailyMetric rollup for a single calendar day
   */
  static async computeAndSaveDailyRollup(merchantId: string, targetDate: Date) {
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const metrics = await this.getOverviewMetrics(merchantId, {
      startDate: startOfDay,
      endDate: endOfDay,
    });

    const methodBreakdown = await this.getMethodBreakdown(merchantId, {
      startDate: startOfDay,
      endDate: endOfDay,
    });

    const record = await db.dailyMetric.upsert({
      where: {
        merchantId_date: {
          merchantId,
          date: startOfDay,
        },
      },
      update: {
        grossRevenue: metrics.grossRevenue,
        refundAmount: metrics.refundAmount,
        netRevenue: metrics.netRevenue,
        successfulPayments: metrics.successfulPayments,
        failedPayments: metrics.failedPayments,
        pendingPayments: metrics.pendingPayments,
        transactionCount: metrics.totalTransactions,
        successRate: metrics.successRate,
        failureRate: metrics.failureRate,
        refundRate: metrics.refundRate,
        avgTransactionValue: metrics.avgTransactionValue,
        methodBreakdown: JSON.stringify(methodBreakdown),
      },
      create: {
        merchantId,
        date: startOfDay,
        grossRevenue: metrics.grossRevenue,
        refundAmount: metrics.refundAmount,
        netRevenue: metrics.netRevenue,
        successfulPayments: metrics.successfulPayments,
        failedPayments: metrics.failedPayments,
        pendingPayments: metrics.pendingPayments,
        transactionCount: metrics.totalTransactions,
        successRate: metrics.successRate,
        failureRate: metrics.failureRate,
        refundRate: metrics.refundRate,
        avgTransactionValue: metrics.avgTransactionValue,
        methodBreakdown: JSON.stringify(methodBreakdown),
      },
    });

    logger.info("DailyMetric rollup recorded successfully", {
      merchantId,
      date: startOfDay.toISOString().split("T")[0],
      grossRevenue: metrics.grossRevenue,
      netRevenue: metrics.netRevenue,
    });

    return record;
  }
}
