import { z } from "zod";

export const createOrderSchema = z.object({
  amount: z
    .number()
    .int("Amount must be an integer in paise")
    .positive("Amount must be greater than zero"),
  currency: z.string().default("INR"),
  receipt: z.string().optional(),
  notes: z.record(z.string(), z.any()).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const createPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  razorpayPaymentId: z.string().min(1, "Razorpay Payment ID is required"),
  razorpayOrderId: z.string().min(1, "Razorpay Order ID is required"),
  razorpaySignature: z.string().min(1, "Razorpay Signature is required"),
  amount: z.number().int().positive(),
  currency: z.string().default("INR"),
  paymentMethod: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const createRefundSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  amount: z
    .number()
    .int("Refund amount must be an integer in paise")
    .positive("Refund amount must be greater than zero"),
  reason: z.string().optional(),
  notes: z.record(z.string(), z.any()).optional(),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.enum(["day", "week", "month"]).default("day"),
});

export type DateRangeInput = z.infer<typeof dateRangeSchema>;

export const copilotMessageSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1, "Message cannot be empty"),
});

export type CopilotMessageInput = z.infer<typeof copilotMessageSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  merchantName: z.string().min(2, "Merchant/Business name is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
