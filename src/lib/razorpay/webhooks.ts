import crypto from "crypto";
import { logger } from "@/lib/logger";

export interface ParsedWebhookEvent {
  eventId: string;
  eventType: string;
  createdAt: number;
  entityType?: string;
  paymentId?: string;
  orderId?: string;
  refundId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  payload: Record<string, unknown>;
}

/**
 * Verify Razorpay Webhook HMAC-SHA256 signature
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret?: string
): boolean {
  try {
    const webhookSecret =
      secret || process.env.RAZORPAY_WEBHOOK_SECRET || "dummy_webhook_secret";

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch (error) {
    logger.error("Failed to verify webhook signature", {}, error);
    return false;
  }
}

/**
 * Extract and parse Razorpay webhook event details
 */
export function extractWebhookEvent(
  body: Record<string, unknown>
): ParsedWebhookEvent | null {
  try {
    const eventType = String(body.event || "");
    const createdAt = Number(body.created_at || Date.now() / 1000);
    // Razorpay event IDs or fallback generated identifier
    const eventId = String(
      body.event_id || body.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    );

    const payload = (body.payload || {}) as Record<string, unknown>;
    const paymentEntity = (payload.payment as { entity?: Record<string, unknown> })?.entity;
    const orderEntity = (payload.order as { entity?: Record<string, unknown> })?.entity;
    const refundEntity = (payload.refund as { entity?: Record<string, unknown> })?.entity;

    return {
      eventId,
      eventType,
      createdAt,
      paymentId: paymentEntity?.id ? String(paymentEntity.id) : undefined,
      orderId: orderEntity?.id
        ? String(orderEntity.id)
        : paymentEntity?.order_id
        ? String(paymentEntity.order_id)
        : undefined,
      refundId: refundEntity?.id ? String(refundEntity.id) : undefined,
      amount: paymentEntity?.amount
        ? Number(paymentEntity.amount)
        : refundEntity?.amount
        ? Number(refundEntity.amount)
        : undefined,
      currency: paymentEntity?.currency ? String(paymentEntity.currency) : "INR",
      status: paymentEntity?.status ? String(paymentEntity.status) : undefined,
      payload: body,
    };
  } catch (error) {
    logger.error("Error extracting webhook event payload", {}, error);
    return null;
  }
}
