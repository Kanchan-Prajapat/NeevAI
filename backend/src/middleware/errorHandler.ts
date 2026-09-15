// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";

// Centralized error handling middleware
export default function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ status: "error", message });
}
