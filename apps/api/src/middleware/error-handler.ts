import type { ErrorRequestHandler } from "express";
import { logger } from "@dam/logger";
import { HttpError } from "../utils/http-error.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  logger.error({ err: error }, "Request failed");

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  res.status(400).json({
    success: false,
    error: {
      message: error instanceof Error ? error.message : "Unknown error"
    }
  });
};
