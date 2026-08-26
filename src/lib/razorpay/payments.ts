import crypto from "crypto";
import { razorpay } from "./client";
import { RazorpayError } from "@/server/errors";
import { logger } from "@/lib/logger";
import type { Payments } from "razorpay/dist/types/payments";

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "dummy_secret";
    const body = `${orderId}|${paymentId}`;

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body.toString())
      .digest("hex");

    return expectedSignature === signature;
  } catch (error) {
    logger.error("Error verifying payment signature", { orderId, paymentId }, error);
    return false;
  }
}

export async function fetchRazorpayPayment(
  paymentId: string
): Promise<Payments.RazorpayPayment> {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error: unknown) {
    logger.error("Failed to fetch Razorpay payment", { paymentId }, error);
    throw new RazorpayError("Failed to fetch payment details from Razorpay", {
      paymentId,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function captureRazorpayPayment(
  paymentId: string,
  amount: number,
  currency: string = "INR"
): Promise<Payments.RazorpayPayment> {
  try {
    const payment = await razorpay.payments.capture(paymentId, amount, currency);
    logger.info("Razorpay payment captured", { paymentId, amount, currency });
    return payment;
  } catch (error: unknown) {
    logger.error("Failed to capture Razorpay payment", { paymentId, amount }, error);
    throw new RazorpayError("Failed to capture payment on Razorpay", {
      paymentId,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}
