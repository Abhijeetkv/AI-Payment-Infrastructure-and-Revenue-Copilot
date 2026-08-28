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
import { LedgerService } from "@/lib/transactions/ledger";
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
 * 1. Analyze the case
 * 2. Determine recommended action
 * 3. Validate against policy
 * 4. Execute action
 * 5. Check outcome
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

    // Step 1: Analyze the recovery case
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
          description: "AI agent analyzing payment failure and customer history",
          actor: "ai_agent",
        },
      });

      // Calculate recovery probability
      const { probability, expectedRecoveryAmount, factors } =
        await RevenueRiskService.calculateRecoveryProbability(merchantId, recoveryCase.paymentId);

      // Update case with probability
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
        paymentMethod: recoveryCase.payment?.paymentMethod,
        amount: recoveryCase.riskAmount,
        probability,
        factors,
        methodPerformance,
        failureReason: recoveryCase.failureReason,
        attemptCount: recoveryCase.attemptCount,
      };
    });

    // Step 2: Determine recommended action via AI Reasoning
    const recommendation = await step.run("determine-recovery-action", async () => {
      const aiAnalysis = await generateRecoveryCaseAnalysis({
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

      const recommendedAction = aiAnalysis.recommendedAction;
      const evidenceFactors = [
        ...aiAnalysis.evidenceFactors,
        `AI Confidence: ${Math.round(aiAnalysis.confidence * 100)}% (${aiAnalysis.provider})`,
      ];

      // Update case with recommendation and structured AI reasoning
      await db.recoveryCase.update({
        where: { id: recoveryCaseId },
        data: {
          recommendedAction,
          status: RecoveryCaseStatus.ACTION_PENDING,
          aiReasoningFactors: {
            analysis: aiAnalysis.analysis,
            reasoning: aiAnalysis.reasoning,
            confidence: aiAnalysis.confidence,
            factors: evidenceFactors,
            provider: aiAnalysis.provider,
            alternativeAction: aiAnalysis.alternativeAction,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      await db.recoveryTimeline.create({
        data: {
          recoveryCaseId,
          event: "ai_recommendation",
          description: `AI recommended: ${recommendedAction.replace(/_/g, " ").toLowerCase()} (${aiAnalysis.provider})`,
          actor: "ai_agent",
          metadata: {
            action: recommendedAction,
            factors: evidenceFactors,
            reasoning: aiAnalysis.reasoning,
            provider: aiAnalysis.provider,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        recommendedAction: recommendedAction as RecoveryActionType,
        evidenceFactors,
        reasoning: aiAnalysis.reasoning,
        provider: aiAnalysis.provider,
      };
    });

    // Step 3: Validate against policy
    const policyResult = await step.run("validate-recovery-policy", async () => {
      const recoveryCase = await db.recoveryCase.findUnique({
        where: { id: recoveryCaseId },
        include: { payment: true },
      });

      if (!recoveryCase) throw new Error("Case not found");

      const result = await RecoveryPolicyService.validateAction(
        recoveryCase,
        recommendation.recommendedAction
      );

      await db.recoveryTimeline.create({
        data: {
          recoveryCaseId,
          event: "policy_validated",
          description: result.allowed
            ? "All policy checks passed"
            : `Policy blocked: ${result.reasons.join(", ")}`,
          actor: "policy_engine",
          metadata: result as unknown as Prisma.InputJsonValue,
        },
      });

      await db.recoveryCase.update({
        where: { id: recoveryCaseId },
        data: { policyCheckResults: result as unknown as Prisma.InputJsonValue },
      });

      return result;
    });

    // Step 4: Execute or escalate
    if (!policyResult.allowed) {
      // Policy blocked — escalate
      await step.run("escalate-blocked-case", async () => {
        await db.recoveryCase.update({
          where: { id: recoveryCaseId },
          data: {
            status: RecoveryCaseStatus.ESCALATED,
            escalationReason: `Policy blocked: ${policyResult.reasons.join(", ")}`,
            resolvedAt: new Date(),
          },
        });

        await db.recoveryTimeline.create({
          data: {
            recoveryCaseId,
            event: "case_escalated",
            description: `Escalated: policy engine blocked recovery action`,
            actor: "system",
            metadata: policyResult as unknown as Prisma.InputJsonValue,
          },
        });
      });

      return { status: "escalated", reason: policyResult.reasons };
    }

    // If Scheduled Retry, pause for gateway cooldown window
    if (recommendation.recommendedAction === RecoveryActionType.SCHEDULED_RETRY) {
      await step.sleep("scheduled-retry-delay", "30m");
    }

    // Execute the recovery action
    const actionResult = await step.run("execute-recovery-action", async () => {
      const recoveryCase = await db.recoveryCase.findUnique({
        where: { id: recoveryCaseId },
        include: { payment: true, order: true },
      });

      if (!recoveryCase) throw new Error("Case not found");

      // Create action record
      const action = await db.recoveryAction.create({
        data: {
          recoveryCaseId,
          merchantId,
          actionType: recommendation.recommendedAction,
          attemptNumber: recoveryCase.attemptCount + 1,
          status: "EXECUTING",
          executedAt: new Date(),
        },
      });

      await db.recoveryCase.update({
        where: { id: recoveryCaseId },
        data: {
          selectedAction: recommendation.recommendedAction,
          status: RecoveryCaseStatus.EXECUTING,
          attemptCount: recoveryCase.attemptCount + 1,
        },
      });

      // Execute based on action type
      if (
        recommendation.recommendedAction === RecoveryActionType.PAYMENT_RETRY ||
        recommendation.recommendedAction === RecoveryActionType.ALTERNATE_METHOD ||
        recommendation.recommendedAction === RecoveryActionType.SCHEDULED_RETRY
      ) {
        try {
          // Create a new Razorpay order for retry
          const rzpOrder = await createRazorpayOrder({
            amount: recoveryCase.riskAmount,
            currency: recoveryCase.order?.currency || "INR",
            receipt: `recovery_${recoveryCaseId.slice(-8)}_${Date.now()}`,
            notes: {
              recovery_case_id: recoveryCaseId,
              original_payment_id: recoveryCase.paymentId,
              recovery_attempt: String(recoveryCase.attemptCount + 1),
            },
          });

          // Create new order record
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

          // For simulated data or test mode, simulate payment success
          if (recoveryCase.isSimulated || process.env.NODE_ENV === "development") {
            const shouldSucceed = Math.random() < recoveryCase.recoveryProbability;

            if (shouldSucceed) {
              // Simulate successful payment
              const newPayment = await db.payment.create({
                data: {
                  merchantId,
                  orderId: newOrder.id,
                  razorpayPaymentId: `pay_recovery_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
                  razorpayOrderId: rzpOrder.id,
                  amount: recoveryCase.riskAmount,
                  currency: recoveryCase.order?.currency || "INR",
                  paymentMethod: recommendation.recommendedAction === RecoveryActionType.ALTERNATE_METHOD
                    ? "card" // Switch to alternate method
                    : recoveryCase.paymentMethod || "upi",
                  status: PaymentStatus.SUCCESS,
                },
              });

              await db.order.update({
                where: { id: newOrder.id },
                data: { status: OrderStatus.PAID },
              });

              // Record ledger entry
              await LedgerService.recordPaymentTransaction({
                merchantId,
                paymentId: newPayment.id,
                orderId: newOrder.id,
                amount: recoveryCase.riskAmount,
                referenceId: newPayment.razorpayPaymentId || undefined,
                currency: recoveryCase.order?.currency || "INR",
                description: `Recovery payment for case ${recoveryCaseId.slice(-8)}`,
              });

              // Update action
              await db.recoveryAction.update({
                where: { id: action.id },
                data: {
                  status: "SUCCESS",
                  newPaymentId: newPayment.id,
                  newOrderId: newOrder.id,
                  completedAt: new Date(),
                  output: {
                    razorpayPaymentId: newPayment.razorpayPaymentId,
                    amount: recoveryCase.riskAmount,
                  },
                },
              });

              // Mark case as recovered
              await db.recoveryCase.update({
                where: { id: recoveryCaseId },
                data: {
                  status: RecoveryCaseStatus.RECOVERED,
                  recoveredAmount: recoveryCase.riskAmount,
                  resolvedAt: new Date(),
                },
              });

              await db.recoveryTimeline.create({
                data: {
                  recoveryCaseId,
                  event: "recovery_completed",
                  description: `₹${(recoveryCase.riskAmount / 100).toLocaleString("en-IN")} successfully recovered via ${recommendation.recommendedAction.replace(/_/g, " ").toLowerCase()}`,
                  actor: "system",
                  metadata: {
                    recoveredAmount: recoveryCase.riskAmount,
                    newPaymentId: newPayment.id,
                  },
                },
              });

              await AuditService.createAuditLog({
                merchantId,
                entityType: "recovery_case",
                entityId: recoveryCaseId,
                action: "recovery_completed",
                changes: {
                  recoveredAmount: recoveryCase.riskAmount,
                  newPaymentId: newPayment.id,
                },
              });

              return { status: "recovered", amount: recoveryCase.riskAmount };
            } else {
              // Simulate failed retry
              await db.recoveryAction.update({
                where: { id: action.id },
                data: {
                  status: "FAILED",
                  completedAt: new Date(),
                  output: { reason: "Payment retry failed" },
                },
              });

              // Check if max attempts reached
              if (recoveryCase.attemptCount + 1 >= recoveryCase.maxAttempts) {
                await db.recoveryCase.update({
                  where: { id: recoveryCaseId },
                  data: {
                    status: RecoveryCaseStatus.STOPPED,
                    stopReason: "MAX_ATTEMPTS_REACHED",
                    resolvedAt: new Date(),
                  },
                });

                await db.recoveryTimeline.create({
                  data: {
                    recoveryCaseId,
                    event: "case_stopped",
                    description: "Maximum recovery attempts reached",
                    actor: "system",
                  },
                });

                return { status: "stopped", reason: "MAX_ATTEMPTS_REACHED" };
              } else {
                // Reset to ACTION_PENDING for another attempt
                await db.recoveryCase.update({
                  where: { id: recoveryCaseId },
                  data: { status: RecoveryCaseStatus.ACTION_PENDING },
                });

                await db.recoveryTimeline.create({
                  data: {
                    recoveryCaseId,
                    event: "retry_failed",
                    description: `Recovery attempt ${recoveryCase.attemptCount + 1} failed — will reassess`,
                    actor: "system",
                  },
                });

                return { status: "retry_failed", attempt: recoveryCase.attemptCount + 1 };
              }
            }
          }

          // Non-simulated: order created, waiting for payment via webhook
          await db.recoveryAction.update({
            where: { id: action.id },
            data: {
              newOrderId: newOrder.id,
              output: { razorpayOrderId: rzpOrder.id },
            },
          });

          await db.recoveryTimeline.create({
            data: {
              recoveryCaseId,
              event: "payment_retry_initiated",
              description: `Recovery order created, awaiting payment`,
              actor: "system",
              metadata: { razorpayOrderId: rzpOrder.id },
            },
          });

          return { status: "awaiting_payment", orderId: newOrder.id };

        } catch (err) {
          logger.error("Recovery action execution failed", { recoveryCaseId }, err);

          await db.recoveryAction.update({
            where: { id: action.id },
            data: {
              status: "FAILED",
              completedAt: new Date(),
              output: { error: err instanceof Error ? err.message : "Unknown error" },
            },
          });

          await db.recoveryCase.update({
            where: { id: recoveryCaseId },
            data: { status: RecoveryCaseStatus.FAILED },
          });

          return { status: "execution_error" };
        }
      } else if (recommendation.recommendedAction === RecoveryActionType.MERCHANT_ESCALATION) {
        await db.recoveryCase.update({
          where: { id: recoveryCaseId },
          data: {
            status: RecoveryCaseStatus.ESCALATED,
            escalationReason: "AI recommended merchant intervention",
            resolvedAt: new Date(),
          },
        });

        await db.recoveryAction.update({
          where: { id: action.id },
          data: { status: "SUCCESS", completedAt: new Date() },
        });

        await db.recoveryTimeline.create({
          data: {
            recoveryCaseId,
            event: "case_escalated",
            description: "Escalated to merchant for manual intervention",
            actor: "system",
          },
        });

        return { status: "escalated" };
      } else if (recommendation.recommendedAction === RecoveryActionType.STOP_RECOVERY) {
        await db.recoveryCase.update({
          where: { id: recoveryCaseId },
          data: {
            status: RecoveryCaseStatus.STOPPED,
            stopReason: "LOW_RECOVERY_PROBABILITY",
            resolvedAt: new Date(),
          },
        });

        await db.recoveryAction.update({
          where: { id: action.id },
          data: { status: "SUCCESS", completedAt: new Date() },
        });

        return { status: "stopped" };
      }

      return { status: "unknown_action" };
    });

    logger.info("Recovery case processing completed", {
      recoveryCaseId,
      result: actionResult,
    });

    return actionResult;
  }
);

/**
 * Process batch recovery: detect failed payments and create cases
 */
export const processBatchRecovery = inngest.createFunction(
  {
    id: "process-batch-recovery",
    retries: 1,
    triggers: [{ event: "recovery/batch.started" }],
  },
  async ({
    event,
    step,
  }: {
    event: { data: { merchantId: string; batchId: string } };
    step: StepTools;
  }) => {
    const { merchantId, batchId } = event.data;

    const result = await step.run("detect-and-create-cases", async () => {
      // Import dynamically to avoid circular deps
      const { RecoveryService } = await import("@/server/services/recovery.service");
      return await RecoveryService.detectAndCreateCases(merchantId, {
        since: new Date(Date.now() - 24 * 60 * 60 * 1000),
        limit: 100,
      });
    });

    logger.info("Batch recovery completed", {
      merchantId,
      batchId,
      ...result,
    });

    return { batchId, ...result };
  }
);

/**
 * Hourly Cron Worker to automatically expire stale active recovery cases older than 72 hours
 */
export const expireStaleRecoveryCasesCron = inngest.createFunction(
  {
    id: "expire-stale-recovery-cases",
    retries: 2,
    triggers: [{ cron: "0 * * * *" }], // Hourly
  },
  async ({ step }: { step: StepTools }) => {
    const expiredCasesSummary = await step.run("expire-stale-cases", async () => {
      const expirationHours = 72;
      const cutoffDate = new Date(Date.now() - expirationHours * 60 * 60 * 1000);

      const staleCases = await db.recoveryCase.findMany({
        where: {
          status: {
            in: [
              RecoveryCaseStatus.DETECTED,
              RecoveryCaseStatus.ANALYZING,
              RecoveryCaseStatus.ACTION_PENDING,
              RecoveryCaseStatus.EXECUTING,
            ],
          },
          createdAt: { lt: cutoffDate },
        },
        select: { id: true, merchantId: true, riskAmount: true },
      });

      if (staleCases.length === 0) {
        return { expiredCount: 0, cases: [] };
      }

      for (const sc of staleCases) {
        await db.recoveryCase.update({
          where: { id: sc.id },
          data: {
            status: RecoveryCaseStatus.EXPIRED,
            stopReason: "PAYMENT_EXPIRED",
            resolvedAt: new Date(),
          },
        });

        await db.recoveryTimeline.create({
          data: {
            recoveryCaseId: sc.id,
            event: "case_expired",
            description: `Recovery window expired after ${expirationHours} hours`,
            actor: "system",
          },
        });

        await AuditService.createAuditLog({
          merchantId: sc.merchantId,
          entityType: "recovery_case",
          entityId: sc.id,
          action: "recovery_case_expired",
          changes: { reason: "PAYMENT_EXPIRED", cutoffDate },
        });
      }

      return {
        expiredCount: staleCases.length,
        cases: staleCases.map((c) => c.id),
      };
    });

    logger.info("Expired stale recovery cases cron complete", expiredCasesSummary);
    return expiredCasesSummary;
  }
);
