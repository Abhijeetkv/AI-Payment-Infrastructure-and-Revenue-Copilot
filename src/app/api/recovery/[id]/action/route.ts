import { NextRequest, NextResponse } from "next/server";
import { MerchantService } from "@/server/services/merchant.service";
import { RecoveryService } from "@/server/services/recovery.service";
import { RecoveryActionType } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const body = await request.json();

    const actionType = body.actionType as RecoveryActionType;

    if (!actionType || !Object.values(RecoveryActionType).includes(actionType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Valid actionType required (${Object.values(RecoveryActionType).join(", ")})`,
        },
        { status: 400 }
      );
    }

    const result = await RecoveryService.executeRecoveryAction(
      merchant.id,
      id,
      actionType
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
