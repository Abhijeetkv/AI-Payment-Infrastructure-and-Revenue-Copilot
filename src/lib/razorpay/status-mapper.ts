import { OrderStatus, PaymentStatus } from "@prisma/client";

/**
 * Maps Razorpay Order status string to internal Prisma OrderStatus enum
 */
export function mapRazorpayOrderStatus(status: string): OrderStatus {
  switch (status.toLowerCase()) {
    case "created":
      return OrderStatus.CREATED;
    case "attempted":
      return OrderStatus.ATTEMPTED;
    case "paid":
      return OrderStatus.PAID;
    default:
      return OrderStatus.CREATED;
  }
}

/**
 * Maps Razorpay Payment status string to internal Prisma PaymentStatus enum
 */
export function mapRazorpayPaymentStatus(status: string): PaymentStatus {
  switch (status.toLowerCase()) {
    case "created":
      return PaymentStatus.CREATED;
    case "authorized":
      return PaymentStatus.AUTHORIZED;
    case "captured":
      return PaymentStatus.CAPTURED;
    case "failed":
      return PaymentStatus.FAILED;
    case "refunded":
      return PaymentStatus.REFUNDED;
    default:
      return PaymentStatus.PROCESSING;
  }
}
