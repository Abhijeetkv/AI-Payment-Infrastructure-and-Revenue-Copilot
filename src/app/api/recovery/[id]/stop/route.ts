import { NextRequest, NextResponse } from "next/server";
import { MerchantService } from "@/server/services/merchant.service";
import { RecoveryService } from "@/server/services/recovery.service";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const body = await request.json().catch(() => ({}));

    const result = await RecoveryService.stopCase(
      merchant.id,
      id,
      body.stopReason || "MERCHANT_TERMINATED"
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Failed to stop recovery case", {}, error);
    return NextResponse.json(
      { success: false, error: "Failed to stop case" },
      { status: 500 }
    );
  }
}
