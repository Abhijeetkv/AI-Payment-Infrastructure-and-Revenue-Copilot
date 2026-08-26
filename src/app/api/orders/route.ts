import { NextRequest, NextResponse } from "next/server";
import { OrderService } from "@/server/services/order.service";
import { MerchantService } from "@/server/services/merchant.service";
import { createOrderSchema, paginationSchema } from "@/server/validators";
import { AppError } from "@/server/errors";
import { OrderStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createOrderSchema.parse(body);

    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const order = await OrderService.createOrder(merchant.id, validatedData);

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
          message: error instanceof Error ? error.message : "Failed to create order",
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
    const result = await OrderService.listOrders(merchant.id, {
      ...pagination,
      status: rawStatus as OrderStatus | undefined,
    });

    return NextResponse.json({
      success: true,
      data: result.orders,
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
          message: error instanceof Error ? error.message : "Failed to list orders",
        },
      },
      { status: 500 }
    );
  }
}
