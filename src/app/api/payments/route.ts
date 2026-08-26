import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/server/services/payment.service";
import { MerchantService } from "@/server/services/merchant.service";
import { createPaymentSchema, paginationSchema } from "@/server/validators";
import { AppError } from "@/server/errors";
import { PaymentStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createPaymentSchema.parse(body);

    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const result = await PaymentService.verifyAndRecordPayment(
      merchant.id,
      validatedData
    );

    return NextResponse.json({
      success: true,
      data: result.payment,
      order: result.order,
      alreadyProcessed: result.alreadyProcessed,
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
          message: error instanceof Error ? error.message : "Payment verification failed",
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const rawStatus = searchParams.get("status");
    const pagination = paginationSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      search: searchParams.get("search") || undefined,
      status: rawStatus || undefined,
    });

    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const result = await PaymentService.listPayments(
      merchant.id,
      {
        ...pagination,
        status: rawStatus as PaymentStatus | undefined,
      }
    );

    return NextResponse.json({
      success: true,
      data: result.payments,
      pagination: result.pagination,
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
          message: error instanceof Error ? error.message : "Failed to list payments",
        },
      },
      { status: 500 }
    );
  }
}
