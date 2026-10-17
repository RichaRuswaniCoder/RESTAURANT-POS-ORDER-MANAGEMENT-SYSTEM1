

import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  FRONTEND_ORIGINS: z.string().default("http://localhost:3000"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .refine((secret) => !secret.startsWith("replace_with_"), "Replace the JWT_SECRET example placeholder before starting the backend"),

  // Tax percentage configured by the restaurant
  BILLING_TAX_RATE: z.coerce
    .number()
    .min(0)
    .max(100)
    .default(0),

  // Maximum discount percentage allowed by the application
  MAX_DISCOUNT_PERCENT: z.coerce
    .number()
    .min(0)
    .max(100)
    .default(10)
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Invalid environment settings:",
    result.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = result.data;


