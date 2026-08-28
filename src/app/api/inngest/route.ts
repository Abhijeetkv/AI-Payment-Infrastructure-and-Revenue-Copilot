import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processWebhook } from "@/inngest/webhook-processing";
import { processPayment } from "@/inngest/payment-processing";
import { resolvePendingPayment } from "@/inngest/payment-resolution";
import { processRefund } from "@/inngest/refund-processing";
import { computeDailyMetricsCron } from "@/inngest/daily-analytics";
import { detectAnomaliesCron } from "@/inngest/anomaly-detection";
import {
  processRecoveryCase,
  processBatchRecovery,
  expireStaleRecoveryCasesCron,
} from "@/inngest/recovery";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processWebhook,
    processPayment,
    resolvePendingPayment,
    processRefund,
    computeDailyMetricsCron,
    detectAnomaliesCron,
    processRecoveryCase,
    processBatchRecovery,
    expireStaleRecoveryCasesCron,
  ],
});
