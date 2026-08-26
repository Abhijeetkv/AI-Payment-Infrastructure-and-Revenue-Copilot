import { db } from "@/lib/db";
import { AnomalySeverity, type Prisma } from "@prisma/client";
import { AuditService } from "@/server/services/audit.service";
import { inngest } from "@/inngest/client";
import { NotFoundError } from "@/server/errors";
import { logger } from "@/lib/logger";

export interface AnomalyScanResult {
  merchantId: string;
  scannedAt: Date;
  anomaliesDetected: number;
  newAnomalies: Array<{
    id: string;
    type: string;
    severity: AnomalySeverity;
    metric: string;
    currentValue: number;
    baselineValue: number;
    deviation: number;
    description: string;
  }>;
}

export interface ListAnomaliesQuery {
  page?: number;
  limit?: number;
  severity?: AnomalySeverity;
  isResolved?: boolean;
  type?: string;
}

export class AnomalyService {
  /**
   * Evaluates telemetry against 7-day rolling statistical baselines (mean & std dev z-score)
   * and creates Anomaly records if statistically significant deviations occur.
   */
  static async runAnomalyScan(merchantId: string): Promise<AnomalyScanResult> {
    const now = new Date();
    const currentWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    const baselineWindowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    // 1. Fetch current 24h metrics
    const [currentPaymentsTotal, currentPaymentsFailed, currentPaymentsSuccess, currentCreditSum, currentDebitSum] =
      await Promise.all([
        db.payment.count({
          where: { merchantId, createdAt: { gte: currentWindowStart, lte: now } },
        }),
        db.payment.count({
          where: { merchantId, status: "FAILED", createdAt: { gte: currentWindowStart, lte: now } },
        }),
        db.payment.count({
          where: {
            merchantId,
            status: { in: ["SUCCESS", "CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"] },
            createdAt: { gte: currentWindowStart, lte: now },
          },
        }),
        db.transaction.aggregate({
          where: {
            merchantId,
            type: "PAYMENT",
            direction: "CREDIT",
            status: "COMPLETED",
            createdAt: { gte: currentWindowStart, lte: now },
          },
          _sum: { amount: true },
        }),
        db.transaction.aggregate({
          where: {
            merchantId,
            type: "REFUND",
            direction: "DEBIT",
            status: "COMPLETED",
            createdAt: { gte: currentWindowStart, lte: now },
          },
          _sum: { amount: true },
        }),
      ]);

    const currentFailureRate =
      currentPaymentsTotal > 0 ? (currentPaymentsFailed / currentPaymentsTotal) * 100 : 0;
    const currentGrossRevenue = currentCreditSum._sum.amount || 0;
    const currentRefundVolume = currentDebitSum._sum.amount || 0;
    const currentRefundRate =
      currentPaymentsSuccess > 0 ? (currentRefundVolume / Math.max(1, currentGrossRevenue)) * 100 : 0;

    // 2. Fetch daily rollup history for baseline calculation
    const dailyMetrics = await db.dailyMetric.findMany({
      where: {
        merchantId,
        date: { gte: baselineWindowStart, lt: currentWindowStart },
      },
      orderBy: { date: "asc" },
    });

    // Helper to calculate mean and standard deviation
    const calcStats = (values: number[]) => {
      if (values.length === 0) return { mean: 0, stdDev: 0 };
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      return { mean, stdDev };
    };

    // Calculate 7-day baselines
    const baselineFailureStats = calcStats(
      dailyMetrics.length > 0
        ? dailyMetrics.map((d) => d.failureRate)
        : [5.0, 4.2, 6.1, 4.8, 5.5, 3.9, 5.2] // Default baseline if cold start
    );

    const baselineRevenueStats = calcStats(
      dailyMetrics.length > 0
        ? dailyMetrics.map((d) => d.grossRevenue)
        : [100000, 120000, 110000, 105000, 130000, 115000, 125000]
    );

    const baselineRefundStats = calcStats(
      dailyMetrics.length > 0
        ? dailyMetrics.map((d) => d.refundRate)
        : [2.0, 1.8, 2.2, 1.9, 2.5, 2.1, 1.7]
    );

    const detectedAnomalies: Array<{
      type: string;
      severity: AnomalySeverity;
      metric: string;
      currentValue: number;
      baselineValue: number;
      deviation: number;
      description: string;
    }> = [];

    // Helper to compute z-score and check threshold
    const evaluateMetric = (
      type: string,
      metricName: string,
      currentVal: number,
      stats: { mean: number; stdDev: number },
      isDrop: boolean = false
    ) => {
      const mean = stats.mean || 1;
      const stdDev = stats.stdDev || mean * 0.15; // fallback standard deviation if 0
      const diff = currentVal - mean;
      const zScore = Math.abs(diff) / Math.max(0.001, stdDev);
      const percentageDeviation = Number((((currentVal - mean) / mean) * 100).toFixed(1));

      let severity: AnomalySeverity | null = null;

      if (isDrop) {
        // Drop metric (e.g. Revenue Drop)
        if (percentageDeviation <= -60 || zScore >= 3.5) severity = AnomalySeverity.CRITICAL;
        else if (percentageDeviation <= -40 || zScore >= 2.5) severity = AnomalySeverity.HIGH;
        else if (percentageDeviation <= -25 || zScore >= 1.8) severity = AnomalySeverity.MEDIUM;
        else if (percentageDeviation <= -15 || zScore >= 1.4) severity = AnomalySeverity.LOW;
      } else {
        // Spike metric (e.g. Failure Spike, Refund Spike)
        if (currentVal >= 50 || zScore >= 3.5 || percentageDeviation >= 200) severity = AnomalySeverity.CRITICAL;
        else if (currentVal >= 25 || zScore >= 2.5 || percentageDeviation >= 100) severity = AnomalySeverity.HIGH;
        else if (currentVal >= 15 || zScore >= 1.8 || percentageDeviation >= 50) severity = AnomalySeverity.MEDIUM;
        else if (currentVal >= 8 || zScore >= 1.4 || percentageDeviation >= 25) severity = AnomalySeverity.LOW;
      }

      if (severity) {
        let desc = "";
        if (type === "failure_spike") {
          desc = `Payment failure rate spiked to ${currentVal.toFixed(1)}% (${percentageDeviation > 0 ? "+" : ""}${percentageDeviation}% vs 7-day baseline of ${mean.toFixed(1)}%). Potential bank network degradation or gateway timeout.`;
        } else if (type === "revenue_drop") {
          desc = `Gross revenue dropped to ${Math.round(currentVal / 100)} (${percentageDeviation}% vs expected baseline of ${Math.round(mean / 100)}). Immediate investigation recommended.`;
        } else if (type === "refund_spike") {
          desc = `Refund rate surged to ${currentVal.toFixed(1)}% (${percentageDeviation > 0 ? "+" : ""}${percentageDeviation}% vs 7-day baseline of ${mean.toFixed(1)}%). Possible product defect or recurring dissatisfaction.`;
        }

        detectedAnomalies.push({
          type,
          severity,
          metric: metricName,
          currentValue: Number(currentVal.toFixed(2)),
          baselineValue: Number(mean.toFixed(2)),
          deviation: percentageDeviation,
          description: desc,
        });
      }
    };

    // Evaluate Failure Rate Spike if sufficient sample exists
    if (currentPaymentsTotal >= 3) {
      evaluateMetric("failure_spike", "failure_rate", currentFailureRate, baselineFailureStats, false);
    }

    // Evaluate Revenue Drop
    if (dailyMetrics.length >= 2) {
      evaluateMetric("revenue_drop", "revenue", currentGrossRevenue, baselineRevenueStats, true);
    }

    // Evaluate Refund Surge
    if (currentPaymentsSuccess >= 2 && currentRefundVolume > 0) {
      evaluateMetric("refund_spike", "refund_rate", currentRefundRate, baselineRefundStats, false);
    }

    // 3. Persist new anomalies while avoiding duplicate open alerts within 6 hours
    const createdAnomalies = [];
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    for (const anomaly of detectedAnomalies) {
      const existingOpen = await db.anomaly.findFirst({
        where: {
          merchantId,
          type: anomaly.type,
          isResolved: false,
          detectedAt: { gte: sixHoursAgo },
        },
      });

      if (!existingOpen) {
        const record = await db.anomaly.create({
          data: {
            merchantId,
            type: anomaly.type,
            severity: anomaly.severity,
            metric: anomaly.metric,
            currentValue: anomaly.currentValue,
            baselineValue: anomaly.baselineValue,
            deviation: anomaly.deviation,
            description: anomaly.description,
            detectedAt: now,
          },
        });

        createdAnomalies.push(record);

        // Audit Log
        await AuditService.createAuditLog({
          merchantId,
          entityType: "anomaly",
          entityId: record.id,
          action: "anomaly_detected",
          changes: {
            type: record.type,
            severity: record.severity,
            deviation: record.deviation,
          },
          performedBy: "anomaly_engine",
        });

        // Trigger Inngest notification if HIGH or CRITICAL
        if (record.severity === AnomalySeverity.CRITICAL || record.severity === AnomalySeverity.HIGH) {
          try {
            await inngest.send({
              name: "anomaly/detected",
              data: {
                anomalyId: record.id,
                merchantId,
              },
            });
          } catch (err) {
            logger.warn("Failed to dispatch Inngest anomaly alert", { anomalyId: record.id }, err);
          }
        }
      }
    }

    logger.info("Anomaly detection scan completed", {
      merchantId,
      scannedAt: now.toISOString(),
      detectedCount: createdAnomalies.length,
    });

    return {
      merchantId,
      scannedAt: now,
      anomaliesDetected: createdAnomalies.length,
      newAnomalies: createdAnomalies,
    };
  }

  /**
   * Marks an anomaly as resolved with optional resolution notes and audit entry
   */
  static async resolveAnomaly(
    merchantId: string,
    anomalyId: string,
    resolutionNotes?: string,
    performedBy: string = "system"
  ) {
    const anomaly = await db.anomaly.findFirst({
      where: {
        id: anomalyId,
        merchantId,
      },
    });

    if (!anomaly) {
      throw new NotFoundError(`Anomaly ${anomalyId} not found`);
    }

    const updated = await db.anomaly.update({
      where: { id: anomalyId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });

    // Record resolution in audit log
    await AuditService.createAuditLog({
      merchantId,
      entityType: "anomaly",
      entityId: anomalyId,
      action: "anomaly_resolved",
      changes: {
        previousState: "active",
        resolvedAt: updated.resolvedAt,
        notes: resolutionNotes || "Resolved by operator",
      },
      performedBy,
    });

    logger.info("Anomaly marked as resolved", { anomalyId, merchantId, performedBy });

    return updated;
  }

  /**
   * List anomalies with filtering and pagination
   */
  static async listAnomalies(merchantId: string, query: ListAnomaliesQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AnomalyWhereInput = {
      merchantId,
      ...(query.severity && { severity: query.severity }),
      ...(query.isResolved !== undefined && { isResolved: query.isResolved }),
      ...(query.type && { type: query.type }),
    };

    const [total, anomalies] = await Promise.all([
      db.anomaly.count({ where }),
      db.anomaly.findMany({
        where,
        skip,
        take: limit,
        orderBy: { detectedAt: "desc" },
      }),
    ]);

    return {
      anomalies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Compute aggregated health summary and incident totals for the dashboard
   */
  static async getAnomalySummary(merchantId: string) {
    const [activeCount, criticalCount, highCount, resolvedCount, totalCount] =
      await Promise.all([
        db.anomaly.count({ where: { merchantId, isResolved: false } }),
        db.anomaly.count({
          where: { merchantId, isResolved: false, severity: AnomalySeverity.CRITICAL },
        }),
        db.anomaly.count({
          where: { merchantId, isResolved: false, severity: AnomalySeverity.HIGH },
        }),
        db.anomaly.count({ where: { merchantId, isResolved: true } }),
        db.anomaly.count({ where: { merchantId } }),
      ]);

    // Health Score calculation (100 base, deductions for active issues)
    let healthScore = 100;
    healthScore -= criticalCount * 25;
    healthScore -= highCount * 12;
    healthScore -= (activeCount - criticalCount - highCount) * 5;
    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      healthScore,
      activeCount,
      criticalCount,
      highCount,
      resolvedCount,
      totalCount,
      status:
        healthScore >= 90
          ? "HEALTHY"
          : healthScore >= 70
          ? "DEGRADED"
          : "CRITICAL_ATTENTION",
    };
  }
}
