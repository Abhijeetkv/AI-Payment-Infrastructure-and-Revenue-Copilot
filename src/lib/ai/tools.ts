import { db } from "@/lib/db";
import { AnalyticsService } from "@/server/services/analytics.service";
import { PaymentService } from "@/server/services/payment.service";
import { RefundService } from "@/server/services/refund.service";
import { AnomalyService } from "@/server/services/anomaly.service";
import { RevenueRiskService } from "@/server/services/revenue-risk.service";
import { RecoveryPolicyService } from "@/server/services/recovery-policy.service";
import { LedgerService } from "@/lib/transactions/ledger";
import { formatCurrency } from "@/lib/utils";
import { PaymentStatus } from "@prisma/client";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const COPILOT_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "getRevenueMetrics",
    description: "Fetches Gross Revenue, Net Revenue, Refund Volume, Success Rate %, and Average Transaction Value for a given timeframe (e.g. last 7 days, 30 days).",
    parameters: {
      type: "object",
      properties: {
        days: { type: "number", description: "Number of past days to query (e.g., 7, 30, 90). Default is 30." },
      },
    },
  },
  {
    name: "getPaymentDetails",
    description: "Fetches full details of a specific payment by payment ID or Razorpay Payment ID, including status, ledger entries, and live refundable balance.",
    parameters: {
      type: "object",
      properties: {
        paymentId: { type: "string", description: "Internal payment ID or Razorpay payment ID (e.g., pay_...)" },
      },
      required: ["paymentId"],
    },
  },
  {
    name: "getRecentAnomalies",
    description: "Retrieves active or recent statistical anomalies, failure rate spikes, revenue drops, and z-score deviations.",
    parameters: {
      type: "object",
      properties: {
        isResolved: { type: "boolean", description: "Filter by resolution status (false for active only)" },
        limit: { type: "number", description: "Maximum number of anomalies to return (default 5)" },
      },
    },
  },
  {
    name: "getRefundHistory",
    description: "Retrieves recent refunds, total refund volume, and partial vs full refund counts.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of recent refunds to return (default 10)" },
      },
    },
  },
  {
    name: "getMethodBreakdown",
    description: "Retrieves market share, volume, and success rate breakdown across payment methods (UPI, Card, Netbanking, Wallet).",
    parameters: {
      type: "object",
      properties: {
        days: { type: "number", description: "Number of past days to query. Default is 30." },
      },
    },
  },
  // ─── Recovery-Specific Tools ───────────────────
  {
    name: "getRevenueAtRisk",
    description: "Calculates total revenue at risk from failed payments, with breakdowns by failure type and payment method.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "getCustomerPaymentHistory",
    description: "Retrieves payment history for a specific order or customer, showing past success/failure patterns.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Order ID to look up customer payment history for" },
      },
      required: ["orderId"],
    },
  },
  {
    name: "getFailureHistory",
    description: "Retrieves recent payment failures with patterns, failure reasons, and frequency analysis.",
    parameters: {
      type: "object",
      properties: {
        days: { type: "number", description: "Number of past days to analyze. Default is 7." },
        limit: { type: "number", description: "Maximum failures to return. Default is 20." },
      },
    },
  },
  {
    name: "getPaymentMethodPerformance",
    description: "Retrieves detailed success rate, volume, and performance data for each payment method over the last 30 days.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "getRecoveryPolicy",
    description: "Returns the current recovery policy configuration including max attempts, amount limits, and probability thresholds.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "getRecoveryMetrics",
    description: "Retrieves comprehensive recovery metrics: revenue at risk, recovered revenue, recovery rate, active cases, and breakdowns.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
];

/**
 * Executes a tool called by the AI model against the real PostgreSQL database
 */
export async function executeCopilotTool(
  merchantId: string,
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  switch (toolName) {
    case "getRevenueMetrics": {
      const days = typeof args.days === "number" ? args.days : 30;
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const metrics = await AnalyticsService.getOverviewMetrics(merchantId, {
        startDate,
        endDate: now,
      });

      return {
        timeframe: `Past ${days} days`,
        grossRevenue: formatCurrency(metrics.grossRevenue),
        grossRevenuePaise: metrics.grossRevenue,
        netRevenue: formatCurrency(metrics.netRevenue),
        netRevenuePaise: metrics.netRevenue,
        refundAmount: formatCurrency(metrics.refundAmount),
        refundAmountPaise: metrics.refundAmount,
        totalTransactions: metrics.totalTransactions,
        successfulPayments: metrics.successfulPayments,
        failedPayments: metrics.failedPayments,
        successRate: `${metrics.successRate}%`,
        refundRate: `${metrics.refundRate}%`,
        avgTransactionValue: formatCurrency(metrics.avgTransactionValue),
        growthComparison: metrics.comparison,
      };
    }

    case "getPaymentDetails": {
      const rawId = String(args.paymentId || "").trim();
      let paymentRecord = await db.payment.findFirst({
        where: {
          merchantId,
          OR: [
            { id: rawId },
            { razorpayPaymentId: rawId },
            { razorpayOrderId: rawId },
          ],
        },
      });

      if (!paymentRecord) {
        // Fallback: check most recent payment
        paymentRecord = await db.payment.findFirst({
          where: { merchantId },
          orderBy: { createdAt: "desc" },
        });
      }

      if (!paymentRecord) {
        return { error: `Payment not found with ID ${rawId}` };
      }

      const payment = await PaymentService.getPayment(merchantId, paymentRecord.id);
      const ledger = await LedgerService.getRefundableAmount(payment.id);

      return {
        id: payment.id,
        razorpayPaymentId: payment.razorpayPaymentId,
        amount: formatCurrency(payment.amount, payment.currency),
        amountPaise: payment.amount,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        failureReason: payment.failureReason,
        refundableBalance: formatCurrency(ledger.refundableBalance, payment.currency),
        refundableBalancePaise: ledger.refundableBalance,
        totalRefunded: formatCurrency(ledger.totalRefunded, payment.currency),
        transactionsCount: payment.transactions.length,
        createdAt: payment.createdAt.toISOString(),
        orderReceipt: payment.order?.receipt,
      };
    }

    case "getRecentAnomalies": {
      const isResolved = typeof args.isResolved === "boolean" ? args.isResolved : undefined;
      const limit = typeof args.limit === "number" ? args.limit : 5;

      const [listResult, summary] = await Promise.all([
        AnomalyService.listAnomalies(merchantId, { isResolved, limit }),
        AnomalyService.getAnomalySummary(merchantId),
      ]);

      return {
        systemHealthScore: `${summary.healthScore}/100`,
        systemStatus: summary.status,
        activeAnomaliesCount: summary.activeCount,
        criticalCount: summary.criticalCount,
        anomalies: listResult.anomalies.map((a) => ({
          id: a.id,
          type: a.type,
          severity: a.severity,
          metric: a.metric,
          deviation: `${a.deviation > 0 ? "+" : ""}${a.deviation}%`,
          currentValue: a.currentValue,
          baselineValue: a.baselineValue,
          description: a.description,
          isResolved: a.isResolved,
          detectedAt: a.detectedAt.toISOString(),
        })),
      };
    }

    case "getRefundHistory": {
      const limit = typeof args.limit === "number" ? args.limit : 10;
      const [listResult, metrics] = await Promise.all([
        RefundService.listRefunds(merchantId, { limit }),
        RefundService.getRefundMetrics(merchantId),
      ]);

      return {
        totalRefundVolume: formatCurrency(metrics.totalRefundVolume),
        totalRefundsCount: metrics.totalRefunds,
        processedRefunds: metrics.processedRefunds,
        partialRefundsCount: metrics.partialRefundsCount,
        fullRefundsCount: metrics.fullRefundsCount,
        recentRefunds: listResult.refunds.map((r) => ({
          id: r.id,
          razorpayRefundId: r.razorpayRefundId,
          amount: formatCurrency(r.amount, r.currency),
          status: r.status,
          reason: r.reason,
          paymentId: r.paymentId,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    }

    case "getMethodBreakdown": {
      const days = typeof args.days === "number" ? args.days : 30;
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const items = await AnalyticsService.getMethodBreakdown(merchantId, {
        startDate,
        endDate: now,
      });

      return {
        timeframe: `Past ${days} days`,
        breakdown: items.map((i) => ({
          method: i.method,
          volume: formatCurrency(i.volume),
          transactionCount: i.count,
          marketShare: `${i.percentageShare}%`,
          successRate: `${i.successRate}%`,
        })),
      };
    }

    // ─── Recovery-Specific Tools ───────────────────

    case "getRevenueAtRisk": {
      const riskData = await RevenueRiskService.getRevenueAtRisk(merchantId);
      return {
        totalAtRisk: formatCurrency(riskData.totalAtRisk),
        totalAtRiskPaise: riskData.totalAtRisk,
        eligiblePayments: riskData.eligiblePayments,
        byFailureType: riskData.byFailureType.map((f) => ({
          type: f.failureType,
          count: f.count,
          amount: formatCurrency(f.riskAmount),
        })),
        byPaymentMethod: riskData.byPaymentMethod.map((m) => ({
          method: m.method,
          count: m.count,
          amount: formatCurrency(m.riskAmount),
        })),
      };
    }

    case "getCustomerPaymentHistory": {
      const orderId = String(args.orderId || "").trim();
      const payments = await db.payment.findMany({
        where: { merchantId, orderId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      return {
        orderId,
        totalAttempts: payments.length,
        successful: payments.filter((p) => p.status === PaymentStatus.SUCCESS).length,
        failed: payments.filter((p) => p.status === PaymentStatus.FAILED).length,
        payments: payments.map((p) => ({
          id: p.id,
          status: p.status,
          method: p.paymentMethod,
          amount: formatCurrency(p.amount),
          createdAt: p.createdAt.toISOString(),
          failureReason: p.failureReason,
        })),
      };
    }

    case "getFailureHistory": {
      const days = typeof args.days === "number" ? args.days : 7;
      const limit = typeof args.limit === "number" ? args.limit : 20;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const failures = await db.payment.findMany({
        where: {
          merchantId,
          status: PaymentStatus.FAILED,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          failureReason: true,
          createdAt: true,
        },
      });

      // Count by failure reason
      const reasonMap = new Map<string, number>();
      for (const f of failures) {
        const reason = f.failureReason || "Unknown";
        reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
      }

      return {
        timeframe: `Past ${days} days`,
        totalFailures: failures.length,
        totalAmountAtRisk: formatCurrency(failures.reduce((s, f) => s + f.amount, 0)),
        byReason: Array.from(reasonMap.entries()).map(([reason, count]) => ({
          reason,
          count,
        })),
        recentFailures: failures.slice(0, 10).map((f) => ({
          id: f.id,
          amount: formatCurrency(f.amount),
          method: f.paymentMethod,
          reason: f.failureReason,
          at: f.createdAt.toISOString(),
        })),
      };
    }

    case "getPaymentMethodPerformance": {
      const performance = await RevenueRiskService.getPaymentMethodPerformance(merchantId);
      return {
        methods: performance.map((p) => ({
          method: p.method,
          totalTransactions: p.totalTransactions,
          successfulTransactions: p.successfulTransactions,
          failedTransactions: p.failedTransactions,
          successRate: `${p.successRate}%`,
          volume: formatCurrency(p.volume),
        })),
      };
    }

    case "getRecoveryPolicy": {
      const policy = RecoveryPolicyService.getPolicy();
      return {
        maxAttempts: policy.maxAttempts,
        maxRecoveryAmount: formatCurrency(policy.maxRecoveryAmountPaise),
        minRecoveryProbability: `${(policy.minRecoveryProbability * 100).toFixed(0)}%`,
        retryDelayMinutes: policy.retryDelayMinutes,
        expirationHours: policy.expirationHours,
        allowedActions: policy.allowedActions,
      };
    }

    case "getRecoveryMetrics": {
      const metrics = await RevenueRiskService.getRecoveryMetrics(merchantId);
      return {
        revenueAtRisk: formatCurrency(metrics.revenueAtRisk),
        revenueAtRiskPaise: metrics.revenueAtRisk,
        expectedRecovery: formatCurrency(metrics.expectedRecovery),
        recoveredRevenue: formatCurrency(metrics.recoveredRevenue),
        recoveredRevenuePaise: metrics.recoveredRevenue,
        recoveryRate: `${metrics.recoveryRate}%`,
        activeCases: metrics.activeCases,
        totalCases: metrics.totalCases,
        recoveredCases: metrics.recoveredCases,
        failedCases: metrics.failedCases,
        escalatedCases: metrics.escalatedCases,
        stoppedCases: metrics.stoppedCases,
        avgRecoveryTimeMinutes: metrics.avgRecoveryTime,
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
