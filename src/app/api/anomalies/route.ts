import { NextRequest, NextResponse } from "next/server";
import { AnomalyService } from "@/server/services/anomaly.service";
import { MerchantService } from "@/server/services/merchant.service";
import { paginationSchema } from "@/server/validators";
import { AppError } from "@/server/errors";
import { AnomalySeverity } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const severity = searchParams.get("severity") as AnomalySeverity | undefined;
    const isResolvedParam = searchParams.get("isResolved");
    const isResolved =
      isResolvedParam === "true" ? true : isResolvedParam === "false" ? false : undefined;
    const type = searchParams.get("type") || undefined;
    const includeSummary = searchParams.get("summary") === "true";

    const pagination = paginationSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    });

    const merchant = await MerchantService.getOrCreateDefaultMerchant();

    const [listResult, summary] = await Promise.all([
      AnomalyService.listAnomalies(merchant.id, {
        page: pagination.page,
        limit: pagination.limit,
        severity,
        isResolved,
        type,
      }),
      includeSummary ? AnomalyService.getAnomalySummary(merchant.id) : null,
    ]);

    return NextResponse.json({
      success: true,
      data: listResult.anomalies,
      pagination: listResult.pagination,
      ...(summary && { summary }),
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
          message: error instanceof Error ? error.message : "Failed to fetch anomalies",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const scanResult = await AnomalyService.runAnomalyScan(merchant.id);

    return NextResponse.json({
      success: true,
      data: scanResult,
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
          message: error instanceof Error ? error.message : "Failed to execute anomaly scan",
        },
      },
      { status: 500 }
    );
  }
}
