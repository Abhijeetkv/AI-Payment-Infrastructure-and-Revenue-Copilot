import { NextResponse } from "next/server";
import { MerchantService } from "@/server/services/merchant.service";
import { RevenueRiskService } from "@/server/services/revenue-risk.service";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const merchant = await MerchantService.getOrCreateDefaultMerchant();

    const [metrics, riskBreakdown, methodPerformance] = await Promise.all([
      RevenueRiskService.getRecoveryMetrics(merchant.id),
      RevenueRiskService.getRevenueAtRisk(merchant.id),
      RevenueRiskService.getPaymentMethodPerformance(merchant.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        riskBreakdown,
        methodPerformance,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch recovery metrics", {}, error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch recovery metrics" },
      { status: 500 }
    );
  }
}
