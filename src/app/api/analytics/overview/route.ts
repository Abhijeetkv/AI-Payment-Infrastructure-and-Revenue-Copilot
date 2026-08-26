import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/server/services/analytics.service";
import { MerchantService } from "@/server/services/merchant.service";
import { AppError } from "@/server/errors";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const startStr = searchParams.get("startDate");
    const endStr = searchParams.get("endDate");

    const startDate = startStr ? new Date(startStr) : undefined;
    const endDate = endStr ? new Date(endStr) : undefined;

    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const overview = await AnalyticsService.getOverviewMetrics(merchant.id, {
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: overview,
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
          message: error instanceof Error ? error.message : "Failed to fetch analytics overview",
        },
      },
      { status: 500 }
    );
  }
}
