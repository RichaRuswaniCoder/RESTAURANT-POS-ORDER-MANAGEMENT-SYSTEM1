
import type { RequestHandler } from "express";

const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
};

export default notFound;
