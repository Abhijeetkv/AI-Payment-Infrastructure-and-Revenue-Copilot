import { NextRequest, NextResponse } from "next/server";
import { AnomalyService } from "@/server/services/anomaly.service";
import { MerchantService } from "@/server/services/merchant.service";
import { AppError } from "@/server/errors";
import { z } from "zod";

const resolveSchema = z.object({
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: anomalyId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const validated = resolveSchema.parse(body);

    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const updated = await AnomalyService.resolveAnomaly(
      merchant.id,
      anomalyId,
      validated.notes,
      "merchant_dashboard"
    );

    return NextResponse.json({
      success: true,
      data: updated,
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
          message: error instanceof Error ? error.message : "Failed to resolve anomaly",
        },
      },
      { status: 500 }
    );
  }
}
