import pino from "pino";

export const logger = pino({
  name: "dam-platform",
  level: process.env.LOG_LEVEL ?? "info"
});

export type AppLogger = typeof logger;
