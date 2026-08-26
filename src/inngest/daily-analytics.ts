import { inngest } from "./client";
import { db } from "@/lib/db";
import { AnalyticsService } from "@/server/services/analytics.service";
import { logger } from "@/lib/logger";

interface StepTools {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
}

export const computeDailyMetricsCron = inngest.createFunction(
  {
    id: "compute-daily-metrics-cron",
    retries: 3,
    triggers: [
      { cron: "0 0 * * *" }, // Midnight UTC daily
      { event: "analytics/daily" },
    ],
  },
  async ({
    step,
  }: {
    event: { data: { merchantId?: string; date?: string } };
    step: StepTools;
  }) => {
    // Step 1: Find target merchants
    const merchants = await step.run("fetch-merchants", async () => {
      return await db.merchant.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });
    });

    const targetDate = new Date();
    // Default to yesterday's full day calculation
    targetDate.setUTCDate(targetDate.getUTCDate() - 1);

    // Step 2: Compute rollups per merchant
    const results = await step.run("compute-rollups", async () => {
      const rollupSummaries = [];

      for (const m of merchants) {
        try {
          const record = await AnalyticsService.computeAndSaveDailyRollup(
            m.id,
            targetDate
          );
          rollupSummaries.push({
            merchantId: m.id,
            success: true,
            grossRevenue: record.grossRevenue,
            netRevenue: record.netRevenue,
          });
        } catch (err: unknown) {
          logger.error("Failed to compute daily metric for merchant", { merchantId: m.id }, err);
          rollupSummaries.push({
            merchantId: m.id,
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      return rollupSummaries;
    });

    return {
      status: "completed",
      date: targetDate.toISOString().split("T")[0],
      merchantsCount: merchants.length,
      results,
    };
  }
);
