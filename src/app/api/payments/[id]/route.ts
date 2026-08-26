import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/server/services/payment.service";
import { MerchantService } from "@/server/services/merchant.service";
import { AppError } from "@/server/errors";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const payment = await PaymentService.getPayment(merchant.id, params.id);

    return NextResponse.json({
      success: true,
      data: payment,
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
          message: error instanceof Error ? error.message : "Failed to fetch payment",
        },
      },
      { status: 500 }
    );
  }
}
