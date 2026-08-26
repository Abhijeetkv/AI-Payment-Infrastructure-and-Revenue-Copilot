import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processWebhook } from "@/inngest/webhook-processing";
import { processPayment } from "@/inngest/payment-processing";
import { resolvePendingPayment } from "@/inngest/payment-resolution";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processWebhook,
    processPayment,
    resolvePendingPayment,
  ],
});
