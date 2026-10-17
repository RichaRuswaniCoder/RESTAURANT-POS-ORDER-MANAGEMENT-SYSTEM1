
import type { ErrorRequestHandler } from "express";

const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next
) => {
  console.error("API error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
};

export default errorHandler;
