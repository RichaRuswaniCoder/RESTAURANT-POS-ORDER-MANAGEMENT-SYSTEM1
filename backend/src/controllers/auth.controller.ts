import type { RequestHandler } from "express";
import { loginSchema } from "../validators/auth.schema.js";
import { loginUser } from "../services/auth.service.js";
import { UserModel } from "../models/user.js";

// Separate production hosts require SameSite=None; Secure. Local HTTP development uses Lax.
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  path: "/"
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Invalid login details",
        errors: result.error.flatten().fieldErrors
      });
      return;
    }

    const authenticatedUser = await loginUser(result.data.email, result.data.password);
    if (!authenticatedUser) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const { token, user } = authenticatedUser;
    res.cookie("accessToken", token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
    res.status(200).json({ success: true, message: "Login successful", data: { user } });
  } catch (error) {
    next(error);
  }
};

// Session endpoint used by the dashboard to detect login state after redirects/reloads.
export const getCurrentUser: RequestHandler = async (_req, res, next) => {
  try {
    const auth = res.locals.auth as { userId: string; role: string } | undefined;
    if (!auth?.userId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const user = await UserModel.findById(auth.userId).select("name email role isActive");
    if (!user || !user.isActive) {
      res.clearCookie("accessToken", cookieOptions);
      res.status(401).json({ success: false, message: "Session is no longer valid" });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role } }
    });
  } catch (error) {
    next(error);
  }
};

export const logout: RequestHandler = (_req, res) => {
  res.clearCookie("accessToken", cookieOptions);
  res.status(200).json({ success: true, message: "Logout successful" });
};
