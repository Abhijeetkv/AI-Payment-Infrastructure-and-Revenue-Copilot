import { NextRequest, NextResponse } from "next/server";
import { CopilotService } from "@/server/services/copilot.service";
import { MerchantService } from "@/server/services/merchant.service";
import { copilotMessageSchema } from "@/server/validators";
import { AppError } from "@/server/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = copilotMessageSchema.parse(body);

    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const result = await CopilotService.chat(merchant.id, {
      conversationId: validated.conversationId,
      message: validated.message,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to process Copilot query",
        },
      },
      { status: 500 }
    );
  }
}
