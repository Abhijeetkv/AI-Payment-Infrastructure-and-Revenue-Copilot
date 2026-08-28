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

    const result = await RecoveryService.escalateCase(
      merchant.id,
      id,
      body.reason || "Manual merchant escalation requested"
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Failed to escalate recovery case", {}, error);
    return NextResponse.json(
      { success: false, error: "Failed to escalate case" },
      { status: 500 }
    );
  }
}
