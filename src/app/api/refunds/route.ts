import { NextRequest, NextResponse } from "next/server";
import { RefundService } from "@/server/services/refund.service";
import { MerchantService } from "@/server/services/merchant.service";
import { createRefundSchema, paginationSchema } from "@/server/validators";
import { AppError } from "@/server/errors";
import { RefundStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createRefundSchema.parse(body);

    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const result = await RefundService.createRefund(merchant.id, {
      paymentId: validatedData.paymentId,
      amount: validatedData.amount,
      reason: validatedData.reason,
      notes: validatedData.notes as Record<string, string> | undefined,
      performedBy: "merchant_api",
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
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to process refund",
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const includeMetrics = searchParams.get("metrics") === "true";
    const paymentId = searchParams.get("paymentId") || undefined;
    const rawStatus = searchParams.get("status");

    const pagination = paginationSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      search: searchParams.get("search") || undefined,
      status: rawStatus || undefined,
    });

    const merchant = await MerchantService.getOrCreateDefaultMerchant();

    const [listResult, metrics] = await Promise.all([
      RefundService.listRefunds(merchant.id, {
        ...pagination,
        status: rawStatus as RefundStatus | undefined,
        paymentId,
      }),
      includeMetrics ? RefundService.getRefundMetrics(merchant.id) : null,
    ]);

    return NextResponse.json({
      success: true,
      data: listResult.refunds,
      pagination: listResult.pagination,
      ...(metrics && { metrics }),
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
          message: error instanceof Error ? error.message : "Failed to list refunds",
        },
      },
      { status: 500 }
    );
  }
}
