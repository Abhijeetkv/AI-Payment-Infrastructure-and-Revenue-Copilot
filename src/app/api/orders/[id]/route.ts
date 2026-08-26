import { NextRequest, NextResponse } from "next/server";
import { OrderService } from "@/server/services/order.service";
import { MerchantService } from "@/server/services/merchant.service";
import { AppError } from "@/server/errors";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const order = await OrderService.getOrder(merchant.id, params.id);

    return NextResponse.json({
      success: true,
      data: order,
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
          message: error instanceof Error ? error.message : "Failed to fetch order",
        },
      },
      { status: 500 }
    );
  }
}
