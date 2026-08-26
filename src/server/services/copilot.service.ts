import { db } from "@/lib/db";
import { generateCopilotResponse, ChatMessageParam } from "@/lib/ai/client";
import { AIMessageRole, type Prisma } from "@prisma/client";
import { NotFoundError } from "@/server/errors";
import { logger } from "@/lib/logger";

export class CopilotService {
  /**
   * Creates a new conversation thread
   */
  static async createConversation(merchantId: string, title?: string) {
    const conversation = await db.aIConversation.create({
      data: {
        merchantId,
        title: title || "New Conversation",
      },
    });

    return conversation;
  }

  /**
   * Lists all conversations for the merchant
   */
  static async listConversations(merchantId: string) {
    return await db.aIConversation.findMany({
      where: { merchantId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  /**
   * Fetches a conversation along with its full message history
   */
  static async getConversationWithMessages(merchantId: string, conversationId: string) {
    const conversation = await db.aIConversation.findFirst({
      where: {
        id: conversationId,
        merchantId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError(`Conversation ${conversationId} not found`);
    }

    return conversation;
  }

  /**
   * Deletes a conversation thread and its messages
   */
  static async deleteConversation(merchantId: string, conversationId: string) {
    const conversation = await db.aIConversation.findFirst({
      where: {
        id: conversationId,
        merchantId,
      },
    });

    if (!conversation) {
      throw new NotFoundError(`Conversation ${conversationId} not found`);
    }

    await db.aIConversation.delete({
      where: { id: conversationId },
    });

    return { success: true };
  }

  /**
   * Sends a user message, executes AI tool calling, stores all messages, and returns the response
   */
  static async chat(merchantId: string, params: { conversationId?: string; message: string }) {
    const { message } = params;

    // 1. Get or create conversation thread
    let conversationId = params.conversationId;
    if (!conversationId) {
      // Auto-generate title from first 6 words of message
      const title = message.slice(0, 40) + (message.length > 40 ? "..." : "");
      const newConv = await this.createConversation(merchantId, title);
      conversationId = newConv.id;
    }

    // 2. Fetch existing history for context
    const existingMessages = await db.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    const chatHistory: ChatMessageParam[] = existingMessages.map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant" | "system" | "tool",
      content: m.content || "",
    }));

    // Append new user message
    chatHistory.push({ role: "user", content: message });

    // 3. Store User message in database
    await db.aIMessage.create({
      data: {
        conversationId,
        role: AIMessageRole.USER,
        content: message,
      },
    });

    // 4. Generate AI response with grounded tool-calling
    const aiResult = await generateCopilotResponse(merchantId, chatHistory);

    // 5. Store any executed Tool messages
    for (const tool of aiResult.toolCallsExecuted) {
      await db.aIMessage.create({
        data: {
          conversationId,
          role: AIMessageRole.TOOL,
          toolName: tool.toolName,
          toolInput: tool.toolInput as unknown as Prisma.InputJsonValue,
          toolOutput: tool.toolOutput as unknown as Prisma.InputJsonValue,
          content: JSON.stringify(tool.toolOutput),
        },
      });
    }

    // 6. Store Assistant message in database
    const assistantMessage = await db.aIMessage.create({
      data: {
        conversationId,
        role: AIMessageRole.ASSISTANT,
        content: aiResult.content,
      },
    });

    // Touch conversation updatedAt
    await db.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    logger.info("Copilot generation completed", {
      conversationId,
      provider: aiResult.provider,
      toolCallsCount: aiResult.toolCallsExecuted.length,
    });

    return {
      conversationId,
      message: assistantMessage,
      toolCalls: aiResult.toolCallsExecuted,
      provider: aiResult.provider,
    };
  }
}
