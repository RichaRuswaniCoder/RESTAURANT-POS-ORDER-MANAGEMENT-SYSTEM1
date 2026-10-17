
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";

import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { UserModel } from "../models/user.js";

const adminSchema = z.object({
  ADMIN_NAME: z.string().trim().min(2).max(80),
  ADMIN_EMAIL: z.string().trim().email().transform(
    (email) => email.toLowerCase()
  ),
  ADMIN_PASSWORD: z.string().min(12).max(72).refine((password) => !password.startsWith("replace_with_"), "Replace the placeholder with your own strong password")
});

async function createAdmin(): Promise<void> {
  const result = adminSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      "Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in backend/.env. " +
      "The password must be between 12 and 72 characters."
    );
  }

  const admin = result.data;

  await connectDatabase();

  const existingUser = await UserModel.findOne({
    email: admin.ADMIN_EMAIL
  });

  if (existingUser) {
    throw new Error(
      "A user with this email already exists. No account was changed."
    );
  }

  const passwordHash = await bcrypt.hash(admin.ADMIN_PASSWORD, 12);

  await UserModel.create({
    name: admin.ADMIN_NAME,
    email: admin.ADMIN_EMAIL,
    passwordHash,
    role: "admin",
    isActive: true
  });

  console.log(`Admin account created for ${admin.ADMIN_EMAIL}.`);
}

void createAdmin()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Admin setup failed."
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
