import { inngest } from "./client";
import { db } from "@/lib/db";
import { AnomalyService } from "@/server/services/anomaly.service";
import { logger } from "@/lib/logger";

interface StepTools {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
}

export const detectAnomaliesCron = inngest.createFunction(
  {
    id: "detect-anomalies-worker",
    retries: 2,
    triggers: [
      { cron: "*/30 * * * *" }, // Every 30 minutes
      { event: "anomaly/detected" },
    ],
  },
  async ({
    step,
  }: {
    step: StepTools;
  }) => {
    // Step 1: Fetch active merchants
    const merchants = await step.run("fetch-active-merchants", async () => {
      return await db.merchant.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });
    });

    // Step 2: Run Statistical Anomaly Scans per merchant
    const scanResults = await step.run("execute-statistical-scans", async () => {
      const summary = [];

      for (const m of merchants) {
        try {
          const result = await AnomalyService.runAnomalyScan(m.id);
          summary.push({
            merchantId: m.id,
            anomaliesDetected: result.anomaliesDetected,
            success: true,
          });
        } catch (err: unknown) {
          logger.error("Failed to run anomaly scan for merchant", { merchantId: m.id }, err);
          summary.push({
            merchantId: m.id,
            anomaliesDetected: 0,
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      return summary;
    });

    return {
      status: "completed",
      scannedMerchants: merchants.length,
      scanResults,
    };
  }
);
