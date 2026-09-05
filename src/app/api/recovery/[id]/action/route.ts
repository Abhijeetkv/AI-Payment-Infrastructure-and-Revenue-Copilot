import { NextRequest, NextResponse } from "next/server";
import { MerchantService } from "@/server/services/merchant.service";
import { RecoveryService } from "@/server/services/recovery.service";
import { RecoveryActionRequestSchema } from "@/lib/recovery/validation";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const rawBody = await request.json().catch(() => ({}));

    const parsed = RecoveryActionRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { actionType, isMerchantApproved } = parsed.data;

    const result = await RecoveryService.executeRecoveryAction(
      merchant.id,
      id,
      actionType,
      isMerchantApproved
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Failed to execute recovery action", {}, error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Action failed" },
      { status: 500 }
    );
  }
}
