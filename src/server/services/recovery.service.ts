import { db } from "@/lib/db";
import {
  PaymentStatus,
  RecoveryCaseStatus,
  RecoveryActionType,
  RecoveryStopReason,
  type Prisma,
} from "@prisma/client";
import { AuditService } from "@/server/services/audit.service";
import { RevenueRiskService } from "@/server/services/revenue-risk.service";
import { RecoveryPolicyService } from "@/server/services/recovery-policy.service";
import { LedgerService } from "@/lib/transactions/ledger";
import { inngest } from "@/inngest/client";
import { NotFoundError } from "@/server/errors";
import { logger } from "@/lib/logger";
import type {
  RecoveryCaseCreateInput,
  ListRecoveryCasesQuery,
  AIRecommendation,
  PolicyDecision,
  RecoveryCommand,
  RecoveryResult,
  AgentActivityItem,
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

    // Check if a non-terminal recovery case already exists for this payment
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

    // Calculate recovery probability deterministically
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

    // Dispatch Inngest event for async durable processing
    try {
      await inngest.send({
        name: "recovery/case.created",
        data: {
          recoveryCaseId: recoveryCase.id,
          merchantId,
        },
      });
    } catch (err) {
      logger.warn("Failed to dispatch Inngest event for recovery case", {
        caseId: recoveryCase.id,
      }, err);
    }

    return recoveryCase;
  }

  /**
   * Get a recovery case by ID with full details
   */
  static async getRecoveryCaseById(merchantId: string, caseId: string) {
    const recoveryCase = await db.recoveryCase.findFirst({
      where: { id: caseId, merchantId },
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
            createdAt: true,
          },
        },
        order: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            receipt: true,
            razorpayOrderId: true,
          },
        },
        actions: {
          orderBy: { createdAt: "desc" },
        },
        timeline: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!recoveryCase) {
      throw new NotFoundError(`Recovery case ${caseId} not found`);
    }

    return recoveryCase;
  }

  /**
   * Alias for getRecoveryCaseById
   */
  static async getRecoveryCase(merchantId: string, caseId: string) {
    return this.getRecoveryCaseById(merchantId, caseId);
  }

  /**
   * List recovery cases with filtering and pagination
   */
  static async listRecoveryCases(
    merchantId: string,
    query: ListRecoveryCasesQuery = {}
  ) {
    const {
      page = 1,
      limit = 20,
      status,
      failureType,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.RecoveryCaseWhereInput = {
      merchantId,
      ...(status && { status }),
      ...(failureType && { failureType }),
      ...(search && {
        OR: [
          { paymentId: { contains: search, mode: "insensitive" } },
          { orderId: { contains: search, mode: "insensitive" } },
          { failureReason: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [total, cases] = await Promise.all([
      db.recoveryCase.count({ where }),
      db.recoveryCase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          payment: {
            select: {
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
   * Retrieve real-time agent activity feed across timeline events
   */
  static async getAgentActivity(merchantId: string, limit: number = 50): Promise<AgentActivityItem[]> {
    const events = await db.recoveryTimeline.findMany({
      where: {
        recoveryCase: {
          merchantId,
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        recoveryCase: {
          select: {
            riskAmount: true,
            recoveredAmount: true,
          },
        },
      },
    });

    return events.map((e) => ({
      id: e.id,
      recoveryCaseId: e.recoveryCaseId,
      event: e.event,
      description: e.description,
      actor: e.actor,
      riskAmount: e.recoveryCase.riskAmount,
      recoveredAmount: e.recoveryCase.recoveredAmount,
      metadata: e.metadata,
      createdAt: e.createdAt,
    }));
  }

  /**
   * Scan and create recovery cases for unhandled payment failures
   */
  static async detectAndCreateCases(
    merchantId: string,
    options: {
      since?: Date;
      until?: Date;
      limit?: number;
      minAmount?: number;
      maxAmount?: number;
    } = {}
  ) {
    const since = options.since || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const limit = options.limit || 100;

    const failedPayments = await db.payment.findMany({
      where: {
        merchantId,
        status: PaymentStatus.FAILED,
        createdAt: {
          gte: since,
          ...(options.until ? { lte: options.until } : {}),
        },
        ...(options.minAmount !== undefined || options.maxAmount !== undefined
          ? {
              amount: {
                ...(options.minAmount !== undefined ? { gte: options.minAmount } : {}),
                ...(options.maxAmount !== undefined ? { lt: options.maxAmount } : {}),
              },
            }
          : {}),
        recoveryCases: {
          none: {
            status: {
              in: [
                RecoveryCaseStatus.DETECTED,
                RecoveryCaseStatus.ANALYZING,
                RecoveryCaseStatus.ACTION_PENDING,
                RecoveryCaseStatus.EXECUTING,
                RecoveryCaseStatus.RECOVERED,
                RecoveryCaseStatus.ESCALATED,
              ],
            },
          },
        },
      },
      take: limit,
    });

    let createdCount = 0;
    for (const payment of failedPayments) {
      try {
        await this.createRecoveryCase({
          merchantId,
          paymentId: payment.id,
          orderId: payment.orderId,
          riskAmount: payment.amount,
          failureType: "payment_failure",
          failureReason: payment.failureReason || "Gateway failure",
          paymentMethod: payment.paymentMethod || "upi",
        });
        createdCount++;
      } catch (err) {
        logger.warn("Failed to create recovery case during detection", { paymentId: payment.id }, err);
      }
    }

    return {
      scanned: failedPayments.length,
      created: createdCount,
    };
  }

  /**
   * Scan and retrieve high-value cases requiring merchant review (>= threshold).
   * Ensures AI recommendations and deterministic policy checks are populated
   * WITHOUT executing any autonomous action.
   */
  static async getHighValueReviewCases(merchantId: string) {
    const policy = RecoveryPolicyService.getPolicy();
    const threshold = policy.highValueApprovalThresholdPaise; // ₹50,000

    // 1. Scan for any untracked failed payments >= threshold and create cases
    const unhandledHighValue = await db.payment.findMany({
      where: {
        merchantId,
        status: PaymentStatus.FAILED,
        amount: { gte: threshold },
        recoveryCases: {
          none: {
            status: {
              in: [
                RecoveryCaseStatus.DETECTED,
                RecoveryCaseStatus.ANALYZING,
                RecoveryCaseStatus.ACTION_PENDING,
                RecoveryCaseStatus.EXECUTING,
                RecoveryCaseStatus.RECOVERED,
                RecoveryCaseStatus.ESCALATED,
              ],
            },
          },
        },
      },
      take: 20,
    });

    for (const payment of unhandledHighValue) {
      try {
        await this.createRecoveryCase({
          merchantId,
          paymentId: payment.id,
          orderId: payment.orderId,
          riskAmount: payment.amount,
          failureType: "payment_failure",
          failureReason: payment.failureReason || "High-value failure requiring review",
          paymentMethod: payment.paymentMethod || "card",
        });
      } catch (err) {
        logger.warn("Failed to create high-value recovery case", { paymentId: payment.id }, err);
      }
    }

    // 2. Query all cases >= threshold that are currently awaiting review / escalated / pending
    const cases = await db.recoveryCase.findMany({
      where: {
        merchantId,
        riskAmount: { gte: threshold },
        status: {
          in: [
            RecoveryCaseStatus.DETECTED,
            RecoveryCaseStatus.ANALYZING,
            RecoveryCaseStatus.ACTION_PENDING,
            RecoveryCaseStatus.ESCALATED,
          ],
        },
      },
      include: {
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
            paymentMethod: true,
            failureReason: true,
            createdAt: true,
          },
        },
        order: {
          select: {
            id: true,
            receipt: true,
            amount: true,
            notes: true,
          },
        },
        actions: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { riskAmount: "desc" },
    });

    return {
      threshold,
      thresholdRupees: threshold / 100,
      count: cases.length,
      cases,
    };
  }

  /**
   * Record untrusted AI recommendation into recovery case
   */
  static async recordAIRecommendation(
    caseId: string,
    recommendation: AIRecommendation
  ) {
    const recoveryCase = await db.recoveryCase.update({
      where: { id: caseId },
      data: {
        recommendedAction: recommendation.recommendedAction,
        status: RecoveryCaseStatus.ACTION_PENDING,
        aiReasoningFactors: {
          analysis: recommendation.rawAnalysis || recommendation.analysis,
          reasoning: recommendation.reasoning,
          confidence: recommendation.confidence,
          factors: recommendation.evidenceFactors,
          provider: recommendation.provider,
          alternativeAction: recommendation.alternativeAction,
          generatedAt: recommendation.generatedAt,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    await db.recoveryTimeline.create({
      data: {
        recoveryCaseId: caseId,
        event: "ai_recommended",
        description: `AI recommended: ${recommendation.recommendedAction.replace(/_/g, " ").toLowerCase()} (Confidence: ${Math.round(recommendation.confidence * 100)}%, Provider: ${recommendation.provider})`,
        actor: "ai_agent",
        metadata: {
          action: recommendation.recommendedAction,
          confidence: recommendation.confidence,
          factors: recommendation.evidenceFactors,
          provider: recommendation.provider,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return recoveryCase;
  }

  /**
   * Execute a recovery action strictly through the deterministic Policy Engine
   */
  static async executeRecoveryAction(
    merchantId: string,
    caseId: string,
    actionType: RecoveryActionType,
    isMerchantApproved: boolean = false
  ): Promise<{
    allowed: boolean;
    policyDecision: PolicyDecision;
    command?: RecoveryCommand;
    requiresApproval?: boolean;
  }> {
    // 1. Independently evaluate fresh database truth through Policy Engine
    const policyDecision = await RecoveryPolicyService.evaluateCase(
      merchantId,
      caseId,
      { recommendedAction: actionType }
    );

    // Record policy check into timeline
    await db.recoveryTimeline.create({
      data: {
        recoveryCaseId: caseId,
        event: "policy_evaluated",
        description: policyDecision.allowed
          ? `Policy Engine approved action: ${actionType}`
          : `Policy Engine rejected action: ${policyDecision.reasons.join(", ")}`,
        actor: "policy_engine",
        metadata: {
          allowed: policyDecision.allowed,
          action: actionType,
          reasons: policyDecision.reasons,
          checks: policyDecision.checks,
          blockingRule: policyDecision.blockingRule,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Store policy evaluation result on case
    await db.recoveryCase.update({
      where: { id: caseId },
      data: {
        policyCheckResults: {
          allowed: policyDecision.allowed,
          checks: policyDecision.checks,
          reasons: policyDecision.reasons,
          evaluatedAt: policyDecision.evaluatedAt,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // If blocked, terminate/stop case
    if (!policyDecision.allowed) {
      await this.stopCase(merchantId, caseId, "POLICY_BLOCKED");
      return { allowed: false, policyDecision };
    }

    // If high value requires merchant review and has not yet been explicitly approved by merchant
    if (policyDecision.requiresMerchantApproval && !isMerchantApproved) {
      await db.recoveryCase.update({
        where: { id: caseId },
        data: {
          status: RecoveryCaseStatus.ESCALATED,
          escalationReason: "High-value transaction requires merchant approval",
        },
      });

      await db.recoveryTimeline.create({
        data: {
          recoveryCaseId: caseId,
          event: "escalated_for_approval",
          description: `Transaction value ₹${(policyDecision.trustedSnapshot.actualAmountPaise / 100).toLocaleString("en-IN")} requires manual merchant confirmation`,
          actor: "policy_engine",
        },
      });

      return { allowed: false, requiresApproval: true, policyDecision };
    }

    // 2. Policy approved — construct strictly bounded RecoveryCommand
    const command: RecoveryCommand = {
      commandId: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      recoveryCaseId: caseId,
      merchantId,
      validatedAction: actionType,
      attemptNumber: policyDecision.trustedSnapshot.actualAttemptCount + 1,
      authorizedAmountPaise: policyDecision.trustedSnapshot.actualAmountPaise,
      currency: policyDecision.trustedSnapshot.currency,
      policyDecision,
      dispatchedAt: new Date(),
    };

    // 3. Atomic state transition check — prevents concurrent execution races
    const atomicTransition = await db.recoveryCase.updateMany({
      where: {
        id: caseId,
        merchantId,
        status: {
          in: [
            RecoveryCaseStatus.DETECTED,
            RecoveryCaseStatus.ANALYZING,
            RecoveryCaseStatus.ACTION_PENDING,
            RecoveryCaseStatus.ESCALATED,
          ],
        },
      },
      data: {
        selectedAction: actionType,
        status: RecoveryCaseStatus.EXECUTING,
        attemptCount: command.attemptNumber,
      },
    });

    if (atomicTransition.count === 0) {
      return {
        allowed: false,
        policyDecision: {
          ...policyDecision,
          allowed: false,
          reasons: ["Concurrent recovery execution race detected — case is already in progress"],
          blockingRule: "no_concurrent_execution",
        },
      };
    }

    // Create action record
    const actionRecord = await db.recoveryAction.create({
      data: {
        recoveryCaseId: caseId,
        merchantId,
        actionType,
        attemptNumber: command.attemptNumber,
        status: "EXECUTING",
        executedAt: new Date(),
        input: {
          commandId: command.commandId,
          authorizedAmount: command.authorizedAmountPaise,
          isMerchantApproved,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    await db.recoveryTimeline.create({
      data: {
        recoveryCaseId: caseId,
        event: "recovery_executed",
        description: isMerchantApproved
          ? `Merchant-approved recovery action dispatched: ${actionType.replace(/_/g, " ").toLowerCase()} (attempt ${command.attemptNumber})`
          : `Recovery action dispatched: ${actionType.replace(/_/g, " ").toLowerCase()} (attempt ${command.attemptNumber})`,
        actor: isMerchantApproved ? "merchant" : "system",
        metadata: {
          actionType,
          attemptNumber: command.attemptNumber,
          commandId: command.commandId,
          isMerchantApproved,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Dispatch to Inngest for async execution
    try {
      await inngest.send({
        name: "recovery/action.executed",
        data: {
          recoveryCaseId: caseId,
          actionId: actionRecord.id,
          merchantId,
          commandId: command.commandId,
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
      changes: {
        actionType,
        attemptNumber: command.attemptNumber,
        actionId: actionRecord.id,
      },
    });

    return { allowed: true, policyDecision, command };
  }

  /**
   * Authoritatively record confirmed recovery outcome from webhook / verified gateway
   */
  static async recordRecoveryOutcome(
    merchantId: string,
    result: RecoveryResult
  ) {
    const recoveryCase = await db.recoveryCase.findFirst({
      where: { id: result.recoveryCaseId, merchantId },
    });

    if (!recoveryCase) {
      throw new NotFoundError(`Recovery case ${result.recoveryCaseId} not found`);
    }

    if (result.status === "SUCCESS") {
      // 1. Double-entry ledger credit (immutable accounting invariance)
      if (result.recoveredAmountPaise > 0) {
        await LedgerService.recordPaymentTransaction({
          merchantId,
          paymentId: recoveryCase.paymentId,
          orderId: recoveryCase.orderId,
          amount: result.recoveredAmountPaise,
          referenceId: result.razorpayPaymentId || `rec_${result.recoveryCaseId}`,
          currency: "INR",
          description: `Recovered revenue for case #${result.recoveryCaseId.slice(-8).toUpperCase()}`,
        });
      }

      // 2. Update recovery action
      await db.recoveryAction.update({
        where: { id: result.actionId },
        data: {
          status: "SUCCESS",
          completedAt: result.completedAt,
          output: {
            recoveredAmount: result.recoveredAmountPaise,
            razorpayPaymentId: result.razorpayPaymentId,
            verifiedVia: result.verifiedVia,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      // 3. Mark case as recovered
      await db.recoveryCase.update({
        where: { id: result.recoveryCaseId },
        data: {
          status: RecoveryCaseStatus.RECOVERED,
          recoveredAmount: result.recoveredAmountPaise,
          resolvedAt: result.completedAt,
        },
      });

      await db.recoveryTimeline.create({
        data: {
          recoveryCaseId: result.recoveryCaseId,
          event: "recovery_succeeded",
          description: `₹${(result.recoveredAmountPaise / 100).toLocaleString("en-IN")} authoritatively recovered and credited to ledger (verified via ${result.verifiedVia})`,
          actor: "system",
          metadata: {
            recoveredAmount: result.recoveredAmountPaise,
            razorpayPaymentId: result.razorpayPaymentId,
            verifiedVia: result.verifiedVia,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      await AuditService.createAuditLog({
        merchantId,
        entityType: "recovery_case",
        entityId: result.recoveryCaseId,
        action: "recovery_succeeded",
        changes: {
          recoveredAmount: result.recoveredAmountPaise,
          verifiedVia: result.verifiedVia,
        },
      });
    } else {
      // Action failed
      await db.recoveryAction.update({
        where: { id: result.actionId },
        data: {
          status: "FAILED",
          completedAt: result.completedAt,
          output: { error: result.error || "Recovery retry declined" } as unknown as Prisma.InputJsonValue,
        },
      });

      const maxReached = recoveryCase.attemptCount >= recoveryCase.maxAttempts;
      const nextStatus = maxReached ? RecoveryCaseStatus.STOPPED : RecoveryCaseStatus.FAILED;

      await db.recoveryCase.update({
        where: { id: result.recoveryCaseId },
        data: {
          status: nextStatus,
          stopReason: maxReached ? RecoveryStopReason.MAX_ATTEMPTS_REACHED : null,
          resolvedAt: maxReached ? result.completedAt : null,
        },
      });

      await db.recoveryTimeline.create({
        data: {
          recoveryCaseId: result.recoveryCaseId,
          event: "recovery_failed",
          description: `Recovery attempt ${recoveryCase.attemptCount} failed: ${result.error || "Declined by gateway"}`,
          actor: "system",
        },
      });
    }
  }

  /**
   * Stop a recovery case with reason
   */
  static async stopCase(
    merchantId: string,
    caseId: string,
    stopReason: string
  ) {
    const existing = await db.recoveryCase.findFirst({
      where: { id: caseId, merchantId },
    });

    if (!existing) {
      throw new NotFoundError(`Recovery case ${caseId} not found for merchant`);
    }

    const reasonEnum = Object.values(RecoveryStopReason).includes(stopReason as RecoveryStopReason)
      ? (stopReason as RecoveryStopReason)
      : RecoveryStopReason.POLICY_BLOCKED;

    const recoveryCase = await db.recoveryCase.update({
      where: { id: existing.id },
      data: {
        status: RecoveryCaseStatus.STOPPED,
        stopReason: reasonEnum,
        resolvedAt: new Date(),
      },
    });

    await db.recoveryTimeline.create({
      data: {
        recoveryCaseId: caseId,
        event: "recovery_stopped",
        description: `Recovery stopped: ${stopReason.replace(/_/g, " ").toLowerCase()}`,
        actor: "policy_engine",
      },
    });

    await AuditService.createAuditLog({
      merchantId,
      entityType: "recovery_case",
      entityId: caseId,
      action: "recovery_case_stopped",
      changes: { stopReason },
    });

    return recoveryCase;
  }

  /**
   * Escalate a recovery case to the merchant
   */
  static async escalateCase(
    merchantId: string,
    caseId: string,
    reason: string
  ) {
    const existing = await db.recoveryCase.findFirst({
      where: { id: caseId, merchantId },
    });

    if (!existing) {
      throw new NotFoundError(`Recovery case ${caseId} not found for merchant`);
    }

    const recoveryCase = await db.recoveryCase.update({
      where: { id: existing.id },
      data: {
        status: RecoveryCaseStatus.ESCALATED,
        escalationReason: reason,
      },
    });

    await db.recoveryTimeline.create({
      data: {
        recoveryCaseId: caseId,
        event: "recovery_escalated",
        description: `Case escalated: ${reason}`,
        actor: "system",
        metadata: { reason },
      },
    });

    await AuditService.createAuditLog({
      merchantId,
      entityType: "recovery_case",
      entityId: caseId,
      action: "recovery_case_escalated",
      changes: { escalationReason: reason },
    });

    return recoveryCase;
  }
}
