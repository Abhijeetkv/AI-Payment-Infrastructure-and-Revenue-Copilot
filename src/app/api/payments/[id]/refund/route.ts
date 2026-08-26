import { NextRequest, NextResponse } from "next/server";
import { RefundService } from "@/server/services/refund.service";
import { MerchantService } from "@/server/services/merchant.service";
import { AppError } from "@/server/errors";
import { z } from "zod";

const directRefundSchema = z.object({
  amount: z.number().int().positive().optional(),
  reason: z.string().optional(),
  speed: z.enum(["normal", "optimum"]).default("normal"),
  notes: z.record(z.string(), z.string()).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const validated = directRefundSchema.parse(body);

    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const result = await RefundService.createRefund(merchant.id, {
      paymentId,
      amount: validated.amount,
      reason: validated.reason || "Merchant dashboard direct refund",
      speed: validated.speed,
      notes: validated.notes,
      performedBy: "dashboard_user",
    });

    return NextResponse.json({
      success: true,
      data: {
        refund: result.refund,
        transaction: result.transaction,
        paymentStatus: result.payment.status,
        remainingBalance: result.remainingBalance,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: error.issues[0]?.message || "Invalid input parameters",
          },
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to execute refund",
        },
      },
      { status: 500 }
    );
  }
}
