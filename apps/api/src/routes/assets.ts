import { Router } from "express";
import multer from "multer";
import { AssetsController } from "../controllers/assets.controller.js";
import { AnalyticsController } from "../controllers/analytics.controller.js";
import { AssetRepository } from "../repositories/asset.repository.js";
import { AssetQueue } from "../queues/asset.queue.js";
import { AssetService } from "../services/asset.service.js";
import { prisma } from "@dam/db";
import { createStorageClientFromEnv } from "@dam/storage";
import { AnalyticsService } from "../services/analytics.service.js";
import { requireAdmin } from "../middleware/auth.middleware.js";
import type { NextFunction, Request, Response } from "express";

export function createAssetRouter() {
  const router = Router();
  const repository = new AssetRepository(prisma);
  const queue = new AssetQueue();
  const storage = createStorageClientFromEnv();
  const analyticsService = new AnalyticsService();
  const service = new AssetService(repository, queue, storage, analyticsService);
  const controller = new AssetsController(service);
  const analyticsController = new AnalyticsController(analyticsService);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      files: 10,
      fileSize: Number(process.env.MAX_ASSET_FILE_SIZE_BYTES ?? 1024 * 1024 * 500)
    }
  });

  /**
   * @openapi
   * /assets:
   *   get:
   *     summary: List assets
   *     tags: [Assets]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: A list of assets
   */
  router.get("/", asyncHandler(controller.list));

  /**
   * @openapi
   * /assets/analytics:
   *   get:
   *     summary: Get asset analytics dashboard (Admin only)
   *     tags: [Assets]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Analytics data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.get("/analytics", requireAdmin(), asyncHandler(analyticsController.dashboard));

  /**
   * @openapi
   * /assets/shared/{token}:
   *   get:
   *     summary: Get a shared asset
   *     tags: [Assets]
   *     parameters:
   *       - in: path
   *         name: token
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Asset details
   *       404:
   *         description: Not found or expired
   */
  router.get("/shared/:token", asyncHandler(controller.getSharedAsset));

  /**
   * @openapi
   * /assets/{id}/download:
   *   get:
   *     summary: Get a download or preview URL for an asset
   *     tags: [Assets]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: preview
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: URL generated successfully
   */
  router.get("/:id/download", asyncHandler(controller.download));

  /**
   * @openapi
   * /assets:
   *   post:
   *     summary: Upload new assets
   *     tags: [Assets]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               files:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *               tags:
   *                 type: string
   *                 description: Comma separated tags
   *               category:
   *                 type: string
   *     responses:
   *       201:
   *         description: Assets created successfully
   */
  router.post("/", upload.array("files", 10), asyncHandler(controller.create));

  /**
   * @openapi
   * /assets/{id}/share:
   *   post:
   *     summary: Share an asset (create share token)
   *     tags: [Assets]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               expiresAt:
   *                 type: string
   *                 format: date-time
   *     responses:
   *       200:
   *         description: Share token created
   */
  router.post("/:id/share", asyncHandler(controller.share));

  return router;
}

function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
