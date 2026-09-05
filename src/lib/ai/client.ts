import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { executeCopilotTool } from "./tools";
import { RECOVERY_AGENT_SYSTEM_INSTRUCTION, buildRecoveryAnalysisPrompt } from "./prompts";
import { RecoveryActionType } from "@prisma/client";
import type { AIRecommendation } from "@/lib/recovery/types";
import { validateAIRecommendation } from "@/lib/recovery/validation";
import { logger } from "@/lib/logger";

export interface ChatMessageParam {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
}

export interface CopilotGenerationResult {
  content: string;
  toolCallsExecuted: Array<{
    toolName: string;
    toolInput: Record<string, unknown>;
    toolOutput: Record<string, unknown>;
  }>;
  provider: "gemini" | "openai" | "deterministic_engine";
}

const SYSTEM_INSTRUCTION = RECOVERY_AGENT_SYSTEM_INSTRUCTION;

/**
 * Intelligent deterministic reasoning engine when cloud LLM API keys are not supplied
 */
async function generateDeterministicResponse(
  merchantId: string,
  userMessage: string
): Promise<CopilotGenerationResult> {
  const q = userMessage.toLowerCase();
  const toolCallsExecuted: Array<{
    toolName: string;
    toolInput: Record<string, unknown>;
    toolOutput: Record<string, unknown>;
  }> = [];

  let content = "";

  // Recovery-focused queries (prioritized)
  if (q.includes("recover") || q.includes("at risk") || q.includes("risk") || q.includes("case") || q.includes("agent")) {
    const riskOutput = await executeCopilotTool(merchantId, "getRevenueAtRisk", {});
    const metricsOutput = await executeCopilotTool(merchantId, "getRecoveryMetrics", {});
    toolCallsExecuted.push({ toolName: "getRevenueAtRisk", toolInput: {}, toolOutput: riskOutput });
    toolCallsExecuted.push({ toolName: "getRecoveryMetrics", toolInput: {}, toolOutput: metricsOutput });

    content = `### 🔄 Recovery Agent Intelligence Report\n\n` +
      `#### Revenue At Risk\n` +
      `- **Total At Risk**: \`${riskOutput.totalAtRisk}\`\n` +
      `- **Eligible Payments**: **${riskOutput.eligiblePayments}** failed payments recoverable\n\n` +
      `#### Recovery Performance\n` +
      `- **Recovered Revenue**: \`${metricsOutput.recoveredRevenue}\`\n` +
      `- **Recovery Rate**: **${metricsOutput.recoveryRate}**\n` +
      `- **Active Cases**: **${metricsOutput.activeCases}**\n` +
      `- **Total Cases**: **${metricsOutput.totalCases}**\n` +
      `- **Escalated**: ${metricsOutput.escalatedCases} | **Stopped**: ${metricsOutput.stoppedCases}\n\n` +
      `> **Agent Status**: Lumina Recovery Agent is actively monitoring ${metricsOutput.activeCases} cases and has recovered ${metricsOutput.recoveredRevenue} to date.`;

  } else if (q.includes("revenue") || q.includes("gross") || q.includes("net") || q.includes("sales") || q.includes("earnings")) {
    const toolInput = { days: q.includes("week") || q.includes("7") ? 7 : 30 };
    const toolOutput = await executeCopilotTool(merchantId, "getRevenueMetrics", toolInput);
    toolCallsExecuted.push({ toolName: "getRevenueMetrics", toolInput, toolOutput });

    content = `### 📊 Revenue Intelligence Overview (${toolOutput.timeframe})\n\n` +
      `- **Gross Credited Revenue**: \`${toolOutput.grossRevenue}\`\n` +
      `- **Total Refund Debits**: \`${toolOutput.refundAmount}\` (${toolOutput.refundRate} refund rate)\n` +
      `- **Net Settled Revenue**: \`${toolOutput.netRevenue}\`\n` +
      `- **Successful Transactions**: **${toolOutput.successfulPayments}** of ${toolOutput.totalTransactions} (${toolOutput.successRate} conversion rate)\n` +
      `- **Average Transaction Value (ATV)**: \`${toolOutput.avgTransactionValue}\`\n\n` +
      `> **Financial Note**: In accordance with double-entry accounting invariance, net revenue equals Gross Credits minus Refund Debits recorded in the transaction ledger.`;

  } else if (q.includes("fail") || q.includes("decline") || q.includes("error") || q.includes("issue")) {
    const failureOutput = await executeCopilotTool(merchantId, "getFailureHistory", { days: 7 });
    const anomalyOutput = await executeCopilotTool(merchantId, "getRecentAnomalies", { limit: 3 });
    toolCallsExecuted.push({ toolName: "getFailureHistory", toolInput: { days: 7 }, toolOutput: failureOutput });
    toolCallsExecuted.push({ toolName: "getRecentAnomalies", toolInput: { limit: 3 }, toolOutput: anomalyOutput });

    content = `### ⚠️ Payment Failure Analysis (${failureOutput.timeframe})\n\n` +
      `- **Total Failures**: **${failureOutput.totalFailures}**\n` +
      `- **Revenue At Risk**: \`${failureOutput.totalAmountAtRisk}\`\n\n` +
      `#### Failure Patterns\n`;

    const reasons = (failureOutput.byReason as Array<{ reason: string; count: number }>) || [];
    for (const r of reasons) {
      content += `- **${r.reason}**: ${r.count} occurrence(s)\n`;
    }

    content += `\n**System Health**: \`${anomalyOutput.systemHealthScore}\` (${anomalyOutput.systemStatus})\n\n` +
      `> **Recommendation**: Review failed payments in the Recovery Cases dashboard and trigger batch recovery for eligible payments.`;

  } else if (q.includes("anomaly") || q.includes("spike") || q.includes("alert") || q.includes("health")) {
    const toolInput = { limit: 5 };
    const toolOutput = await executeCopilotTool(merchantId, "getRecentAnomalies", toolInput);
    toolCallsExecuted.push({ toolName: "getRecentAnomalies", toolInput, toolOutput });

    const anomalies = (toolOutput.anomalies as Array<Record<string, unknown>>) || [];
    content = `### 🛡️ System Telemetry & Anomaly Report\n\n` +
      `**System Health Score**: \`${toolOutput.systemHealthScore}\` (Status: **${toolOutput.systemStatus}**)\n` +
      `**Active Anomalies**: **${toolOutput.activeAnomaliesCount}** (Critical: ${toolOutput.criticalCount})\n\n`;

    if (anomalies.length === 0) {
      content += `✅ All payment and refund telemetry is currently operating within normal 7-day rolling statistical bounds. No degradation detected.`;
    } else {
      content += `#### Detected Incidents:\n`;
      for (const a of anomalies) {
        content += `- **[${a.severity}] ${String(a.type).toUpperCase()}**: ${a.description} (Deviation: \`${a.deviation}\`)\n`;
      }
      content += `\n> **Recovery Recommendation**: Payment method degradation detected. Consider triggering alternate payment method recovery for affected customers.`;
    }

  } else if (q.includes("method") || q.includes("upi") || q.includes("card") || q.includes("breakdown") || q.includes("performance")) {
    const perfOutput = await executeCopilotTool(merchantId, "getPaymentMethodPerformance", {});
    toolCallsExecuted.push({ toolName: "getPaymentMethodPerformance", toolInput: {}, toolOutput: perfOutput });

    const methods = (perfOutput.methods as Array<Record<string, unknown>>) || [];
    content = `### 💳 Payment Method Performance & Recovery Intelligence\n\n`;
    if (methods.length === 0) {
      content += `No payment method transactions recorded in the past 30 days.`;
    } else {
      content += `| Method | Transactions | Success Rate | Volume | Recovery Recommendation |\n| :--- | :--- | :--- | :--- | :--- |\n`;
      for (const m of methods) {
        const rate = parseFloat(String(m.successRate).replace("%", ""));
        const recommendation = rate < 80 ? "⚠️ Offer alternatives" : "✅ Healthy";
        content += `| **${m.method}** | ${m.totalTransactions} | **${m.successRate}** | \`${m.volume}\` | ${recommendation} |\n`;
      }
    }

  } else if (q.includes("refund") || q.includes("return") || q.includes("chargeback")) {
    const toolInput = { limit: 5 };
    const toolOutput = await executeCopilotTool(merchantId, "getRefundHistory", toolInput);
    toolCallsExecuted.push({ toolName: "getRefundHistory", toolInput, toolOutput });

    content = `### 🔄 Refund Operations & Ledger Debits\n\n` +
      `- **Total Refund Volume**: \`${toolOutput.totalRefundVolume}\`\n` +
      `- **Total Processed Refunds**: **${toolOutput.processedRefunds}** (${toolOutput.partialRefundsCount} Partial / ${toolOutput.fullRefundsCount} Full)\n\n` +
      `Recent refund debits are strictly bound to remaining refundable balances computed from the double-entry ledger.`;

  } else if (q.includes("policy") || q.includes("rule") || q.includes("limit") || q.includes("config")) {
    const policyOutput = await executeCopilotTool(merchantId, "getRecoveryPolicy", {});
    toolCallsExecuted.push({ toolName: "getRecoveryPolicy", toolInput: {}, toolOutput: policyOutput });

    content = `### ⚖️ Recovery Policy Configuration\n\n` +
      `| Parameter | Value |\n| :--- | :--- |\n` +
      `| Max Recovery Attempts | **${policyOutput.maxAttempts}** |\n` +
      `| Max Recovery Amount | \`${policyOutput.maxRecoveryAmount}\` |\n` +
      `| Min Recovery Probability | **${policyOutput.minRecoveryProbability}** |\n` +
      `| Retry Delay | **${policyOutput.retryDelayMinutes} minutes** |\n` +
      `| Expiration Window | **${policyOutput.expirationHours} hours** |\n\n` +
      `> **Note**: These rules are enforced deterministically. The AI agent cannot bypass policy restrictions.`;

  } else {
    // General overview — recovery-focused
    const revOutput = await executeCopilotTool(merchantId, "getRevenueMetrics", { days: 30 });
    const riskOutput = await executeCopilotTool(merchantId, "getRevenueAtRisk", {});
    const metricsOutput = await executeCopilotTool(merchantId, "getRecoveryMetrics", {});
    toolCallsExecuted.push({ toolName: "getRevenueMetrics", toolInput: { days: 30 }, toolOutput: revOutput });
    toolCallsExecuted.push({ toolName: "getRevenueAtRisk", toolInput: {}, toolOutput: riskOutput });
    toolCallsExecuted.push({ toolName: "getRecoveryMetrics", toolInput: {}, toolOutput: metricsOutput });

    content = `### 👋 Lumina Recovery Agent — Operations Summary\n\n` +
      `Here is the latest snapshot for your payment infrastructure:\n\n` +
      `**Revenue (30D)**\n` +
      `- Gross Revenue: \`${revOutput.grossRevenue}\`\n` +
      `- Net Revenue: \`${revOutput.netRevenue}\`\n` +
      `- Success Rate: **${revOutput.successRate}** across ${revOutput.totalTransactions} transactions\n\n` +
      `**Recovery Status**\n` +
      `- Revenue At Risk: \`${riskOutput.totalAtRisk}\` (${riskOutput.eligiblePayments} eligible payments)\n` +
      `- Recovered Revenue: \`${metricsOutput.recoveredRevenue}\`\n` +
      `- Recovery Rate: **${metricsOutput.recoveryRate}**\n` +
      `- Active Cases: **${metricsOutput.activeCases}**\n\n` +
      `You can ask me about **revenue at risk**, **failed payments**, **recovery cases**, **payment method performance**, or **recovery policy**!`;
  }

  return {
    content,
    toolCallsExecuted,
    provider: "deterministic_engine",
  };
}

/**
 * Main Copilot entry point for conversational queries
 */
export async function generateCopilotResponse(
  merchantId: string,
  messages: ChatMessageParam[]
): Promise<CopilotGenerationResult> {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const aiProvider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  const lastUserMessage = messages.filter((m) => m.role === "user").pop()?.content || "";

  // 1. Try Gemini
  if (aiProvider === "gemini" && geminiApiKey && geminiApiKey !== "your-gemini-api-key") {
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      const response = await model.generateContent(lastUserMessage);
      const text = response.response.text();

      return {
        content: text,
        toolCallsExecuted: [],
        provider: "gemini",
      };
    } catch (err) {
      logger.warn("Gemini Copilot generation failed, falling back to deterministic engine", { merchantId }, err);
    }
  }

  // 2. Try OpenAI
  if (aiProvider === "openai" && openaiApiKey && !openaiApiKey.includes("your-")) {
    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          ...messages.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
        ],
      });

      const text = completion.choices[0]?.message?.content || "";
      return {
        content: text,
        toolCallsExecuted: [],
        provider: "openai",
      };
    } catch (err) {
      logger.warn("OpenAI Copilot generation failed, falling back to deterministic engine", { merchantId }, err);
    }
  }

  // 3. Deterministic Grounded Engine
  return generateDeterministicResponse(merchantId, lastUserMessage);
}

// ─── Structured Case Analysis Engine ─────────────────────────────────

export interface RecoveryCaseAnalysisInput {
  caseId: string;
  merchantId: string;
  riskAmount: number; // in paise
  failureType: string;
  failureReason: string | null;
  paymentMethod: string | null;
  attemptCount: number;
  probability: number;
  factors: string[];
  methodPerformance: Array<{ method: string; successRate: number; totalTransactions?: number }>;
  customerHistorySummary?: string;
  riskSummary?: string;
}

/**
 * Untrusted AI Case Analysis for a specific Recovery Case.
 * Produces an advisory AIRecommendation. The output MUST be validated by the Policy Engine.
 */
export async function generateRecoveryCaseAnalysis(
  input: RecoveryCaseAnalysisInput
): Promise<AIRecommendation> {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const aiProvider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  // Deterministic baseline recommendation
  const deterministicFallback = (): AIRecommendation => {
    let recommendedAction: RecoveryActionType = RecoveryActionType.PAYMENT_RETRY;
    const evidenceFactors: string[] = [...input.factors];

    if (input.attemptCount >= 2) {
      recommendedAction = RecoveryActionType.MERCHANT_ESCALATION;
      evidenceFactors.push("Multiple prior attempts failed — escalating to merchant");
    } else if (input.probability >= 0.60) {
      recommendedAction = RecoveryActionType.PAYMENT_RETRY;
      evidenceFactors.push("High recovery probability (>=60%) supports automated payment retry");
    } else if (input.probability >= 0.40) {
      const currentMethod = input.paymentMethod || "upi";
      const betterMethod = input.methodPerformance.find(
        (m) => m.method !== currentMethod && m.successRate > 85
      );
      if (betterMethod) {
        recommendedAction = RecoveryActionType.ALTERNATE_METHOD;
        evidenceFactors.push(
          `Method switch recommended: ${betterMethod.method.toUpperCase()} historical success is ${betterMethod.successRate}%`
        );
      } else {
        recommendedAction = RecoveryActionType.PAYMENT_RETRY;
        evidenceFactors.push("No significantly better alternate payment method found; attempting standard retry");
      }
    } else if (input.probability >= 0.15) {
      recommendedAction = RecoveryActionType.SCHEDULED_RETRY;
      evidenceFactors.push("Low-to-moderate probability (15-40%) — scheduled delay retry recommended");
    } else {
      recommendedAction = RecoveryActionType.MERCHANT_ESCALATION;
      evidenceFactors.push("Recovery probability below automated recovery threshold (<15%) — escalating to merchant");
    }

    return {
      analysis: `Payment failure (${input.failureType}) with ${Math.round(input.probability * 100)}% estimated recovery probability.`,
      rawAnalysis: `Payment failure (${input.failureType}) with ${Math.round(input.probability * 100)}% estimated recovery probability.`,
      recommendedAction,
      confidence: Math.max(0, Math.min(1, input.probability)),
      evidenceFactors,
      reasoning: `Deterministic assessment based on method performance, customer history, and failure reason: ${input.failureReason || "Transaction declined"}.`,
      provider: "deterministic_engine",
      generatedAt: new Date(),
    };
  };

  // If in test mode, immediately return the deterministic fallback
  if (process.env.NODE_ENV === "test") {
    return deterministicFallback();
  }

  const promptText = buildRecoveryAnalysisPrompt({
    caseId: input.caseId,
    riskAmount: `₹${(input.riskAmount / 100).toFixed(2)}`,
    attemptCount: input.attemptCount,
    probability: `${Math.round(input.probability * 100)}%`,
    methodPerformance: JSON.stringify(input.methodPerformance, null, 2),
    failureReason: input.failureReason || "Transaction declined",
    paymentMethod: input.paymentMethod || "unknown",
    customerHistory: input.customerHistorySummary || "Customer historical transactions recorded in database.",
  });

  const parseJsonResponse = (text: string, provider: "gemini" | "openai"): AIRecommendation | null => {
    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/```json\s*|\s*```/gi, "").trim();
      const parsed = JSON.parse(cleaned);

      const actionStr = String(parsed.recommendedAction || "").trim().toUpperCase();
      const validAction = Object.values(RecoveryActionType).includes(actionStr as RecoveryActionType)
        ? (actionStr as RecoveryActionType)
        : null;

      if (!validAction) return null;

      const rawCandidate = {
        analysis: String(parsed.analysis || "AI advisory analysis completed."),
        recommendedAction: validAction,
        confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : input.probability,
        reasoning: String(parsed.reasoning || "AI reasoning generated."),
        evidenceFactors: Array.isArray(parsed.evidenceFactors)
          ? parsed.evidenceFactors.map((f: unknown) => String(f))
          : input.factors,
        alternativeAction: parsed.alternativeAction && Object.values(RecoveryActionType).includes(parsed.alternativeAction)
          ? (parsed.alternativeAction as RecoveryActionType)
          : undefined,
        provider,
        generatedAt: new Date(),
        rawAnalysis: String(parsed.analysis || "AI advisory analysis completed."),
      };

      return validateAIRecommendation(rawCandidate);
    } catch {
      return null;
    }
  };

  // 1. Try Gemini
  if (aiProvider === "gemini" && geminiApiKey && geminiApiKey !== "your-gemini-api-key") {
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent(promptText);
      const text = result.response.text();
      const parsed = parseJsonResponse(text, "gemini");
      if (parsed) return parsed;
    } catch (err) {
      logger.warn("Gemini structured case analysis failed, falling back", { caseId: input.caseId }, err);
    }
  }

  // 2. Try OpenAI
  if (aiProvider === "openai" && openaiApiKey && !openaiApiKey.includes("your-")) {
    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: promptText },
        ],
      });

      const text = completion.choices[0]?.message?.content || "";
      const parsed = parseJsonResponse(text, "openai");
      if (parsed) return parsed;
    } catch (err) {
      logger.warn("OpenAI structured case analysis failed, falling back", { caseId: input.caseId }, err);
    }
  }

  // 3. Fallback to deterministic rules engine
  return deterministicFallback();
}
