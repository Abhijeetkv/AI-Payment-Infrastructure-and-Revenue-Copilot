export type ErrorCode =
  | "INTERNAL_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "VALIDATION_ERROR"
  | "PAYMENT_STATE_ERROR"
  | "DUPLICATE_ERROR"
  | "RAZORPAY_ERROR"
  | "WEBHOOK_ERROR"
  | "NOT_FOUND_ERROR"
  | "RATE_LIMIT_ERROR";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown> | unknown[];

  constructor(
    message: string,
    code: ErrorCode = "INTERNAL_ERROR",
    statusCode: number = 500,
    details?: Record<string, unknown> | unknown[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }

  public toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required", details?: Record<string, unknown>) {
    super(message, "AUTHENTICATION_ERROR", 401, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Permission denied", details?: Record<string, unknown>) {
    super(message, "AUTHORIZATION_ERROR", 403, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed", details?: Record<string, unknown> | unknown[]) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class PaymentStateError extends AppError {
  constructor(message: string = "Invalid payment state transition", details?: Record<string, unknown>) {
    super(message, "PAYMENT_STATE_ERROR", 422, details);
  }
}

export class DuplicateError extends AppError {
  constructor(message: string = "Duplicate record or operation detected", details?: Record<string, unknown>) {
    super(message, "DUPLICATE_ERROR", 409, details);
  }
}

export class RazorpayError extends AppError {
  constructor(message: string = "Razorpay API error", details?: Record<string, unknown>) {
    super(message, "RAZORPAY_ERROR", 502, details);
  }
}

export class WebhookError extends AppError {
  constructor(message: string = "Webhook processing error", details?: Record<string, unknown>) {
    super(message, "WEBHOOK_ERROR", 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", details?: Record<string, unknown>) {
    super(message, "NOT_FOUND_ERROR", 404, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests. Please try again later.", details?: Record<string, unknown>) {
    super(message, "RATE_LIMIT_ERROR", 429, details);
  }
}
