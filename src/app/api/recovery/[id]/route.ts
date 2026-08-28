import { NextRequest, NextResponse } from "next/server";
import { MerchantService } from "@/server/services/merchant.service";
import { RecoveryService } from "@/server/services/recovery.service";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const merchant = await MerchantService.getOrCreateDefaultMerchant();

    const recoveryCase = await RecoveryService.getRecoveryCase(merchant.id, id);

    return NextResponse.json({
      success: true,
      data: recoveryCase,
    });
  } catch (error) {
    logger.error("Failed to fetch recovery case", {}, error);
    return NextResponse.json(
      { success: false, error: "Recovery case not found" },
      { status: 404 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const body = await request.json();

    const existing = await db.recoveryCase.findFirst({
      where: { id, merchantId: merchant.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Recovery case not found" },
        { status: 404 }
      );
    }

    const updated = await db.recoveryCase.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.recommendedAction && { recommendedAction: body.recommendedAction }),
        ...(body.selectedAction && { selectedAction: body.selectedAction }),
        ...(body.escalationReason && { escalationReason: body.escalationReason }),
        ...(body.stopReason && { stopReason: body.stopReason }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error("Failed to update recovery case", {}, error);
    return NextResponse.json(
      { success: false, error: "Failed to update recovery case" },
      { status: 500 }
    );
  }
}
