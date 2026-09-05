import { NextRequest, NextResponse } from "next/server";
import { MerchantService } from "@/server/services/merchant.service";
import { RecoveryService } from "@/server/services/recovery.service";
import { RecoveryPolicyService } from "@/server/services/recovery-policy.service";
import { inngest } from "@/inngest/client";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const body = await request.json().catch(() => ({}));

    const campaignType =
      body.campaignType ||
      (body.hours && Number(body.hours) > 24 ? "7_DAY_SWEEP" : "24_HOUR_RECOVERY");

    const policy = RecoveryPolicyService.getPolicy();
    const highValueThreshold = policy.highValueApprovalThresholdPaise; // ₹50,000

    // 1. High-Value Review Campaign (Read-Only Scan & Review Queue — NO Auto-Execution)
    if (campaignType === "HIGH_VALUE_REVIEW") {
      const highValueData = await RecoveryService.getHighValueReviewCases(merchant.id);
      const batchId = `hvr_${Date.now()}`;

      return NextResponse.json({
        success: true,
        data: {
          batchId,
          campaignType: "HIGH_VALUE_REVIEW",
          requiresMerchantApproval: true,
          threshold: highValueData.threshold,
          thresholdRupees: highValueData.thresholdRupees,
          count: highValueData.count,
          cases: highValueData.cases,
        },
      });
    }

    // 2. 7-Day Sweep Campaign (Strictly 24h-to-7d Backlog, Standard Tier < ₹50,000)
    if (campaignType === "7_DAY_SWEEP") {
      const now = Date.now();
      const since = new Date(now - 168 * 60 * 60 * 1000); // 7 days ago
      const until = new Date(now - 24 * 60 * 60 * 1000); // 24 hours ago (disjoint from 24h campaign)

      const detectionResult = await RecoveryService.detectAndCreateCases(merchant.id, {
        since,
        until,
        maxAmount: highValueThreshold,
        limit: 100,
      });

      const batchId = `sweep_7d_${Date.now()}`;
      try {
        await inngest.send({
          name: "recovery/batch.started",
          data: {
            merchantId: merchant.id,
            batchId,
            campaignType: "7_DAY_SWEEP",
          },
        });
      } catch (inngestErr) {
        logger.warn("Failed to dispatch 7-day sweep Inngest event", {}, inngestErr);
      }

      return NextResponse.json({
        success: true,
        data: {
          batchId,
          campaignType: "7_DAY_SWEEP",
          timeframeHours: 168,
          ...detectionResult,
        },
      });
    }

    // 3. 24-Hour Recovery Campaign (Strictly Last 24 Hours, Standard Tier < ₹50,000)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const detectionResult = await RecoveryService.detectAndCreateCases(merchant.id, {
      since,
      maxAmount: highValueThreshold,
      limit: 100,
    });

    const batchId = `rec_24h_${Date.now()}`;
    try {
      await inngest.send({
        name: "recovery/batch.started",
        data: {
          merchantId: merchant.id,
          batchId,
          campaignType: "24_HOUR_RECOVERY",
        },
      });
    } catch (inngestErr) {
      logger.warn("Failed to dispatch 24h recovery Inngest event", {}, inngestErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        batchId,
        campaignType: "24_HOUR_RECOVERY",
        timeframeHours: 24,
        ...detectionResult,
      },
    });
  } catch (error) {
    logger.error("Failed to trigger batch recovery", {}, error);
    return NextResponse.json(
      { success: false, error: "Failed to trigger batch recovery" },
      { status: 500 }
    );
  }
}
