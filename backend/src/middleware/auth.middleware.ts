
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const authenticate: RequestHandler = (req, res, next) => {
  // Read JWT from the HttpOnly cookie first,
  // then fall back to the Authorization header.
  const authorization = req.headers.authorization;
  const token =
    req.cookies?.accessToken ||
    (authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "");

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication token required"
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      typeof decoded.role !== "string" ||
      !["admin", "staff"].includes(decoded.role)
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token"
      });
      return;
    }

    res.locals.auth = {
      userId: decoded.sub,
      role: decoded.role
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token"
    });
  }
};

export const requireAdmin: RequestHandler = (_req, res, next) => {
  const auth = res.locals.auth as
    | { userId: string; role: string }
    | undefined;

  if (auth?.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Admin access required"
    });
    return;
  }

  next();
};

