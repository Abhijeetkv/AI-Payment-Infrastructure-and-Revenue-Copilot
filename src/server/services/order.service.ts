import { db } from "@/lib/db";
import { createRazorpayOrder } from "@/lib/razorpay/orders";
import { NotFoundError } from "@/server/errors";
import { logger } from "@/lib/logger";
import { OrderStatus, type Prisma } from "@prisma/client";

export interface CreateOrderDTO {
  amount: number; // in paise
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface ListOrdersQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  search?: string;
}

export class OrderService {
  /**
   * Create an order in Razorpay and persist to DB
   */
  static async createOrder(merchantId: string, dto: CreateOrderDTO) {
    const currency = dto.currency || "INR";
    const receipt = dto.receipt || `rcpt_${Date.now()}`;

    // 1. Create order on Razorpay
    const rzpOrder = await createRazorpayOrder({
      amount: dto.amount,
      currency,
      receipt,
      notes: dto.notes,
    });

    // 2. Persist in database
    const order = await db.order.create({
      data: {
        merchantId,
        amount: dto.amount,
        currency,
        status: OrderStatus.CREATED,
        razorpayOrderId: rzpOrder.id,
        receipt,
        notes: dto.notes ? JSON.stringify(dto.notes) : undefined,
      },
      include: {
        payments: true,
      },
    });

    // 3. Create Audit Log
    try {
      await db.auditLog.create({
        data: {
          merchantId,
          entityType: "order",
          entityId: order.id,
          action: "created",
          changes: {
            amount: dto.amount,
            currency,
            razorpayOrderId: rzpOrder.id,
          },
          performedBy: "merchant",
        },
      });
    } catch (err) {
      logger.warn("Failed to create audit log for order creation", { orderId: order.id }, err);
    }

    logger.info("Order created and persisted", {
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      merchantId,
    });

    return order;
  }

  /**
   * Fetch single order by ID
   */
  static async getOrder(merchantId: string, orderId: string) {
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        merchantId,
      },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      throw new NotFoundError(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  /**
   * List orders with pagination & filters
   */
  static async listOrders(merchantId: string, query: ListOrdersQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      merchantId,
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { id: { contains: query.search, mode: "insensitive" } },
          { razorpayOrderId: { contains: query.search, mode: "insensitive" } },
          { receipt: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    const [total, orders] = await Promise.all([
      db.order.count({ where }),
      db.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          payments: true,
        },
      }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
