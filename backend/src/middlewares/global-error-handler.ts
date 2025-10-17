import { NextFunction, Request, Response } from "express";

export default function globalErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) : Response | void {
  console.error("Error:", err.stack);

  return res.status((err as any).status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};