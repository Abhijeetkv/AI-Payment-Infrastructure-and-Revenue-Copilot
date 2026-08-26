import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/server/services/analytics.service";
import { MerchantService } from "@/server/services/merchant.service";
import { AppError } from "@/server/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetDate = body.date ? new Date(body.date) : new Date();

    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const rollup = await AnalyticsService.computeAndSaveDailyRollup(
      merchant.id,
      targetDate
    );

    return NextResponse.json({
      success: true,
      data: rollup,
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
          message: error instanceof Error ? error.message : "Failed to execute daily rollup",
        },
      },
      { status: 500 }
    );
  }
}
