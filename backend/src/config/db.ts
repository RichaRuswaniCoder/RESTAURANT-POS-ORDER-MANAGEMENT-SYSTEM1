
import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";

    console.error("MongoDB connection failed:", message);
    throw error;
  }
}
