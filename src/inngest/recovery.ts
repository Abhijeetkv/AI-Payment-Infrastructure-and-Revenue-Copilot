import { inngest } from "./client";
import { db } from "@/lib/db";
import {
  RecoveryCaseStatus,
  RecoveryActionType,
  PaymentStatus,
  OrderStatus,
  type Prisma,
} from "@prisma/client";
import { RevenueRiskService } from "@/server/services/revenue-risk.service";
import { RecoveryPolicyService } from "@/server/services/recovery-policy.service";
import { RecoveryService } from "@/server/services/recovery.service";
import { AuditService } from "@/server/services/audit.service";
import { createRazorpayOrder } from "@/lib/razorpay/orders";
import { generateRecoveryCaseAnalysis } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

interface StepTools {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  sleep: (name: string, duration: string) => Promise<void>;
}

/**
 * Process a newly created recovery case:
 * 1. Analyze case from trusted database telemetry
 * 2. Get untrusted AI advisory recommendation
 * 3. Validate against deterministic Policy Engine
 * 4. Execute action via bounded Recovery Command
 * 5. Outcome verification (webhook / simulation)
 */
export const processRecoveryCase = inngest.createFunction(
  {
    id: "process-recovery-case",
    retries: 2,
    triggers: [{ event: "recovery/case.created" }],
  },
  async ({
    event,
    step,
  }: {
    event: { data: { recoveryCaseId: string; merchantId: string } };
    step: StepTools;
  }) => {
    const { recoveryCaseId, merchantId } = event.data;

    // Step 1: Deterministic Analysis from database
    const analysis = await step.run("analyze-recovery-case", async () => {
      const recoveryCase = await db.recoveryCase.findUnique({
        where: { id: recoveryCaseId },
        include: { payment: true, order: true },
      });

      if (!recoveryCase) {
        throw new Error(`Recovery case ${recoveryCaseId} not found`);
      }

      // Update status to ANALYZING
      await db.recoveryCase.update({
        where: { id: recoveryCaseId },
        data: { status: RecoveryCaseStatus.ANALYZING },
      });

      await db.recoveryTimeline.create({
        data: {
          recoveryCaseId,
          event: "analysis_started",
          description: "AI agent analyzing payment failure telemetry and historical route conversion",
          actor: "ai_agent",
        },
      });

      // Calculate recovery probability deterministically
      const { probability, expectedRecoveryAmount, factors } =
        await RevenueRiskService.calculateRecoveryProbability(merchantId, recoveryCase.paymentId);

      // Update case with calculated probability
      await db.recoveryCase.update({
        where: { id: recoveryCaseId },
        data: {
          recoveryProbability: probability,
          expectedRecoveryAmount,
        },
      });

      // Get payment method performance
      const methodPerformance = await RevenueRiskService.getPaymentMethodPerformance(merchantId);

      return {
        caseId: recoveryCaseId,
        paymentMethod: recoveryCase.payment?.paymentMethod || recoveryCase.paymentMethod,
        amount: recoveryCase.riskAmount,
        probability,
        factors,
        methodPerformance,
        failureReason: recoveryCase.failureReason,
        attemptCount: recoveryCase.attemptCount,
      };
    });

    // Step 2: Request Untrusted AI Advisory Recommendation
    const recommendation = await step.run("determine-recovery-action", async () => {
      const aiRecommendation = await generateRecoveryCaseAnalysis({
        caseId: recoveryCaseId,
        merchantId,
        riskAmount: analysis.amount,
        failureType: analysis.failureReason?.includes("bank") ? "payment_failure" : "checkout_abandonment",
        failureReason: analysis.failureReason,
        paymentMethod: analysis.paymentMethod,
        attemptCount: analysis.attemptCount,
        probability: analysis.probability,
        factors: analysis.factors,
        methodPerformance: analysis.methodPerformance,
      });

      // Record advisory recommendation into database
      await RecoveryService.recordAIRecommendation(recoveryCaseId, aiRecommendation);

      return aiRecommendation;
    });

    // Step 3: Independently validate against deterministic Policy Engine
    const policyDecision = await step.run("validate-recovery-policy", async () => {
      return RecoveryPolicyService.evaluateCase(
        merchantId,
        recoveryCaseId,
        recommendation
      );
    });

    // Step 4: Handle Policy Decision
    if (!policyDecision.allowed) {
      await step.run("escalate-blocked-case", async () => {
        await db.recoveryCase.update({
          where: { id: recoveryCaseId },
          data: {
            status: RecoveryCaseStatus.ESCALATED,
            escalationReason: `Policy blocked: ${policyDecision.reasons.join(", ")}`,
            resolvedAt: new Date(),
          },
        });

        await db.recoveryTimeline.create({
          data: {
            recoveryCaseId,
            event: "case_escalated",
            description: `Escalated: policy engine blocked action (${policyDecision.reasons.join(", ")})`,
            actor: "policy_engine",
            metadata: policyDecision as unknown as Prisma.InputJsonValue,
          },
        });
      });

      return { status: "escalated", reason: policyDecision.reasons };
    }

    if (policyDecision.requiresMerchantApproval) {
      await step.run("escalate-high-value-approval", async () => {
        await db.recoveryCase.update({
          where: { id: recoveryCaseId },
          data: {
            status: RecoveryCaseStatus.ESCALATED,
            escalationReason: "High-value recovery requires merchant confirmation",
          },
        });

        await db.recoveryTimeline.create({
          data: {
            recoveryCaseId,
            event: "escalated_for_approval",
            description: `High-value transaction (₹${(policyDecision.trustedSnapshot.actualAmountPaise / 100).toLocaleString("en-IN")}) requires manual merchant confirmation`,
            actor: "policy_engine",
          },
        });
      });

      return { status: "escalated_for_approval" };
    }

    // If Scheduled Retry, pause for gateway cooldown window
    if (recommendation.recommendedAction === RecoveryActionType.SCHEDULED_RETRY) {
      await step.sleep("scheduled-retry-delay", "30m");
    }

    // Step 5: Execute the recovery action strictly via bounded RecoveryCommand
    const executionOutcome = await step.run("execute-recovery-action", async () => {
      const recoveryCase = await db.recoveryCase.findUnique({
        where: { id: recoveryCaseId },
        include: { payment: true, order: true },
      });

      if (!recoveryCase) throw new Error("Case not found");

      const attemptNumber = recoveryCase.attemptCount + 1;

      // Create action record
      const action = await db.recoveryAction.create({
        data: {
          recoveryCaseId,
          merchantId,
          actionType: recommendation.recommendedAction,
          attemptNumber,
          status: "EXECUTING",
          executedAt: new Date(),
        },
      });

      await db.recoveryCase.update({
        where: { id: recoveryCaseId },
        data: {
          selectedAction: recommendation.recommendedAction,
          status: RecoveryCaseStatus.EXECUTING,
          attemptCount: attemptNumber,
        },
      });

      if (
        recommendation.recommendedAction === RecoveryActionType.PAYMENT_RETRY ||
        recommendation.recommendedAction === RecoveryActionType.ALTERNATE_METHOD ||
        recommendation.recommendedAction === RecoveryActionType.SCHEDULED_RETRY
      ) {
        // Create new Razorpay order for retry
        const rzpOrder = await createRazorpayOrder({
          amount: recoveryCase.riskAmount,
          currency: recoveryCase.order?.currency || "INR",
          receipt: `recovery_${recoveryCaseId.slice(-8)}_${Date.now()}`,
          notes: {
            recovery_case_id: recoveryCaseId,
            original_payment_id: recoveryCase.paymentId,
            recovery_attempt: String(attemptNumber),
          },
        });

        const newOrder = await db.order.create({
          data: {
            merchantId,
            amount: recoveryCase.riskAmount,
            currency: recoveryCase.order?.currency || "INR",
            razorpayOrderId: rzpOrder.id,
            receipt: `recovery_${recoveryCaseId.slice(-8)}`,
            notes: {
              recovery_case_id: recoveryCaseId,
              original_order_id: recoveryCase.orderId,
            },
          },
        });

        // ONLY if this is an explicit sandbox simulation case, deterministically complete the outcome
        if (recoveryCase.isSimulated) {
          const shouldSucceed = Math.random() < recoveryCase.recoveryProbability;

          if (shouldSucceed) {
            const newPayment = await db.payment.create({
              data: {
                merchantId,
                orderId: newOrder.id,
                razorpayPaymentId: `pay_sim_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
                razorpayOrderId: rzpOrder.id,
                amount: recoveryCase.riskAmount,
                currency: recoveryCase.order?.currency || "INR",
                paymentMethod: recommendation.recommendedAction === RecoveryActionType.ALTERNATE_METHOD
                  ? "card"
                  : recoveryCase.paymentMethod || "upi",
                status: PaymentStatus.SUCCESS,
              },
            });

            await db.order.update({
              where: { id: newOrder.id },
              data: { status: OrderStatus.PAID },
            });

            // Authoritatively record outcome and credit ledger
            await RecoveryService.recordRecoveryOutcome(merchantId, {
              recoveryCaseId,
              actionId: action.id,
              status: "SUCCESS",
              recoveredAmountPaise: recoveryCase.riskAmount,
              razorpayPaymentId: newPayment.razorpayPaymentId || undefined,
              razorpayOrderId: rzpOrder.id,
              verifiedVia: "simulation",
              completedAt: new Date(),
            });

            return { status: "recovered", amount: recoveryCase.riskAmount };
          } else {
            await RecoveryService.recordRecoveryOutcome(merchantId, {
              recoveryCaseId,
              actionId: action.id,
              status: "FAILED",
              recoveredAmountPaise: 0,
              verifiedVia: "simulation",
              completedAt: new Date(),
              error: "Simulated bank decline",
            });

            return { status: "retry_failed", attempt: attemptNumber };
          }
        }

        // Live / Test Mode: Order created, awaiting actual customer payment / webhook confirmation
        await db.recoveryAction.update({
          where: { id: action.id },
          data: {
            newOrderId: newOrder.id,
            output: { razorpayOrderId: rzpOrder.id, status: "AWAITING_PAYMENT" },
          },
        });

        await db.recoveryTimeline.create({
          data: {
            recoveryCaseId,
            event: "payment_retry_initiated",
            description: `Recovery order created (#${rzpOrder.id}), awaiting customer payment webhook`,
            actor: "system",
            metadata: { razorpayOrderId: rzpOrder.id },
          },
        });

        return { status: "awaiting_payment", orderId: newOrder.id };
      }

      if (recommendation.recommendedAction === RecoveryActionType.MERCHANT_ESCALATION) {
        await RecoveryService.escalateCase(merchantId, recoveryCaseId, "AI recommended merchant escalation");
        return { status: "escalated" };
      }

      if (recommendation.recommendedAction === RecoveryActionType.STOP_RECOVERY) {
        await RecoveryService.stopCase(merchantId, recoveryCaseId, "AI recommended stopping recovery");
        return { status: "stopped" };
      }

      return { status: "completed" };
    });

    return executionOutcome;
  }
);

/**
 * Periodic anomaly scanner:
 * Checks for payment failure anomalies and auto-generates recovery cases
 */
export const scanForRecoveryOpportunities = inngest.createFunction(
  {
    id: "scan-recovery-opportunities",
    retries: 1,
    triggers: [{ cron: "*/15 * * * *" }], // Every 15 minutes
  },
  async ({ step }: { step: StepTools }) => {
    const opportunities = await step.run("find-unrecovered-failures", async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Find failed payments in the last 24h that don't have an active recovery case
      const failedPayments = await db.payment.findMany({
        where: {
          status: PaymentStatus.FAILED,
          createdAt: { gte: oneDayAgo },
          recoveryCases: {
            none: {
              status: {
                in: [
                  RecoveryCaseStatus.DETECTED,
                  RecoveryCaseStatus.ANALYZING,
                  RecoveryCaseStatus.ACTION_PENDING,
                  RecoveryCaseStatus.EXECUTING,
                  RecoveryCaseStatus.RECOVERED,
                ],
              },
            },
          },
        },
        take: 50,
      });

      return failedPayments.map((p) => ({
        paymentId: p.id,
        merchantId: p.merchantId,
        orderId: p.orderId,
        amount: p.amount,
        failureReason: p.failureReason,
        paymentMethod: p.paymentMethod,
      }));
    });

    if (opportunities.length === 0) {
      return { created: 0 };
    }

    const createdCases = await step.run("create-recovery-cases", async () => {
      let created = 0;
      for (const opp of opportunities) {
        try {
          await RecoveryService.createRecoveryCase({
            merchantId: opp.merchantId,
            paymentId: opp.paymentId,
            orderId: opp.orderId,
            riskAmount: opp.amount,
            failureType: "payment_failure",
            failureReason: opp.failureReason || "Gateway failure",
            paymentMethod: opp.paymentMethod || "upi",
          });
          created++;
        } catch (err) {
          logger.warn("Failed to create recovery case in batch scan", { paymentId: opp.paymentId }, err);
        }
      }
      return { created };
    });

    return createdCases;
  }
);

/**
 * Execute a recovery campaign across a batch of failed transactions
 */
export const executeScheduledCampaign = inngest.createFunction(
  {
    id: "execute-recovery-campaign",
    retries: 1,
    triggers: [{ event: "recovery/campaign.scheduled" }],
  },
  async ({
    event,
    step,
  }: {
    event: {
      data: {
        campaignId: string;
        merchantId: string;
        lookbackHours: number;
        failureTypeFilter?: string;
        minAmount?: number;
      };
    };
    step: StepTools;
  }) => {
    const { campaignId, merchantId, lookbackHours, failureTypeFilter, minAmount } = event.data;

    const candidates = await step.run("query-campaign-candidates", async () => {
      const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

      const payments = await db.payment.findMany({
        where: {
          merchantId,
          status: PaymentStatus.FAILED,
          createdAt: { gte: since },
          ...(minAmount && { amount: { gte: minAmount } }),
          recoveryCases: {
            none: {
              status: {
                in: [
                  RecoveryCaseStatus.DETECTED,
                  RecoveryCaseStatus.ANALYZING,
                  RecoveryCaseStatus.ACTION_PENDING,
                  RecoveryCaseStatus.EXECUTING,
                  RecoveryCaseStatus.RECOVERED,
                ],
              },
            },
          },
        },
        take: 100,
      });

      return payments.map((p) => ({
        paymentId: p.id,
        orderId: p.orderId,
        amount: p.amount,
        failureReason: p.failureReason,
        paymentMethod: p.paymentMethod,
      }));
    });

    const result = await step.run("execute-campaign-batch", async () => {
      let created = 0;
      let skipped = 0;

      for (const p of candidates) {
        try {
          await RecoveryService.createRecoveryCase({
            merchantId,
            paymentId: p.paymentId,
            orderId: p.orderId,
            riskAmount: p.amount,
            failureType: failureTypeFilter || "payment_failure",
            failureReason: p.failureReason || "Campaign scan failure",
            paymentMethod: p.paymentMethod || "upi",
          });
          created++;
        } catch {
          skipped++;
        }
      }

      await AuditService.createAuditLog({
        merchantId,
        entityType: "recovery_case",
        entityId: campaignId,
        action: "campaign_executed",
        changes: { created, skipped, lookbackHours },
      });

      return { created, skipped, total: candidates.length };
    });

    return result;
  }
);

/**
 * Process batch recovery for selected case IDs
 */
export const processBatchRecovery = inngest.createFunction(
  {
    id: "process-batch-recovery",
    retries: 1,
    triggers: [
      { event: "recovery/batch.started" },
      { event: "recovery/batch.requested" },
    ],
  },
  async ({
    event,
    step,
  }: {
    event: {
      data: {
        merchantId: string;
        batchId?: string;
        campaignType?: string;
        caseIds?: string[];
        actionType?: RecoveryActionType;
      };
    };
    step: StepTools;
  }) => {
    const { merchantId, batchId, campaignType, actionType } = event.data;

    const targetCaseIds = await step.run("resolve-target-cases", async () => {
      if (event.data.caseIds && event.data.caseIds.length > 0) {
        return event.data.caseIds;
      }

      // Query open recovery cases for the merchant
      const cases = await db.recoveryCase.findMany({
        where: {
          merchantId,
          status: { in: [RecoveryCaseStatus.OPEN, RecoveryCaseStatus.IN_PROGRESS] },
        },
        select: { id: true },
        take: 50,
      });

      return cases.map((c) => c.id);
    });

    return step.run("execute-batch-actions", async () => {
      let executed = 0;
      let blocked = 0;

      for (const caseId of targetCaseIds) {
        try {
          const action = actionType || RecoveryActionType.PAYMENT_RETRY;
          const result = await RecoveryService.executeRecoveryAction(merchantId, caseId, action);
          if (result.allowed) {
            executed++;
          } else {
            blocked++;
          }
        } catch {
          blocked++;
        }
      }

      return {
        batchId,
        campaignType,
        total: targetCaseIds.length,
        executed,
        blocked,
      };
    });
  }
);

/**
 * Expire stale recovery cases older than policy expiration window (72h)
 */
export const expireStaleRecoveryCasesCron = inngest.createFunction(
  {
    id: "expire-stale-recovery-cases",
    retries: 1,
    triggers: [{ cron: "0 * * * *" }], // Hourly
  },
  async ({ step }: { step: StepTools }) => {
    return step.run("expire-stale-cases", async () => {
      const expirationHours = 72;
      const cutoff = new Date(Date.now() - expirationHours * 60 * 60 * 1000);

      const staleCases = await db.recoveryCase.findMany({
        where: {
          status: {
            in: [
              RecoveryCaseStatus.DETECTED,
              RecoveryCaseStatus.ANALYZING,
              RecoveryCaseStatus.ACTION_PENDING,
            ],
          },
          createdAt: { lt: cutoff },
        },
        take: 100,
      });

      let expiredCount = 0;
      for (const c of staleCases) {
        await db.recoveryCase.update({
          where: { id: c.id },
          data: {
            status: RecoveryCaseStatus.EXPIRED,
            resolvedAt: new Date(),
          },
        });

        await db.recoveryTimeline.create({
          data: {
            recoveryCaseId: c.id,
            event: "case_expired",
            description: `Recovery window expired (> ${expirationHours}h limit)`,
            actor: "policy_engine",
          },
        });
        expiredCount++;
      }

      return { expiredCount };
    });
  }
);
