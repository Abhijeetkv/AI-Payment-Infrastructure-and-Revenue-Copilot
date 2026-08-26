import { NextRequest, NextResponse } from "next/server";
import { CopilotService } from "@/server/services/copilot.service";
import { MerchantService } from "@/server/services/merchant.service";
import { AppError } from "@/server/errors";

export async function GET() {
  try {
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const conversations = await CopilotService.listConversations(merchant.id);

    return NextResponse.json({
      success: true,
      data: conversations,
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
          message: error instanceof Error ? error.message : "Failed to list conversations",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const conversation = await CopilotService.createConversation(
      merchant.id,
      body.title
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
          message: error instanceof Error ? error.message : "Failed to create conversation",
        },
      },
      { status: 500 }
    );
  }
}
