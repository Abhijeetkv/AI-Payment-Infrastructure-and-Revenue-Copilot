export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  merchantId?: string;
  paymentId?: string;
  orderId?: string;
  refundId?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error | unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context && Object.keys(context).length > 0) {
      entry.context = context;
    }

    if (error) {
      if (error instanceof Error) {
        entry.error = {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
          code: (error as { code?: string }).code,
        };
      } else {
        entry.error = {
          name: "UnknownError",
          message: String(error),
        };
      }
    }

    const output = JSON.stringify(entry);

    switch (level) {
      case "debug":
        if (process.env.NODE_ENV === "development") {
          console.debug(output);
        }
        break;
      case "info":
        console.info(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
    }
  }

  public debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  public info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  public warn(message: string, context?: LogContext, error?: unknown) {
    this.log("warn", message, context, error);
  }

  public error(message: string, context?: LogContext, error?: unknown) {
    this.log("error", message, context, error);
  }
}

export const logger = new Logger();
export default logger;
