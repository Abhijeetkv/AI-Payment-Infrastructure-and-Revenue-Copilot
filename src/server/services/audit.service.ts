import { db } from "@/lib/db";
import { type Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

type PrismaTransactionClient = Prisma.TransactionClient;

export interface CreateAuditLogParams {
  merchantId: string;
  entityType: "payment" | "order" | "refund" | "transaction" | "webhook";
  entityId: string;
  action: string;
  changes?: Record<string, unknown>;
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Create an audit log record
   */
  static async createAuditLog(
    params: CreateAuditLogParams,
    txClient?: PrismaTransactionClient
  ) {
    const client = txClient || db;
    try {
      const log = await client.auditLog.create({
        data: {
          merchantId: params.merchantId,
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          changes: params.changes ? JSON.stringify(params.changes) : undefined,
          performedBy: params.performedBy || "system",
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
      return log;
    } catch (error) {
      logger.warn("Failed to create audit log entry", { entityId: params.entityId }, error);
      return null;
    }
  }

  /**
   * Fetch audit logs for a specific entity
   */
  static async getEntityAuditLogs(
    merchantId: string,
    entityType: string,
    entityId: string
  ) {
    return await db.auditLog.findMany({
      where: {
        merchantId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * List recent audit logs for merchant
   */
  static async listAuditLogs(
    merchantId: string,
    query: {
      page?: number;
      limit?: number;
      entityType?: string;
    }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      merchantId,
      ...(query.entityType && { entityType: query.entityType }),
    };

    const [total, logs] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
