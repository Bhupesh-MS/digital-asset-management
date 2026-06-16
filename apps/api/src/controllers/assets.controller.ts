import type { Request, Response } from "express";
import { unlink } from "node:fs/promises";
import { AssetService } from "../services/asset.service.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export class AssetsController {
  constructor(private readonly assetService: AssetService) {}

  list = async (req: Request, res: Response) => {
    res.json(await this.assetService.listAssets(req.query));
  };

  create = async (req: AuthenticatedRequest, res: Response) => {
    const files = Array.isArray(req.files) ? req.files : [];
    try {
      const result = await this.assetService.createAssets({
        files,
        tags: parseTags(req.body.tags),
        category: typeof req.body.category === "string" ? req.body.category : undefined,
        uploadedById: req.user?.userId
      });

      res.status(201).json(result);
    } finally {
      await cleanupUploadedFiles(files);
    }
  };

  download = async (req: Request, res: Response) => {
    const isPreview = req.query.preview === "true";
    res.json(await this.assetService.createDownloadUrl(String(req.params.id), isPreview));
  };

  share = async (req: AuthenticatedRequest, res: Response) => {
    const result = await this.assetService.shareAsset(String(req.params.id), {
      expiresAt: req.body.expiresAt,
      createdById: req.user?.userId
    });

    res.status(201).json(result);
  };

  getSharedAsset = async (req: Request, res: Response) => {
    res.json(await this.assetService.getSharedAsset(String(req.params.token)));
  };
}

async function cleanupUploadedFiles(files: Express.Multer.File[]) {
  await Promise.all(
    files
      .map((file) => file.path)
      .filter((filePath): filePath is string => Boolean(filePath))
      .map(async (filePath) => {
        try {
          await unlink(filePath);
        } catch {
          // Temp file cleanup is best effort; request outcome should come from asset processing.
        }
      })
  );
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === "string");
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}
