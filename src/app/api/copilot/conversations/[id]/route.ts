import { NextRequest, NextResponse } from "next/server";
import { CopilotService } from "@/server/services/copilot.service";
import { MerchantService } from "@/server/services/merchant.service";
import { AppError } from "@/server/errors";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const conversation = await CopilotService.getConversationWithMessages(
      merchant.id,
      id
    );

    return NextResponse.json({
      success: true,
      data: conversation,
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
          message: error instanceof Error ? error.message : "Failed to fetch conversation",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const result = await CopilotService.deleteConversation(merchant.id, id);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to delete conversation",
        },
      },
      { status: 500 }
    );
  }
}
