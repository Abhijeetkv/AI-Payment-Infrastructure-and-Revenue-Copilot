import { NextResponse } from "next/server";
import { SeedService } from "@/server/services/seed.service";
import { MerchantService } from "@/server/services/merchant.service";
import { AppError } from "@/server/errors";

export async function GET() {
  try {
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const stats = await SeedService.getTelemetryStats(merchant.id);

    return NextResponse.json({
      success: true,
      data: stats,
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
          message: error instanceof Error ? error.message : "Failed to fetch telemetry stats",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const result = await SeedService.seedRealisticMerchantData(merchant.id);

    return NextResponse.json({
      success: true,
      data: result,
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
          message: error instanceof Error ? error.message : "Failed to generate seed telemetry",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const result = await SeedService.clearMerchantTelemetry(merchant.id);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to clear telemetry",
        },
      },
      { status: 500 }
    );
  }
}
