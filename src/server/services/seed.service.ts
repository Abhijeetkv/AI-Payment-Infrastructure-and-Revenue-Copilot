import { db } from "@/lib/db";
import {
  PaymentStatus,
  OrderStatus,
  TransactionType,
  TransactionDirection,
  TransactionStatus,
  RefundStatus,
  AnomalySeverity,
} from "@prisma/client";
import { AnalyticsService } from "./analytics.service";
import { logger } from "@/lib/logger";

const PAYMENT_METHODS = [
  { method: "upi", weight: 60, samples: ["user@okhdfcbank", "paytm@icici", "merchant@upi", "user@axl"] },
  { method: "card", weight: 25, samples: ["HDFC Visa 4012", "ICICI Mastercard 5105", "SBI RuPay 6070"] },
  { method: "netbanking", weight: 10, samples: ["HDFC Netbanking", "SBI Online", "ICICI Bank"] },
  { method: "wallet", weight: 5, samples: ["Paytm Wallet", "PhonePe Wallet", "Amazon Pay"] },
];

const AMOUNTS_PAISE = [
  49900, 79900, 99900, 149900, 199900, 249900, 299900, 399900, 499900, 699900, 999900, 1499900
];

function getRandomMethod() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const m of PAYMENT_METHODS) {
    cumulative += m.weight;
    if (rand <= cumulative) return m;
  }
  return PAYMENT_METHODS[0];
}

export class SeedService {
  /**
   * Generates 90 days of realistic orders, payments, refunds, ledger records, daily rollups, and anomalies
   */
  static async seedRealisticMerchantData(merchantId: string) {
    const now = new Date();
    const daysToSeed = 90;

    logger.info("Starting high-volume realistic seed data generation", { merchantId, daysToSeed });

    let totalOrders = 0;
    let totalPayments = 0;
    let totalRefunds = 0;
    let totalLedgerTx = 0;

    // Seed continuous history across 90 days
    for (let dayOffset = daysToSeed; dayOffset >= 0; dayOffset--) {
      const dayDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      // Vary transaction count per day (2 to 5 transactions per day, with occasional surges)
      const txPerDay = (dayOffset >= 4 && dayOffset <= 6) ? 8 : (dayOffset % 7 === 0 || dayOffset % 7 === 6) ? 5 : 3;

      for (let i = 0; i < txPerDay; i++) {
        const txTime = new Date(dayDate.getTime() + (i * 3 + Math.floor(Math.random() * 2)) * 60 * 60 * 1000 + Math.floor(Math.random() * 59) * 60 * 1000);
        const amount = AMOUNTS_PAISE[Math.floor(Math.random() * AMOUNTS_PAISE.length)];
        const methodObj = getRandomMethod();
        const method = methodObj.method;
        const receipt = `rcpt_${dayOffset}_${i}_${Math.floor(Math.random() * 1000)}`;

        // Determine status based on realistic failure & refund distributions
        // Injected failure surge 5 days ago (dayOffset 5)
        const isAnomalyDay = dayOffset >= 4 && dayOffset <= 6;
        const failureRoll = Math.random();
        let status: PaymentStatus = PaymentStatus.SUCCESS;

        if (isAnomalyDay && method === "upi" && failureRoll < 0.45) {
          status = PaymentStatus.FAILED;
        } else if (failureRoll < 0.08) {
          status = PaymentStatus.FAILED;
        } else if (failureRoll > 0.96) {
          status = PaymentStatus.REFUNDED;
        } else if (failureRoll > 0.93) {
          status = PaymentStatus.PARTIALLY_REFUNDED;
        }

        // 1. Create Order
        const order = await db.order.create({
          data: {
            merchantId,
            razorpayOrderId: `order_seed_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            receipt,
            amount,
            currency: "INR",
            status: status === PaymentStatus.FAILED ? OrderStatus.FAILED : OrderStatus.PAID,
            notes: { customer: `Customer ${receipt}`, seeded: true },
            createdAt: txTime,
            updatedAt: txTime,
          },
        });
        totalOrders++;

        // 2. Create Payment
        const razorpayPaymentId = `pay_seed_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        const payment = await db.payment.create({
          data: {
            merchantId,
            orderId: order.id,
            razorpayPaymentId,
            razorpayOrderId: order.razorpayOrderId,
            amount,
            currency: "INR",
            status,
            paymentMethod: method,
            createdAt: txTime,
            updatedAt: txTime,
          },
        });
        totalPayments++;

        // 3. Create Double-Entry Ledger CREDIT (for captured payments)
        if (status !== PaymentStatus.FAILED) {
          await db.transaction.create({
            data: {
              merchantId,
              paymentId: payment.id,
              orderId: order.id,
              type: TransactionType.PAYMENT,
              direction: TransactionDirection.CREDIT,
              amount,
              currency: "INR",
              status: TransactionStatus.COMPLETED,
              referenceId: razorpayPaymentId,
              description: `Payment captured via ${method.toUpperCase()} (${receipt})`,
              createdAt: txTime,
            },
          });
          totalLedgerTx++;

          // 4. Create Refund & DEBIT transaction if status is PARTIALLY_REFUNDED or REFUNDED
          if (status === PaymentStatus.PARTIALLY_REFUNDED || status === PaymentStatus.REFUNDED) {
            const refundAmount = status === PaymentStatus.REFUNDED ? amount : Math.floor(amount * 0.5);
            const refundTime = new Date(txTime.getTime() + 2 * 60 * 60 * 1000);
            const rzpRefundId = `rfnd_seed_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

            const refund = await db.refund.create({
              data: {
                merchantId,
                paymentId: payment.id,
                razorpayRefundId: rzpRefundId,
                amount: refundAmount,
                currency: "INR",
                status: RefundStatus.PROCESSED,
                reason: "Customer return request",
                createdAt: refundTime,
                updatedAt: refundTime,
              },
            });
            totalRefunds++;

            await db.transaction.create({
              data: {
                merchantId,
                paymentId: payment.id,
                orderId: order.id,
                type: TransactionType.REFUND,
                direction: TransactionDirection.DEBIT,
                amount: refundAmount,
                currency: "INR",
                status: TransactionStatus.COMPLETED,
                referenceId: refund.id,
                description: `Refund debited (${status === PaymentStatus.REFUNDED ? "Full" : "Partial 50%"})`,
                createdAt: refundTime,
              },
            });
            totalLedgerTx++;
          }
        }
      }

      // Compute and persist daily rollup snapshot for this date
      try {
        await AnalyticsService.computeAndSaveDailyRollup(merchantId, dayDate);
      } catch (err) {
        logger.warn("Failed to compute historical rollup for day", { dayDate: dayDate.toISOString() }, err);
      }
    }

    // Inject a realistic historical anomaly for the surge 5 days ago
    const anomalyDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    await db.anomaly.create({
      data: {
        merchantId,
        type: "failure_spike",
        severity: AnomalySeverity.HIGH,
        metric: "failure_rate",
        currentValue: 38.5,
        baselineValue: 5.2,
        deviation: 640.4,
        description: "Payment failure rate spiked to 38.5% on UPI routes due to upstream HDFC Bank gateway degradation. Mitigated after 3 hours.",
        isResolved: true,
        resolvedAt: new Date(anomalyDate.getTime() + 4 * 60 * 60 * 1000),
        detectedAt: anomalyDate,
      },
    });

    logger.info("High-volume realistic seed data generated successfully", {
      totalOrders,
      totalPayments,
      totalRefunds,
      totalLedgerTx,
    });

    return {
      success: true,
      totalOrders,
      totalPayments,
      totalRefunds,
      totalLedgerTx,
      daysSeeded: daysToSeed,
    };
  }

  /**
   * Resets all demo telemetry for the merchant
   */
  static async clearMerchantTelemetry(merchantId: string) {
    logger.info("Clearing merchant demo telemetry", { merchantId });

    await db.dailyMetric.deleteMany({ where: { merchantId } });
    await db.anomaly.deleteMany({ where: { merchantId } });
    await db.refund.deleteMany({ where: { merchantId } });
    await db.transaction.deleteMany({ where: { merchantId } });
    await db.paymentEvent.deleteMany({ where: { merchantId } });
    await db.payment.deleteMany({ where: { merchantId } });
    await db.order.deleteMany({ where: { merchantId } });
    await db.auditLog.deleteMany({ where: { merchantId } });

    return { success: true };
  }

  /**
   * Fetch live counts of telemetry records in the database
   */
  static async getTelemetryStats(merchantId: string) {
    const [orders, payments, transactions, refunds, anomalies, dailyMetrics] =
      await Promise.all([
        db.order.count({ where: { merchantId } }),
        db.payment.count({ where: { merchantId } }),
        db.transaction.count({ where: { merchantId } }),
        db.refund.count({ where: { merchantId } }),
        db.anomaly.count({ where: { merchantId } }),
        db.dailyMetric.count({ where: { merchantId } }),
      ]);

    return {
      orders,
      payments,
      transactions,
      refunds,
      anomalies,
      dailyMetrics,
    };
  }
}
