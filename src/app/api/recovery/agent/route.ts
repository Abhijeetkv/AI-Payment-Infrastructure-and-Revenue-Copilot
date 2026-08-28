import { NextRequest, NextResponse } from "next/server";
import { MerchantService } from "@/server/services/merchant.service";
import { RecoveryService } from "@/server/services/recovery.service";
import { generateCopilotResponse } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const activity = await RecoveryService.getAgentActivity(merchant.id, limit);

    return NextResponse.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    logger.error("Failed to fetch agent activity", {}, error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch agent activity" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const body = await request.json();

    const { prompt, caseId } = body;

    let queryText = prompt || "Analyze current revenue at risk and recommend recovery actions.";
    if (caseId) {
      const caseItem = await RecoveryService.getRecoveryCase(merchant.id, caseId);
      queryText = `Analyze recovery case ${caseId} (Amount: ₹${(caseItem.riskAmount / 100).toLocaleString("en-IN")}, Method: ${caseItem.paymentMethod || "unknown"}, Failure: ${caseItem.failureReason || "unknown"}). Recommend best recovery action.`;
    }

    const aiResponse = await generateCopilotResponse(merchant.id, [
      { role: "user", content: queryText },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        analysis: aiResponse.content,
        toolCalls: aiResponse.toolCallsExecuted,
        provider: aiResponse.provider,
      },
    });
  } catch (error) {
    logger.error("Failed to execute agent analysis", {}, error);
    return NextResponse.json(
      { success: false, error: "Agent analysis failed" },
      { status: 500 }
    );
  }
}
