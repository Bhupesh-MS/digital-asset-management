import test from "node:test";
import assert from "node:assert/strict";
import { Router } from "express";
import request from "supertest";
import bcrypt from "bcryptjs";
import multer from "multer";
import { AuthController } from "../controllers/auth.controller.js";
import { AssetsController } from "../controllers/assets.controller.js";
import { AnalyticsController } from "../controllers/analytics.controller.js";
import { AuthService } from "../services/auth.service.js";
import { JwtService } from "../services/jwt.service.js";
import { AssetService } from "../services/asset.service.js";
import { AnalyticsService } from "../services/analytics.service.js";
import { requireAdmin } from "../middleware/auth.middleware.js";
import type { AssetDto } from "@dam/shared-types";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/dam";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
process.env.MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? "localhost";
process.env.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? "minio";
process.env.MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY ?? "minio123";

const jwtService = new JwtService("test-secret", "1h");

async function createTestApp(options: { authRouter: Router; assetRouter: Router }) {
  const { createApp } = await import("../app.js");
  return createApp(options);
}

test("POST /auth/login validates body", async () => {
  const app = await createTestApp({
    authRouter: createTestAuthRouter(),
    assetRouter: Router()
  });

  const response = await request(app).post("/auth/login").send({ id: "not-email", password: "" });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /auth/login returns a JWT for an admin", async () => {
  const app = await createTestApp({
    authRouter: createTestAuthRouter(),
    assetRouter: Router()
  });

  const response = await request(app).post("/auth/login").send({ id: "admin@example.com", password: "secret" });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.user.role, "ADMIN");
  assert.equal(typeof response.body.data.token, "string");
});

test("POST /assets uploads multiple files and queues processing", async () => {
  const queueJobs: unknown[] = [];
  const storedObjects: string[] = [];
  const app = await createTestApp({
    authRouter: Router(),
    assetRouter: createTestAssetRouter({ queueJobs, storedObjects })
  });

  const response = await request(app)
    .post("/assets")
    .field("tags", "campaign,summer")
    .attach("files", Buffer.from("image-content"), {
      filename: "Hero Banner.jpg",
      contentType: "image/jpeg"
    })
    .attach("files", Buffer.from("video-content"), {
      filename: "Launch Video.mp4",
      contentType: "video/mp4"
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.assets.length, 2);
  assert.equal(queueJobs.length, 2);
  assert.equal(storedObjects.length, 2);
  assert.deepEqual(response.body.data.assets[0].tags.includes("campaign"), true);
});

test("GET /assets returns five-item pagination metadata", async () => {
  const app = await createTestApp({
    authRouter: Router(),
    assetRouter: createTestAssetRouter()
  });

  const response = await request(app).get("/assets?page=1&type=IMAGE&search=hero");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.pagination.perPage, 5);
  assert.equal(response.body.data.assets.length, 1);
});

test("GET /assets allows local frontend CORS origins", async () => {
  const app = await createTestApp({
    authRouter: Router(),
    assetRouter: createTestAssetRouter()
  });

  const response = await request(app).get("/assets?page=1&limit=5").set("Origin", "http://127.0.0.1:5173");

  assert.equal(response.status, 200);
  assert.equal(response.headers["access-control-allow-origin"], "http://127.0.0.1:5173");
});

test("GET /assets/analytics requires admin JWT", async () => {
  const app = await createTestApp({
    authRouter: Router(),
    assetRouter: createTestAssetRouter()
  });

  const unauthorized = await request(app).get("/assets/analytics");
  assert.equal(unauthorized.status, 401);

  const token = jwtService.sign({ userId: "user_1", email: "admin@example.com", role: "ADMIN" });
  const authorized = await request(app).get("/assets/analytics").set("Authorization", `Bearer ${token}`);

  assert.equal(authorized.status, 200);
  assert.equal(authorized.body.success, true);
  assert.equal(authorized.body.data.totals.uploads, 0);
});

test("GET /assets/shared/:token returns asset and presigned url for valid token", async () => {
  const app = await createTestApp({
    authRouter: Router(),
    assetRouter: createTestAssetRouter()
  });

  const response = await request(app).get("/assets/shared/valid-token");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.asset.id, "asset_existing");
  assert.equal(typeof response.body.data.url, "string");
  assert.equal(response.body.data.url.includes("hero.jpg"), true);
});

test("GET /assets/shared/:token returns 404 for expired token", async () => {
  const app = await createTestApp({
    authRouter: Router(),
    assetRouter: createTestAssetRouter()
  });

  const response = await request(app).get("/assets/shared/expired-token");

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
});

test("GET /assets/shared/:token returns 404 for invalid token", async () => {
  const app = await createTestApp({
    authRouter: Router(),
    assetRouter: createTestAssetRouter()
  });

  const response = await request(app).get("/assets/shared/invalid-token");

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
});

test("GET /assets/:id/download returns presigned URL for valid asset", async () => {
  const app = await createTestApp({
    authRouter: Router(),
    assetRouter: createTestAssetRouter()
  });

  const response = await request(app).get("/assets/asset_existing/download");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.assetId, "asset_existing");
  assert.equal(typeof response.body.data.url, "string");
  assert.equal(response.body.data.url.includes("hero.jpg"), true);
});

test("GET /assets/:id/download returns 404 for invalid asset", async () => {
  const app = await createTestApp({
    authRouter: Router(),
    assetRouter: createTestAssetRouter()
  });

  const response = await request(app).get("/assets/asset_missing/download");

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
});

test("POST /assets/:id/share creates share link for valid asset", async () => {
  const app = await createTestApp({
    authRouter: Router(),
    assetRouter: createTestAssetRouter()
  });

  const token = jwtService.sign({ userId: "user_1", email: "admin@example.com", role: "ADMIN" });
  const response = await request(app).post("/assets/asset_existing/share").set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.share.id, "share_1");
  assert.equal(typeof response.body.data.share.token, "string");
});

test("POST /assets/:id/share returns 404 for invalid asset", async () => {
  const app = await createTestApp({
    authRouter: Router(),
    assetRouter: createTestAssetRouter()
  });

  const token = jwtService.sign({ userId: "user_1", email: "admin@example.com", role: "ADMIN" });
  const response = await request(app).post("/assets/asset_missing/share").set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
});

test("POST /assets fails when no files are provided", async () => {
  const app = await createTestApp({
    authRouter: Router(),
    assetRouter: createTestAssetRouter()
  });

  const response = await request(app).post("/assets").field("tags", "campaign");

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("GET /assets fails with 400 for invalid page param", async () => {
  const app = await createTestApp({
    authRouter: Router(),
    assetRouter: createTestAssetRouter()
  });

  const response = await request(app).get("/assets?page=-1");

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

function createTestAuthRouter() {
  const router = Router();
  const passwordHash = bcrypt.hashSync("secret", 10);
  const repository = {
    findByEmail: async (email: string) =>
      email === "admin@example.com" ? { id: "user_1", email, password: passwordHash, role: "ADMIN" as const } : null
  };
  const controller = new AuthController(new AuthService(repository as never, jwtService));

  router.post("/login", (req, res, next) => {
    controller.login(req, res).catch(next);
  });

  return router;
}

function createTestAssetRouter(options: { queueJobs?: unknown[]; storedObjects?: string[] } = {}) {
  const router = Router();
  const analytics = new AnalyticsService();
  const repository = createAssetRepository();
  const queue = {
    enqueueProcessing: async (job: unknown) => {
      options.queueJobs?.push(job);
    }
  };
  const storage = {
    bucket: "test-bucket",
    ensureBucket: async () => undefined,
    putObject: async (objectKey: string) => {
      options.storedObjects?.push(objectKey);
    },
    presignedGetUrl: async (objectKey: string) => `https://storage.test/${objectKey}`
  };
  const service = new AssetService(repository as never, queue as never, storage as never, analytics);
  const controller = new AssetsController(service);
  const analyticsController = new AnalyticsController(analytics);
  const multer = createMemoryMulter();

  router.get("/", (req, res, next) => {
    controller.list(req, res).catch(next);
  });
  router.get("/analytics", requireAdmin(jwtService), (req, res, next) => {
    analyticsController.dashboard(req, res).catch(next);
  });
  router.post("/", multer.array("files", 10), (req, res, next) => {
    controller.create(req, res).catch(next);
  });
  router.get("/shared/:token", (req, res, next) => {
    controller.getSharedAsset(req, res).catch(next);
  });
  router.get("/:id/download", (req, res, next) => {
    controller.download(req, res).catch(next);
  });
  router.post("/:id/share", (req, res, next) => {
    controller.share(req, res).catch(next);
  });

  return router;
}

function createMemoryMulter() {
  return multer({
    storage: multer.memoryStorage()
  });
}

function createAssetRepository() {
  const assets: AssetDto[] = [];
  const baseAsset: AssetDto = {
    id: "asset_existing",
    filename: "hero.jpg",
    originalFilename: "hero.jpg",
    mimeType: "image/jpeg",
    type: "IMAGE",
    sizeBytes: 123,
    status: "READY",
    bucket: "test-bucket",
    objectKey: "uploads/hero.jpg",
    previewObjectKey: null,
    thumbnailObjectKey: null,
    tags: ["hero"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  assets.push(baseAsset);

  return {
    findMany: async () => ({ assets: assets.slice(0, 5), total: assets.length }),
    create: async (data: {
      filename: string;
      originalFilename: string;
      mimeType: string;
      type: "IMAGE" | "VIDEO";
      sizeBytes: number;
      bucket: string;
      objectKey: string;
      tags: Array<{ name: string }>;
    }) => {
      const asset: AssetDto = {
        id: `asset_${assets.length + 1}`,
        filename: data.filename,
        originalFilename: data.originalFilename,
        mimeType: data.mimeType,
        type: data.type,
        sizeBytes: data.sizeBytes,
        status: "QUEUED",
        bucket: data.bucket,
        objectKey: data.objectKey,
        previewObjectKey: null,
        thumbnailObjectKey: null,
        tags: data.tags.map((tag) => tag.name),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      assets.push(asset);
      return asset;
    },
    findById: async (id: string) => assets.find((asset) => asset.id === id) ?? null,
    createShareLink: async () => ({
      id: "share_1",
      status: "ACTIVE",
      expiresAt: null,
      createdAt: new Date()
    }),
    findShareLinkByTokenHash: async (tokenHash: string) => {
      const crypto = await import("node:crypto");
      const validHash = crypto.createHash("sha256").update("valid-token").digest("hex");
      const expiredHash = crypto.createHash("sha256").update("expired-token").digest("hex");

      if (tokenHash === validHash) {
        return {
          id: "share_1",
          tokenHash: validHash,
          status: "ACTIVE",
          expiresAt: null,
          asset: baseAsset
        };
      }
      if (tokenHash === expiredHash) {
        return {
          id: "share_2",
          tokenHash: expiredHash,
          status: "ACTIVE",
          expiresAt: new Date(Date.now() - 10000), // expired
          asset: baseAsset
        };
      }
      return null;
    }
  };
}
