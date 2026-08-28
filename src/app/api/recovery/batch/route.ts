import { NextRequest, NextResponse } from "next/server";
import { MerchantService } from "@/server/services/merchant.service";
import { RecoveryService } from "@/server/services/recovery.service";
import { inngest } from "@/inngest/client";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const body = await request.json().catch(() => ({}));

    const hours = Number(body.hours || 24);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // 1. Detect and create cases
    const detectionResult = await RecoveryService.detectAndCreateCases(merchant.id, {
      since,
      limit: 100,
    });

    // 2. Dispatch batch Inngest trigger
    const batchId = `batch_${Date.now()}`;
    try {
      await inngest.send({
        name: "recovery/batch.started",
        data: {
          merchantId: merchant.id,
          batchId,
        },
      });
    } catch (inngestErr) {
      logger.warn("Failed to dispatch batch Inngest event", {}, inngestErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        batchId,
        timeframeHours: hours,
        ...detectionResult,
      },
    });
  } catch (error) {
    logger.error("Failed to trigger batch recovery", {}, error);
    return NextResponse.json(
      { success: false, error: "Failed to trigger batch recovery" },
      { status: 500 }
    );
  }
}
