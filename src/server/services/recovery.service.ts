import { db } from "@/lib/db";
import { PaymentStatus, RecoveryCaseStatus, RecoveryActionType, RecoveryStopReason, type Prisma } from "@prisma/client";
import { AuditService } from "@/server/services/audit.service";
import { RevenueRiskService } from "@/server/services/revenue-risk.service";
import { RecoveryPolicyService } from "@/server/services/recovery-policy.service";
import { inngest } from "@/inngest/client";
import { NotFoundError } from "@/server/errors";
import { logger } from "@/lib/logger";
import type {
  RecoveryCaseCreateInput,
  ListRecoveryCasesQuery,
} from "@/lib/recovery/types";

export class RecoveryService {
  /**
   * Create a recovery case from a failed payment
   */
  static async createRecoveryCase(input: RecoveryCaseCreateInput) {
    const {
      merchantId,
      paymentId,
      orderId,
      customerId,
      riskAmount,
      failureType,
      failureReason,
      paymentMethod,
      isSimulated = false,
    } = input;

    // Check if a recovery case already exists for this payment (that isn't terminal)
    const existing = await db.recoveryCase.findFirst({
      where: {
        paymentId,
        status: {
          notIn: [
            RecoveryCaseStatus.FAILED,
            RecoveryCaseStatus.EXPIRED,
            RecoveryCaseStatus.STOPPED,
          ],
        },
      },
    });

    if (existing) {
      logger.info("Recovery case already exists for payment", {
        paymentId,
        existingCaseId: existing.id,
      });
      return existing;
    }

    // Calculate recovery probability
    const { probability, expectedRecoveryAmount, factors } =
      await RevenueRiskService.calculateRecoveryProbability(merchantId, paymentId);

    const recoveryCase = await db.recoveryCase.create({
      data: {
        merchantId,
        paymentId,
        orderId,
        customerId,
        riskAmount,
        failureType,
        failureReason,
        paymentMethod,
        recoveryProbability: probability,
        expectedRecoveryAmount,
        isSimulated,
        aiReasoningFactors: factors,
      },
    });

    // Create initial timeline entry
    await db.recoveryTimeline.create({
      data: {
        recoveryCaseId: recoveryCase.id,
        event: "case_created",
        description: `Revenue at risk detected: ₹${(riskAmount / 100).toLocaleString("en-IN")} from ${failureType.replace(/_/g, " ")}`,
        actor: "system",
        metadata: { riskAmount, failureType, probability, factors },
      },
    });

    // Create audit log
    await AuditService.createAuditLog({
      merchantId,
      entityType: "recovery_case",
      entityId: recoveryCase.id,
      action: "recovery_case_created",
      changes: {
        riskAmount,
        failureType,
        probability,
        expectedRecoveryAmount,
        paymentId,
      },
    });

    // Dispatch Inngest event for async processing
    try {
      await inngest.send({
        name: "recovery/case.created",
        data: {
          recoveryCaseId: recoveryCase.id,
          merchantId,
        },
      });
    } catch (err) {
      logger.warn("Failed to dispatch recovery Inngest event", {
        recoveryCaseId: recoveryCase.id,
      }, err);
    }

    logger.info("Recovery case created", {
      recoveryCaseId: recoveryCase.id,
      paymentId,
      riskAmount,
      probability,
    });

    return recoveryCase;
  }

  /**
   * Get a recovery case with full details including timeline, actions, payment, and order
   */
  static async getRecoveryCase(merchantId: string, caseId: string) {
    const recoveryCase = await db.recoveryCase.findFirst({
      where: { id: caseId, merchantId },
      include: {
        actions: { orderBy: { createdAt: "asc" } },
        timeline: { orderBy: { createdAt: "asc" } },
        payment: true,
        order: true,
      },
    });

    if (!recoveryCase) {
      throw new NotFoundError(`Recovery case ${caseId} not found`);
    }

    return recoveryCase;
  }

  /**
   * List recovery cases with pagination and filters
   */
  static async listRecoveryCases(merchantId: string, query: ListRecoveryCasesQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.RecoveryCaseWhereInput = {
      merchantId,
      ...(query.status && { status: query.status }),
      ...(query.failureType && { failureType: query.failureType }),
      ...(query.search && {
        OR: [
          { id: { contains: query.search, mode: "insensitive" } },
          { paymentId: { contains: query.search, mode: "insensitive" } },
          { failureReason: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    const [total, cases] = await Promise.all([
      db.recoveryCase.count({ where }),
      db.recoveryCase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder === "asc" ? "asc" : "desc" },
        include: {
          payment: {
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              paymentMethod: true,
              razorpayPaymentId: true,
              failureReason: true,
            },
          },
          actions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    return {
      cases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update the recommended action for a recovery case (set by AI agent)
   */
  static async setRecommendedAction(
    caseId: string,
    action: RecoveryActionType,
    reasoningFactors: string[],
  ) {
    const recoveryCase = await db.recoveryCase.update({
      where: { id: caseId },
      data: {
        recommendedAction: action,
        status: RecoveryCaseStatus.ACTION_PENDING,
        aiReasoningFactors: reasoningFactors,
      },
    });

    await db.recoveryTimeline.create({
      data: {
        recoveryCaseId: caseId,
        event: "ai_recommendation",
        description: `AI recommended: ${action.replace(/_/g, " ").toLowerCase()}`,
        actor: "ai_agent",
        metadata: { action, factors: reasoningFactors },
      },
    });

    return recoveryCase;
  }

  /**
   * Execute a recovery action after policy validation
   */
  static async executeRecoveryAction(
    merchantId: string,
    caseId: string,
    actionType: RecoveryActionType,
  ) {
    const recoveryCase = await db.recoveryCase.findFirst({
      where: { id: caseId, merchantId },
      include: { payment: true, order: true },
    });

    if (!recoveryCase) {
      throw new NotFoundError(`Recovery case ${caseId} not found`);
    }

    // Validate policy
    const policyResult = await RecoveryPolicyService.validateAction(
      recoveryCase,
      actionType,
    );

    // Record policy check in timeline
    await db.recoveryTimeline.create({
      data: {
        recoveryCaseId: caseId,
        event: "policy_validated",
        description: policyResult.allowed
          ? "All policy checks passed"
          : `Policy blocked: ${policyResult.reasons.join(", ")}`,
        actor: "policy_engine",
        metadata: policyResult as unknown as Prisma.InputJsonValue,
      },
    });

    // Store policy results on case
    await db.recoveryCase.update({
      where: { id: caseId },
      data: { policyCheckResults: policyResult as unknown as Prisma.InputJsonValue },
    });

    if (!policyResult.allowed) {
      // If blocked, stop the case
      await this.stopCase(merchantId, caseId, "POLICY_BLOCKED");
      return { allowed: false, policyResult };
    }

    // Create action record
    const action = await db.recoveryAction.create({
      data: {
        recoveryCaseId: caseId,
        merchantId,
        actionType,
        attemptNumber: recoveryCase.attemptCount + 1,
        status: "EXECUTING",
        executedAt: new Date(),
      },
    });

    // Update case
    await db.recoveryCase.update({
      where: { id: caseId },
      data: {
        selectedAction: actionType,
        status: RecoveryCaseStatus.EXECUTING,
        attemptCount: recoveryCase.attemptCount + 1,
      },
    });

    await db.recoveryTimeline.create({
      data: {
        recoveryCaseId: caseId,
        event: "action_executed",
        description: `Recovery action executed: ${actionType.replace(/_/g, " ").toLowerCase()} (attempt ${recoveryCase.attemptCount + 1})`,
        actor: "system",
        metadata: { actionType, attemptNumber: recoveryCase.attemptCount + 1 },
      },
    });

    // Dispatch to Inngest for async execution
    try {
      await inngest.send({
        name: "recovery/action.executed",
        data: {
          recoveryCaseId: caseId,
          actionId: action.id,
          merchantId,
        },
      });
    } catch (err) {
      logger.warn("Failed to dispatch recovery action Inngest event", {
        recoveryCaseId: caseId,
      }, err);
    }

    await AuditService.createAuditLog({
      merchantId,
      entityType: "recovery_case",
      entityId: caseId,
      action: "recovery_action_executed",
      changes: { actionType, attemptNumber: recoveryCase.attemptCount + 1, actionId: action.id },
    });

    return { allowed: true, action, policyResult };
  }

  /**
   * Mark a recovery case as successfully recovered
   */
  static async markRecovered(caseId: string, recoveredAmount: number) {
    const recoveryCase = await db.recoveryCase.update({
      where: { id: caseId },
      data: {
        status: RecoveryCaseStatus.RECOVERED,
        recoveredAmount,
        resolvedAt: new Date(),
      },
    });

    await db.recoveryTimeline.create({
      data: {
        recoveryCaseId: caseId,
        event: "recovery_completed",
        description: `₹${(recoveredAmount / 100).toLocaleString("en-IN")} successfully recovered`,
        actor: "system",
        metadata: { recoveredAmount },
      },
    });

    await AuditService.createAuditLog({
      merchantId: recoveryCase.merchantId,
      entityType: "recovery_case",
      entityId: caseId,
      action: "recovery_completed",
      changes: { recoveredAmount, status: "RECOVERED" },
    });

    return recoveryCase;
  }

  /**
   * Escalate a recovery case to merchant
   */
  static async escalateCase(merchantId: string, caseId: string, reason?: string) {
    const recoveryCase = await db.recoveryCase.findFirst({
      where: { id: caseId, merchantId },
    });

    if (!recoveryCase) {
      throw new NotFoundError(`Recovery case ${caseId} not found`);
    }

    const updated = await db.recoveryCase.update({
      where: { id: caseId },
      data: {
        status: RecoveryCaseStatus.ESCALATED,
        escalationReason: reason || "Automated recovery not possible",
        resolvedAt: new Date(),
      },
    });

    await db.recoveryTimeline.create({
      data: {
        recoveryCaseId: caseId,
        event: "case_escalated",
        description: `Escalated to merchant: ${reason || "Automated recovery not possible"}`,
        actor: "system",
        metadata: { reason },
      },
    });

    await AuditService.createAuditLog({
      merchantId,
      entityType: "recovery_case",
      entityId: caseId,
      action: "recovery_escalated",
      changes: { reason, status: "ESCALATED" },
    });

    return updated;
  }

  /**
   * Stop a recovery case
   */
  static async stopCase(merchantId: string, caseId: string, stopReason: string) {
    const validStopReason = Object.values(RecoveryStopReason).includes(stopReason as RecoveryStopReason)
      ? (stopReason as RecoveryStopReason)
      : RecoveryStopReason.POLICY_BLOCKED;

    const updated = await db.recoveryCase.update({
      where: { id: caseId },
      data: {
        status: RecoveryCaseStatus.STOPPED,
        stopReason: validStopReason,
        resolvedAt: new Date(),
      },
    });

    await db.recoveryTimeline.create({
      data: {
        recoveryCaseId: caseId,
        event: "case_stopped",
        description: `Recovery stopped: ${stopReason.replace(/_/g, " ").toLowerCase()}`,
        actor: "system",
        metadata: { stopReason },
      },
    });

    await AuditService.createAuditLog({
      merchantId,
      entityType: "recovery_case",
      entityId: caseId,
      action: "recovery_stopped",
      changes: { stopReason, status: "STOPPED" },
    });

    return updated;
  }

  /**
   * Get agent activity feed (recent timeline events across all cases)
   */
  static async getAgentActivity(merchantId: string, limit = 50) {
    const timeline = await db.recoveryTimeline.findMany({
      where: {
        recoveryCase: { merchantId },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        recoveryCase: {
          select: {
            id: true,
            riskAmount: true,
            recoveredAmount: true,
            status: true,
            failureType: true,
            paymentMethod: true,
          },
        },
      },
    });

    return timeline.map((t) => ({
      id: t.id,
      recoveryCaseId: t.recoveryCaseId,
      event: t.event,
      description: t.description,
      actor: t.actor,
      riskAmount: t.recoveryCase.riskAmount,
      recoveredAmount: t.recoveryCase.recoveredAmount,
      status: t.recoveryCase.status,
      metadata: t.metadata,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Auto-detect failed payments and create recovery cases for them.
   * Called by the batch recovery flow or Inngest cron.
   */
  static async detectAndCreateCases(merchantId: string, options?: {
    since?: Date;
    limit?: number;
  }): Promise<{ created: number; skipped: number; errors: number }> {
    const since = options?.since || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const limit = options?.limit || 100;

    const failedPayments = await db.payment.findMany({
      where: {
        merchantId,
        status: PaymentStatus.FAILED,
        createdAt: { gte: since },
      },
      include: { order: true },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const payment of failedPayments) {
      try {
        // Check if case already exists
        const existing = await db.recoveryCase.findFirst({
          where: {
            paymentId: payment.id,
            status: { notIn: ["FAILED", "EXPIRED", "STOPPED"] },
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await this.createRecoveryCase({
          merchantId,
          paymentId: payment.id,
          orderId: payment.orderId,
          riskAmount: payment.amount,
          failureType: "payment_failure",
          failureReason: payment.failureReason || undefined,
          paymentMethod: payment.paymentMethod || undefined,
        });
        created++;
      } catch (err) {
        errors++;
        logger.warn("Failed to create recovery case for payment", {
          paymentId: payment.id,
        }, err);
      }
    }

    return { created, skipped, errors };
  }
}
