import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDatabase } from "../config/db.js";
import { UserModel } from "../models/user.js";

const staffSchema = z.object({
  STAFF_NAME: z.string().trim().min(2).max(80),
  STAFF_EMAIL: z.string().trim().email().transform((email) => email.toLowerCase()),
  STAFF_PASSWORD: z.string().min(12).max(72).refine((password) => !password.startsWith("replace_with_"), "Replace the placeholder with your own strong password")
});

async function createStaff(): Promise<void> {
  const result = staffSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error("Set STAFF_NAME, STAFF_EMAIL, and STAFF_PASSWORD in backend/.env. The password must be 12–72 characters.");
  }
  await connectDatabase();
  const existing = await UserModel.findOne({ email: result.data.STAFF_EMAIL });
  if (existing) throw new Error("A user with this email already exists. No account was changed.");
  const passwordHash = await bcrypt.hash(result.data.STAFF_PASSWORD, 12);
  await UserModel.create({
    name: result.data.STAFF_NAME,
    email: result.data.STAFF_EMAIL,
    passwordHash,
    role: "staff",
    isActive: true
  });
  console.log(`Staff account created for ${result.data.STAFF_EMAIL}.`);
}

void createStaff()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Staff setup failed.");
    process.exitCode = 1;
  })
  .finally(async () => { await mongoose.disconnect(); });
