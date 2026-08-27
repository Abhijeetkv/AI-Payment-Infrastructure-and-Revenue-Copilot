import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    autoSignIn: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await db.merchant.upsert({
              where: { userId: user.id },
              update: {},
              create: {
                userId: user.id,
                name: `${user.name || "Merchant"}'s Business`,
                email: user.email,
                isActive: true,
              },
            });
          } catch (err) {
            console.error("Merchant auto-creation hook error:", err);
          }
        },
      },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || "development-secret-must-be-at-least-32-chars-long",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

