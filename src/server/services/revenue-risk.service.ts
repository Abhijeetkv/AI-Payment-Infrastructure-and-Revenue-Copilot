import { db } from "@/lib/db";
import { PaymentStatus } from "@prisma/client";
import { logger } from "@/lib/logger";
import { formatCurrency } from "@/lib/utils";
import {
  BASE_RECOVERY_PROBABILITIES,
  METHOD_RECOVERY_ADJUSTMENTS,
} from "@/lib/recovery/policy";
import type { RecoveryMetrics, FailureTypeBreakdown, MethodBreakdown } from "@/lib/recovery/types";

export class RevenueRiskService {
  /**
   * Calculate total revenue at risk from failed/recoverable payments.
   * This is DETERMINISTIC — no AI involved.
   */
  static async getRevenueAtRisk(merchantId: string): Promise<{
    totalAtRisk: number;
    eligiblePayments: number;
    byFailureType: FailureTypeBreakdown[];
    byPaymentMethod: MethodBreakdown[];
  }> {
    // Failed payments that are not already in a recovery case
    const failedPayments = await db.payment.findMany({
      where: {
        merchantId,
        status: PaymentStatus.FAILED,
      },
      include: {
        recoveryCases: {
          where: {
            status: {
              in: ["RECOVERED", "STOPPED", "EXPIRED"],
            },
          },
        },
      },
    });

    // Filter to only those without an active/completed recovery case
    const existingCasePaymentIds = new Set(
      (await db.recoveryCase.findMany({
        where: {
          merchantId,
          status: {
            notIn: ["FAILED", "EXPIRED"],
          },
        },
        select: { paymentId: true },
      })).map((c) => c.paymentId)
    );

    const eligiblePayments = failedPayments.filter(
      (p) => !existingCasePaymentIds.has(p.id)
    );

    const totalAtRisk = eligiblePayments.reduce((sum, p) => sum + p.amount, 0);

    // Breakdown by failure type
    const failureTypeMap = new Map<string, { count: number; amount: number }>();
    for (const p of eligiblePayments) {
      const type = p.failureReason?.includes("bank") || p.failureReason?.includes("decline")
        ? "payment_failure"
        : p.failureReason?.includes("timeout") || p.failureReason?.includes("network")
          ? "checkout_abandonment"
          : "payment_failure";

      const existing = failureTypeMap.get(type) || { count: 0, amount: 0 };
      failureTypeMap.set(type, {
        count: existing.count + 1,
        amount: existing.amount + p.amount,
      });
    }

    const byFailureType: FailureTypeBreakdown[] = Array.from(failureTypeMap.entries()).map(
      ([failureType, data]) => ({
        failureType,
        count: data.count,
        riskAmount: data.amount,
        recoveredAmount: 0,
        recoveryRate: 0,
      })
    );

    // Breakdown by payment method
    const methodMap = new Map<string, { count: number; amount: number }>();
    for (const p of eligiblePayments) {
      const method = p.paymentMethod || "unknown";
      const existing = methodMap.get(method) || { count: 0, amount: 0 };
      methodMap.set(method, {
        count: existing.count + 1,
        amount: existing.amount + p.amount,
      });
    }

    const byPaymentMethod: MethodBreakdown[] = Array.from(methodMap.entries()).map(
      ([method, data]) => ({
        method,
        count: data.count,
        riskAmount: data.amount,
        recoveredAmount: 0,
        recoveryRate: 0,
      })
    );

    return {
      totalAtRisk,
      eligiblePayments: eligiblePayments.length,
      byFailureType,
      byPaymentMethod,
    };
  }

  /**
   * Calculate recovery probability for a specific failed payment.
   * Uses deterministic factors: failure type, payment method success history, customer history.
   */
  static async calculateRecoveryProbability(
    merchantId: string,
    paymentId: string
  ): Promise<{
    probability: number;
    expectedRecoveryAmount: number;
    factors: string[];
  }> {
    const payment = await db.payment.findFirst({
      where: { id: paymentId, merchantId },
      include: { order: true },
    });

    if (!payment) {
      return { probability: 0, expectedRecoveryAmount: 0, factors: ["Payment not found"] };
    }

    const factors: string[] = [];
    let probability = BASE_RECOVERY_PROBABILITIES.payment_failure;

    // Factor 1: Payment method historical success rate
    const method = payment.paymentMethod || "upi";
    const methodAdjustment = METHOD_RECOVERY_ADJUSTMENTS[method] || 0;

    const methodStats = await db.payment.groupBy({
      by: ["status"],
      where: {
        merchantId,
        paymentMethod: method,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      _count: true,
    });

    const methodTotal = methodStats.reduce((s, r) => s + r._count, 0);
    const methodSuccess = methodStats
      .filter((r) => r.status === PaymentStatus.SUCCESS)
      .reduce((s, r) => s + r._count, 0);
    const methodSuccessRate = methodTotal > 0 ? methodSuccess / methodTotal : 0.85;

    probability += methodAdjustment;
    factors.push(`${method.toUpperCase()} success rate: ${(methodSuccessRate * 100).toFixed(1)}%`);

    // Factor 2: Customer payment history (if we can identify customer by order)
    const customerPayments = await db.payment.count({
      where: {
        merchantId,
        orderId: payment.orderId,
        status: PaymentStatus.SUCCESS,
      },
    });

    if (customerPayments > 0) {
      probability += 0.10;
      factors.push(`Customer has ${customerPayments} successful payment(s)`);
    }

    // Factor 3: Time since failure (fresher = higher probability)
    const hoursSinceFailure = (Date.now() - payment.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceFailure < 1) {
      probability += 0.10;
      factors.push("Payment failed less than 1 hour ago");
    } else if (hoursSinceFailure < 24) {
      probability += 0.05;
      factors.push(`Payment failed ${Math.round(hoursSinceFailure)} hours ago`);
    } else {
      probability -= 0.10;
      factors.push(`Payment failed ${Math.round(hoursSinceFailure / 24)} days ago`);
    }

    // Factor 4: Amount-based adjustment (smaller amounts recover better)
    if (payment.amount < 100000) {
      // < ₹1,000
      probability += 0.05;
      factors.push(`Amount ${formatCurrency(payment.amount)} is within easy recovery range`);
    } else if (payment.amount > 500000) {
      // > ₹5,000
      probability -= 0.05;
      factors.push(`Higher amount ${formatCurrency(payment.amount)} may reduce recovery likelihood`);
    }

    // Factor 5: Repeated failures for same order
    const failureCount = await db.payment.count({
      where: {
        merchantId,
        orderId: payment.orderId,
        status: PaymentStatus.FAILED,
      },
    });

    if (failureCount > 2) {
      probability -= 0.15;
      factors.push(`${failureCount} failed attempts on this order — repeated failure pattern`);
    }

    // Clamp probability between 0 and 1
    probability = Math.max(0, Math.min(1, probability));

    const expectedRecoveryAmount = Math.round(payment.amount * probability);

    logger.info("Recovery probability calculated", {
      paymentId,
      probability: Math.round(probability * 100),
      expectedRecoveryAmount,
    });

    return {
      probability: Math.round(probability * 100) / 100,
      expectedRecoveryAmount,
      factors,
    };
  }

  /**
   * Get comprehensive recovery metrics for the dashboard.
   * All financial calculations are deterministic.
   */
  static async getRecoveryMetrics(merchantId: string): Promise<RecoveryMetrics> {
    const [
      allCases,
      recoveredCases,
      failedCases,
      escalatedCases,
      stoppedCases,
      activeCases,
    ] = await Promise.all([
      db.recoveryCase.count({ where: { merchantId } }),
      db.recoveryCase.findMany({
        where: { merchantId, status: "RECOVERED" },
        select: { recoveredAmount: true, createdAt: true, resolvedAt: true },
      }),
      db.recoveryCase.count({ where: { merchantId, status: "FAILED" } }),
      db.recoveryCase.count({ where: { merchantId, status: "ESCALATED" } }),
      db.recoveryCase.count({ where: { merchantId, status: "STOPPED" } }),
      db.recoveryCase.count({
        where: {
          merchantId,
          status: { in: ["DETECTED", "ANALYZING", "ACTION_PENDING", "EXECUTING"] },
        },
      }),
    ]);

    // Revenue at risk (from active + failed cases)
    const riskAgg = await db.recoveryCase.aggregate({
      where: { merchantId },
      _sum: { riskAmount: true, recoveredAmount: true, expectedRecoveryAmount: true },
    });

    const revenueAtRisk = riskAgg._sum.riskAmount || 0;
    const recoveredRevenue = riskAgg._sum.recoveredAmount || 0;
    const expectedRecovery = riskAgg._sum.expectedRecoveryAmount || 0;

    const recoveryRate = revenueAtRisk > 0
      ? Math.round((recoveredRevenue / revenueAtRisk) * 1000) / 10
      : 0;

    // Average recovery time in minutes
    let avgRecoveryTime: number | null = null;
    if (recoveredCases.length > 0) {
      const totalMinutes = recoveredCases.reduce((sum, c) => {
        if (c.resolvedAt) {
          return sum + (c.resolvedAt.getTime() - c.createdAt.getTime()) / 60000;
        }
        return sum;
      }, 0);
      avgRecoveryTime = Math.round(totalMinutes / recoveredCases.length);
    }

    // Breakdown by failure type
    const failureTypeGroups = await db.recoveryCase.groupBy({
      by: ["failureType"],
      where: { merchantId },
      _count: true,
      _sum: { riskAmount: true, recoveredAmount: true },
    });

    const byFailureType: FailureTypeBreakdown[] = failureTypeGroups.map((g) => ({
      failureType: g.failureType,
      count: g._count,
      riskAmount: g._sum.riskAmount || 0,
      recoveredAmount: g._sum.recoveredAmount || 0,
      recoveryRate:
        (g._sum.riskAmount || 0) > 0
          ? Math.round(((g._sum.recoveredAmount || 0) / (g._sum.riskAmount || 1)) * 1000) / 10
          : 0,
    }));

    // Breakdown by payment method
    const methodGroups = await db.recoveryCase.groupBy({
      by: ["paymentMethod"],
      where: { merchantId },
      _count: true,
      _sum: { riskAmount: true, recoveredAmount: true },
    });

    const byPaymentMethod: MethodBreakdown[] = methodGroups.map((g) => ({
      method: g.paymentMethod || "unknown",
      count: g._count,
      riskAmount: g._sum.riskAmount || 0,
      recoveredAmount: g._sum.recoveredAmount || 0,
      recoveryRate:
        (g._sum.riskAmount || 0) > 0
          ? Math.round(((g._sum.recoveredAmount || 0) / (g._sum.riskAmount || 1)) * 1000) / 10
          : 0,
    }));

    // Breakdown by action type
    const actionGroups = await db.recoveryAction.groupBy({
      by: ["actionType"],
      where: { merchantId },
      _count: true,
    });

    const actionSuccessGroups = await db.recoveryAction.groupBy({
      by: ["actionType"],
      where: { merchantId, status: "SUCCESS" },
      _count: true,
    });

    const successMap = new Map(actionSuccessGroups.map((g) => [g.actionType, g._count]));

    const byAction = actionGroups.map((g) => ({
      actionType: g.actionType,
      count: g._count,
      successCount: successMap.get(g.actionType) || 0,
      successRate:
        g._count > 0
          ? Math.round(((successMap.get(g.actionType) || 0) / g._count) * 1000) / 10
          : 0,
    }));

    return {
      revenueAtRisk,
      expectedRecovery,
      recoveredRevenue,
      recoveryRate,
      activeCases,
      totalCases: allCases,
      recoveredCases: recoveredCases.length,
      failedCases,
      escalatedCases,
      stoppedCases,
      avgRecoveryTime,
      byFailureType,
      byPaymentMethod,
      byAction,
    };
  }

  /**
   * Get payment method performance data for recovery recommendations.
   */
  static async getPaymentMethodPerformance(merchantId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const stats = await db.payment.groupBy({
      by: ["paymentMethod", "status"],
      where: {
        merchantId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: true,
      _sum: { amount: true },
    });

    const methodMap = new Map<string, {
      total: number;
      success: number;
      failed: number;
      volume: number;
      successVolume: number;
    }>();

    for (const s of stats) {
      const method = s.paymentMethod || "unknown";
      const existing = methodMap.get(method) || {
        total: 0, success: 0, failed: 0, volume: 0, successVolume: 0,
      };

      existing.total += s._count;
      existing.volume += s._sum.amount || 0;

      if (s.status === PaymentStatus.SUCCESS || s.status === PaymentStatus.CAPTURED) {
        existing.success += s._count;
        existing.successVolume += s._sum.amount || 0;
      } else if (s.status === PaymentStatus.FAILED) {
        existing.failed += s._count;
      }

      methodMap.set(method, existing);
    }

    return Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      totalTransactions: data.total,
      successfulTransactions: data.success,
      failedTransactions: data.failed,
      successRate: data.total > 0 ? Math.round((data.success / data.total) * 1000) / 10 : 0,
      volume: data.volume,
      successVolume: data.successVolume,
    }));
  }
}
