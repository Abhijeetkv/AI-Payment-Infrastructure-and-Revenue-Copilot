import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { executeCopilotTool } from "./tools";
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

const SYSTEM_INSTRUCTION = `You are "Revenue Copilot", an elite financial operations and payment intelligence assistant embedded inside a merchant's payment infrastructure.
Your job is to provide precise, actionable, and grounded answers about merchant revenue, transactions, double-entry financial ledgers, refunds, payment methods, and statistical anomalies.

STRICT OPERATIONAL RULES:
1. Never hallucinate financial numbers. Sourced facts must come directly from database tool calls.
2. Financial figures should be clearly presented with Indian Rupee formatting (e.g. ₹12,450.00).
3. Always explain the "why" behind trends (e.g. why net revenue differs from gross revenue due to refund debits).
4. Provide structured, clean Markdown with bullet points, metric tables, and concise summaries.
5. If an anomaly or failure spike is detected, provide recommended operational mitigation steps.`;

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

  if (q.includes("revenue") || q.includes("gross") || q.includes("net") || q.includes("sales") || q.includes("earnings")) {
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
  } else if (q.includes("anomaly") || q.includes("spike") || q.includes("alert") || q.includes("issue") || q.includes("fail") || q.includes("health")) {
    const toolInput = { limit: 5 };
    const toolOutput = await executeCopilotTool(merchantId, "getRecentAnomalies", toolInput);
    toolCallsExecuted.push({ toolName: "getRecentAnomalies", toolInput, toolOutput });

    const anomalies = (toolOutput.anomalies as Array<Record<string, unknown>>) || [];
    content = `### 🛡️ System Telemetry & Anomaly Report\n\n` +
      `**System Health Score**: \`${toolOutput.systemHealthScore}\` (Status: **${toolOutput.systemStatus}**)\n` +
      `**Active Anomalies**: **${toolOutput.activeAnomaliesCount}** (Critical: ${toolOutput.criticalCount})\n\n`;

    if (anomalies.length === 0) {
      content += `✅ All payment and refund telemetry is currently operating within normal 7-day rolling statistical bounds ($z < 1.4$). No degradation detected.`;
    } else {
      content += `#### Detected Incidents:\n`;
      for (const a of anomalies) {
        content += `- **[${a.severity}] ${String(a.type).toUpperCase()}**: ${a.description} (Deviation: \`${a.deviation}\`)\n`;
      }
      content += `\n> **Recommended Action**: Inspect upstream payment gateway responses or bank networks for UPI timeout codes.`;
    }
  } else if (q.includes("refund") || q.includes("return") || q.includes("chargeback")) {
    const toolInput = { limit: 5 };
    const toolOutput = await executeCopilotTool(merchantId, "getRefundHistory", toolInput);
    toolCallsExecuted.push({ toolName: "getRefundHistory", toolInput, toolOutput });

    content = `### 🔄 Refund Operations & Ledger Debits\n\n` +
      `- **Total Refund Volume**: \`${toolOutput.totalRefundVolume}\`\n` +
      `- **Total Processed Refunds**: **${toolOutput.processedRefunds}** (${toolOutput.partialRefundsCount} Partial / ${toolOutput.fullRefundsCount} Full)\n\n` +
      `Recent refund debits are strictly bound to remaining refundable balances computed from the double-entry ledger.`;
  } else if (q.includes("method") || q.includes("upi") || q.includes("card") || q.includes("breakdown") || q.includes("share")) {
    const toolInput = { days: 30 };
    const toolOutput = await executeCopilotTool(merchantId, "getMethodBreakdown", toolInput);
    toolCallsExecuted.push({ toolName: "getMethodBreakdown", toolInput, toolOutput });

    const breakdown = (toolOutput.breakdown as Array<Record<string, unknown>>) || [];
    content = `### 💳 Payment Method Distribution & Conversion\n\n`;
    if (breakdown.length === 0) {
      content += `No payment method transactions recorded in the past 30 days.`;
    } else {
      content += `| Method | Market Share | Processed Volume | Success Rate |\n| :--- | :--- | :--- | :--- |\n`;
      for (const b of breakdown) {
        content += `| **${b.method}** | ${b.marketShare} | \`${b.volume}\` | **${b.successRate}** |\n`;
      }
    }
  } else {
    // General overview
    const revOutput = await executeCopilotTool(merchantId, "getRevenueMetrics", { days: 30 });
    const anomalyOutput = await executeCopilotTool(merchantId, "getRecentAnomalies", { limit: 3 });
    toolCallsExecuted.push({ toolName: "getRevenueMetrics", toolInput: { days: 30 }, toolOutput: revOutput });
    toolCallsExecuted.push({ toolName: "getRecentAnomalies", toolInput: { limit: 3 }, toolOutput: anomalyOutput });

    content = `### 👋 Revenue Copilot Operations Summary\n\n` +
      `Here is the latest snapshot for your payment infrastructure:\n\n` +
      `- **Gross Revenue (30D)**: \`${revOutput.grossRevenue}\`\n` +
      `- **Net Revenue (30D)**: \`${revOutput.netRevenue}\`\n` +
      `- **Success Rate**: **${revOutput.successRate}** across ${revOutput.totalTransactions} transactions\n` +
      `- **System Health**: \`${anomalyOutput.systemHealthScore}\` (${anomalyOutput.activeAnomaliesCount} active anomaly alerts)\n\n` +
      `You can ask me specific questions about **revenue trends**, **failed payments**, **refund limits**, or **payment method breakdowns**!`;
  }

  return {
    content,
    toolCallsExecuted,
    provider: "deterministic_engine",
  };
}

/**
 * Executes a conversational AI generation turn using Google Gemini, OpenAI, or the deterministic fallback
 */
export async function generateCopilotResponse(
  merchantId: string,
  messages: ChatMessageParam[]
): Promise<CopilotGenerationResult> {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const aiProvider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const lastUserMsg = messages[messages.length - 1]?.content || "";

  // 1. Google Gemini Provider
  if (aiProvider === "gemini" && geminiApiKey && geminiApiKey !== "your-gemini-api-key") {
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      // Execute appropriate tools based on user prompt context first
      const toolOutput = await generateDeterministicResponse(merchantId, lastUserMsg);

      const prompt = `Context data retrieved from merchant database:\n${JSON.stringify(
        toolOutput.toolCallsExecuted.map((t) => ({ tool: t.toolName, result: t.toolOutput })),
        null,
        2
      )}\n\nUser Question: ${lastUserMsg}\n\nPlease provide a clear, professional, and formatted response using this factual data.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      return {
        content: text || toolOutput.content,
        toolCallsExecuted: toolOutput.toolCallsExecuted,
        provider: "gemini",
      };
    } catch (err) {
      logger.warn("Gemini API call failed, falling back to deterministic engine", {}, err);
    }
  }

  // 2. OpenAI Provider
  if (aiProvider === "openai" && openaiApiKey && !openaiApiKey.includes("your-")) {
    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const toolOutput = await generateDeterministicResponse(merchantId, lastUserMsg);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          {
            role: "user",
            content: `Context data retrieved from merchant database:\n${JSON.stringify(
              toolOutput.toolCallsExecuted.map((t) => ({ tool: t.toolName, result: t.toolOutput })),
              null,
              2
            )}\n\nUser Question: ${lastUserMsg}`,
          },
        ],
      });

      const text = completion.choices[0]?.message?.content;
      return {
        content: text || toolOutput.content,
        toolCallsExecuted: toolOutput.toolCallsExecuted,
        provider: "openai",
      };
    } catch (err) {
      logger.warn("OpenAI API call failed, falling back to deterministic engine", {}, err);
    }
  }

  // 3. Fallback Deterministic Engine (Always reliable, verified against real database)
  return await generateDeterministicResponse(merchantId, lastUserMsg);
}
