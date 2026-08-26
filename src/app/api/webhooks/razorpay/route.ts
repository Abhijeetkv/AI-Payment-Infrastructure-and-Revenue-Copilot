import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature, extractWebhookEvent } from "@/lib/razorpay/webhooks";
import { inngest } from "@/inngest/client";
import { logger } from "@/lib/logger";
import { WebhookStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    // 1. Signature Verification
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, secret);
      if (!isValid) {
        logger.warn("Invalid webhook signature rejected", { signature });
        return NextResponse.json(
          { success: false, error: "Invalid webhook signature" },
          { status: 400 }
        );
      }
    }

    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const event = extractWebhookEvent(parsedBody);
    if (!event) {
      return NextResponse.json(
        { success: false, error: "Malformed webhook payload" },
        { status: 400 }
      );
    }

    // 2. Deduplication check via database
    const existing = await db.webhookEvent.findUnique({
      where: { eventId: event.eventId },
    });

    if (existing) {
      logger.info("Duplicate webhook event skipped", {
        eventId: event.eventId,
        eventType: event.eventType,
      });
      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          message: "Event already processed or recorded",
        },
        { status: 200 }
      );
    }

    // Find default or associated merchant
    const firstMerchant = await db.merchant.findFirst();

    // 3. Persist WebhookEvent in database
    const webhookRecord = await db.webhookEvent.create({
      data: {
        eventId: event.eventId,
        eventType: event.eventType,
        payload: JSON.parse(JSON.stringify(event.payload)),
        status: WebhookStatus.RECEIVED,
        merchantId: firstMerchant?.id,
      },
    });

    logger.info("Webhook event persisted", {
      id: webhookRecord.id,
      eventId: event.eventId,
      eventType: event.eventType,
    });

    // 4. Dispatch Inngest Event for asynchronous, durable processing
    try {
      await inngest.send({
        name: "webhook/received",
        data: {
          webhookEventId: webhookRecord.id,
        },
      });
    } catch (inngestErr) {
      logger.warn(
        "Failed to dispatch inngest event for webhook",
        { webhookEventId: webhookRecord.id },
        inngestErr
      );
    }

    // 5. Fast 200 OK Response
    return NextResponse.json({
      success: true,
      received: true,
      id: webhookRecord.id,
      eventId: event.eventId,
    });
  } catch (error) {
    logger.error("Unhandled webhook processing error", {}, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const webhooks = await db.webhookEvent.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: webhooks,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list webhooks",
      },
      { status: 500 }
    );
  }
}
