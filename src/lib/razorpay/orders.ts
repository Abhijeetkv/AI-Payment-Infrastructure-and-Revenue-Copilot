import { razorpay } from "./client";
import { RazorpayError } from "@/server/errors";
import { logger } from "@/lib/logger";
import type { Orders } from "razorpay/dist/types/orders";

export interface CreateOrderParams {
  amount: number; // in paise
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export async function createRazorpayOrder(
  params: CreateOrderParams
): Promise<Orders.RazorpayOrder> {
  try {
    const options = {
      amount: params.amount,
      currency: params.currency || "INR",
      receipt: params.receipt || `rcpt_${Date.now()}`,
      notes: params.notes || {},
    };

    const order = await razorpay.orders.create(options);
    logger.info("Razorpay order created successfully", {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });

    return order;
  } catch (error: unknown) {
    logger.error("Failed to create Razorpay order", {}, error);
    throw new RazorpayError("Failed to create order on Razorpay", {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function fetchRazorpayOrder(
  orderId: string
): Promise<Orders.RazorpayOrder> {
  try {
    const order = await razorpay.orders.fetch(orderId);
    return order;
  } catch (error: unknown) {
    logger.error("Failed to fetch Razorpay order", { orderId }, error);
    throw new RazorpayError("Failed to fetch order from Razorpay", {
      orderId,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}
