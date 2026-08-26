import { NextRequest, NextResponse } from "next/server";
import { RefundService } from "@/server/services/refund.service";
import { MerchantService } from "@/server/services/merchant.service";
import { AppError } from "@/server/errors";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const refund = await RefundService.getRefund(merchant.id, id);

    return NextResponse.json({
      success: true,
      data: refund,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to fetch refund details",
        },
      },
      { status: 500 }
    );
  }
}
