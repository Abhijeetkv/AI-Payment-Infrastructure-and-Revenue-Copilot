-- CreateEnum
CREATE TYPE "RecoveryCaseStatus" AS ENUM ('DETECTED', 'ANALYZING', 'ACTION_PENDING', 'EXECUTING', 'RECOVERED', 'FAILED', 'ESCALATED', 'STOPPED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RecoveryActionType" AS ENUM ('PAYMENT_RETRY', 'ALTERNATE_METHOD', 'SCHEDULED_RETRY', 'MERCHANT_ESCALATION', 'STOP_RECOVERY');

-- CreateEnum
CREATE TYPE "RecoveryStopReason" AS ENUM ('MAX_ATTEMPTS_REACHED', 'PAYMENT_RECOVERED', 'RECOVERY_NOT_ELIGIBLE', 'LOW_RECOVERY_PROBABILITY', 'CUSTOMER_ALREADY_PAID', 'PAYMENT_EXPIRED', 'POLICY_BLOCKED', 'MERCHANT_ESCALATION');

-- CreateTable
CREATE TABLE "recovery_cases" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT,
    "riskAmount" INTEGER NOT NULL,
    "failureType" TEXT NOT NULL,
    "failureReason" TEXT,
    "paymentMethod" TEXT,
    "recoveryProbability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedRecoveryAmount" INTEGER NOT NULL DEFAULT 0,
    "recommendedAction" "RecoveryActionType",
    "selectedAction" "RecoveryActionType",
    "status" "RecoveryCaseStatus" NOT NULL DEFAULT 'DETECTED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "recoveredAmount" INTEGER NOT NULL DEFAULT 0,
    "stopReason" "RecoveryStopReason",
    "escalationReason" TEXT,
    "aiReasoningFactors" JSONB,
    "policyCheckResults" JSONB,
    "isSimulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "recovery_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_actions" (
    "id" TEXT NOT NULL,
    "recoveryCaseId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "actionType" "RecoveryActionType" NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "newPaymentId" TEXT,
    "newOrderId" TEXT,
    "executedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_timeline" (
    "id" TEXT NOT NULL,
    "recoveryCaseId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'system',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recovery_cases_merchantId_idx" ON "recovery_cases"("merchantId");

-- CreateIndex
CREATE INDEX "recovery_cases_status_idx" ON "recovery_cases"("status");

-- CreateIndex
CREATE INDEX "recovery_cases_paymentId_idx" ON "recovery_cases"("paymentId");

-- CreateIndex
CREATE INDEX "recovery_cases_failureType_idx" ON "recovery_cases"("failureType");

-- CreateIndex
CREATE INDEX "recovery_cases_createdAt_idx" ON "recovery_cases"("createdAt");

-- CreateIndex
CREATE INDEX "recovery_actions_recoveryCaseId_idx" ON "recovery_actions"("recoveryCaseId");

-- CreateIndex
CREATE INDEX "recovery_actions_actionType_idx" ON "recovery_actions"("actionType");

-- CreateIndex
CREATE INDEX "recovery_actions_status_idx" ON "recovery_actions"("status");

-- CreateIndex
CREATE INDEX "recovery_timeline_recoveryCaseId_idx" ON "recovery_timeline"("recoveryCaseId");

-- CreateIndex
CREATE INDEX "recovery_timeline_createdAt_idx" ON "recovery_timeline"("createdAt");

-- AddForeignKey
ALTER TABLE "recovery_cases" ADD CONSTRAINT "recovery_cases_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_cases" ADD CONSTRAINT "recovery_cases_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_cases" ADD CONSTRAINT "recovery_cases_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_actions" ADD CONSTRAINT "recovery_actions_recoveryCaseId_fkey" FOREIGN KEY ("recoveryCaseId") REFERENCES "recovery_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_timeline" ADD CONSTRAINT "recovery_timeline_recoveryCaseId_fkey" FOREIGN KEY ("recoveryCaseId") REFERENCES "recovery_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
