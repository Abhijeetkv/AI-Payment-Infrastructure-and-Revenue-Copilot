import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/server/services/analytics.service";
import { MerchantService } from "@/server/services/merchant.service";
import { AppError } from "@/server/errors";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const startStr = searchParams.get("startDate");
    const endStr = searchParams.get("endDate");
    const granularity = (searchParams.get("granularity") as "day" | "week" | "month") || "day";

    const now = new Date();
    const endDate = endStr ? new Date(endStr) : now;
    const startDate = startStr
      ? new Date(startStr)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const timeseries = await AnalyticsService.getTimeseriesData(merchant.id, {
      startDate,
      endDate,
      granularity,
    });

    return NextResponse.json({
      success: true,
      data: timeseries,
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
          message: error instanceof Error ? error.message : "Failed to fetch analytics timeseries",
        },
      },
      { status: 500 }
    );
  }
}
