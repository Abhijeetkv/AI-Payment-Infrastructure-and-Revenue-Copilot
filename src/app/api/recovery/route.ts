import { NextRequest, NextResponse } from "next/server";
import { MerchantService } from "@/server/services/merchant.service";
import { RecoveryService } from "@/server/services/recovery.service";
import { RecoveryCaseStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status") as RecoveryCaseStatus | undefined;
    const failureType = searchParams.get("failureType") || undefined;
    const search = searchParams.get("search") || undefined;
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

    const result = await RecoveryService.listRecoveryCases(merchant.id, {
      page,
      limit,
      status: status && Object.values(RecoveryCaseStatus).includes(status) ? status : undefined,
      failureType,
      search,
      sortOrder,
    });

    return NextResponse.json({
      success: true,
      data: result.cases,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error("Failed to list recovery cases", {}, error);
    return NextResponse.json(
      { success: false, error: "Failed to list recovery cases" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const body = await request.json();

    const {
      paymentId,
      orderId,
      customerId,
      riskAmount,
      failureType = "payment_failure",
      failureReason,
      paymentMethod,
    } = body;

    if (!paymentId || !orderId || !riskAmount) {
      return NextResponse.json(
        { success: false, error: "paymentId, orderId, and riskAmount are required" },
        { status: 400 }
      );
    }

    const recoveryCase = await RecoveryService.createRecoveryCase({
      merchantId: merchant.id,
      paymentId,
      orderId,
      customerId,
      riskAmount: Number(riskAmount),
      failureType,
      failureReason,
      paymentMethod,
    });

    return NextResponse.json({
      success: true,
      data: recoveryCase,
    });
  } catch (error) {
    logger.error("Failed to create recovery case", {}, error);
    return NextResponse.json(
      { success: false, error: "Failed to create recovery case" },
      { status: 500 }
    );
  }
}
