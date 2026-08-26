import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET || "development-secret-must-be-at-least-32-chars-long",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});
