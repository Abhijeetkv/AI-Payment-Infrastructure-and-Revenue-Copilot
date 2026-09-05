import { z } from "zod";
import { RecoveryActionType } from "@prisma/client";
import type { AIRecommendation } from "./types";

/**
 * Strict runtime schema for AI Recommendation outputs.
 * Enforces that:
 * 1. AI cannot produce authoritative fields (e.g. approved, policyPassed, verifiedAmount)
 * 2. Actions must belong strictly to the RecoveryActionType enum
 * 3. Confidence is clamped strictly between 0.0 and 1.0
 */
export const AIRecommendationSchema = z
  .object({
    analysis: z.string().min(1).max(2000).default("AI analysis completed."),
    recommendedAction: z.nativeEnum(RecoveryActionType),
    confidence: z.number().min(0).max(1).default(0.5),
    reasoning: z.string().min(1).max(3000).default("AI reasoning generated."),
    evidenceFactors: z.array(z.string().max(500)).max(20).default([]),
    alternativeAction: z.nativeEnum(RecoveryActionType).optional(),
    provider: z.enum(["gemini", "openai", "deterministic_engine"]).default("deterministic_engine"),
    generatedAt: z.coerce.date().default(() => new Date()),
    rawAnalysis: z.string().optional(),
    // Forbidden authoritative fields explicitly disallowed / stripped
    approved: z.never().optional(),
    safeToExecute: z.never().optional(),
    policyPassed: z.never().optional(),
    verifiedAmount: z.never().optional(),
    ledgerCredit: z.never().optional(),
  })
  .strict(); // Strict mode rejects unrecognized or forbidden fields

/**
 * Runtime schema for client-facing recovery action execution API
 */
export const RecoveryActionRequestSchema = z.object({
  actionType: z.nativeEnum(RecoveryActionType),
  isMerchantApproved: z.boolean().optional().default(false),
  merchantNote: z.string().max(500).optional(),
});

/**
 * Validate and safely parse an untrusted AI response payload
 */
export function validateAIRecommendation(raw: unknown): AIRecommendation | null {
  try {
    const parsed = AIRecommendationSchema.safeParse(raw);
    if (!parsed.success) {
      return null;
    }
    return parsed.data as AIRecommendation;
  } catch {
    return null;
  }
}
