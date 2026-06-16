import express, { type Router } from "express";
import helmet from "helmet";
import cors, { type CorsOptions } from "cors";
import { createAssetRouter } from "./routes/assets.js";
import { createAuthRouter } from "./routes/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { setupSwagger } from "./swagger.js";

export interface AppOptions {
  authRouter?: Router;
  assetRouter?: Router;
}

function getAllowedCorsOrigins() {
  const webPort = process.env.WEB_PORT ?? "5173";
  const defaults = [`http://localhost:${webPort}`, `http://127.0.0.1:${webPort}`];
  const configured = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([...defaults, ...configured]);
}

export function createCorsOptions(): CorsOptions {
  const allowedOrigins = getAllowedCorsOrigins();

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    }
  };
}

export function createApp(options: AppOptions = {}) {
  const app = express();

  app.use(helmet());
  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: process.env.MAX_JSON_PAYLOAD_SIZE ?? "10mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "api" });
  });

  setupSwagger(app);

  app.use("/auth", options.authRouter ?? createAuthRouter());
  app.use("/assets", options.assetRouter ?? createAssetRouter());
  app.use(errorHandler);

  return app;
}
