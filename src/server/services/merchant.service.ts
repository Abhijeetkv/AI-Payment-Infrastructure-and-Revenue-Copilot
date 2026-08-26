import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export class MerchantService {
  /**
   * Resolves or creates a default demo merchant for development and testing
   */
  static async getOrCreateDefaultMerchant(userId?: string) {
    try {
      if (userId) {
        const existing = await db.merchant.findUnique({
          where: { userId },
        });
        if (existing) return existing;
      }

      // Check if any merchant exists
      const firstMerchant = await db.merchant.findFirst();
      if (firstMerchant) return firstMerchant;

      // Ensure a system demo user exists first
      let demoUser = await db.user.findFirst({
        where: { email: "demo@paymentcopilot.io" },
      });

      if (!demoUser) {
        demoUser = await db.user.create({
          data: {
            name: "Demo Merchant",
            email: "demo@paymentcopilot.io",
            emailVerified: true,
          },
        });
      }

      // Create initial merchant
      const merchant = await db.merchant.create({
        data: {
          userId: demoUser.id,
          name: "Acme Payments Demo",
          email: "merchant@paymentcopilot.io",
          isActive: true,
        },
      });

      logger.info("Created default merchant", { merchantId: merchant.id });
      return merchant;
    } catch (error) {
      logger.error("Failed to get or create default merchant", {}, error);
      throw error;
    }
  }
}
