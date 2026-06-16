import { createHash, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import type { AssetDto, AssetType, CreateAssetRequest, CreateAssetResponse } from "@dam/shared-types";
import type { StorageClient } from "@dam/storage";
import { logger } from "@dam/logger";
import { AssetQueue } from "../queues/asset.queue.js";
import { AssetRepository, type ListAssetsQuery } from "../repositories/asset.repository.js";
import { HttpError } from "../utils/http-error.js";
import { AnalyticsService } from "./analytics.service.js";

const SUPPORTED_MIME_PREFIXES = ["image/", "video/"];
const MAX_FILES = Number(process.env.MAX_ASSET_FILES ?? 10);
const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_ASSET_FILE_SIZE_BYTES ?? 1024 * 1024 * 500);
const UPLOAD_STREAM_CHUNK_SIZE_BYTES = Number(process.env.UPLOAD_STREAM_CHUNK_SIZE_BYTES ?? 1024 * 1024 * 8);

export interface AssetListRequest {
  page?: unknown;
  type?: unknown;
  status?: unknown;
  search?: unknown;
  tag?: unknown;
  dateFrom?: unknown;
  dateTo?: unknown;
}

export class AssetService {
  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly assetQueue: AssetQueue,
    private readonly storage: StorageClient,
    private readonly analyticsService: AnalyticsService
  ) {}

  async listAssets(request: AssetListRequest = {}) {
    const page = parsePage(request.page);
    const query: ListAssetsQuery = {
      page,
      type: parseAssetType(request.type),
      status: parseAssetStatus(request.status),
      search: parseOptionalString(request.search),
      tag: parseOptionalString(request.tag),
      dateFrom: parseDate(request.dateFrom, "dateFrom"),
      dateTo: parseDate(request.dateTo, "dateTo")
    };

    const result = await this.assetRepository.findMany(query);
    await this.analyticsService.recordAssetAction("list");

    return {
      success: true,
      data: {
        assets: result.assets,
        pagination: {
          page,
          perPage: 5,
          total: result.total,
          totalPages: Math.ceil(result.total / 5)
        }
      }
    };
  }

  async createAssets(request: CreateAssetRequest): Promise<CreateAssetResponse> {
    if (!request.files.length) {
      throw new HttpError(400, "At least one file is required");
    }

    if (request.files.length > MAX_FILES) {
      throw new HttpError(400, `A maximum of ${MAX_FILES} files can be uploaded at once`);
    }

    await this.storage.ensureBucket();

    const assets: AssetDto[] = [];
    const requestedTags = normalizeTags(request.tags ?? []);

    for (const file of request.files) {
      validateUploadFile(file);

      const type = getAssetType(file.mimetype);
      const checksumSha256 = await createUploadChecksum(file);
      const filename = sanitizeFilename(file.originalname);
      const objectKey = `uploads/${new Date().toISOString().slice(0, 10)}/${randomBytes(8).toString("hex")}-${filename}`;
      const tags = buildAutoTags(filename, file.mimetype, type, requestedTags);

      await this.storage.putObject(objectKey, createUploadReadStream(file), file.size, {
        "Content-Type": file.mimetype
      });

      const asset = await this.assetRepository.create({
        filename,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        type,
        sizeBytes: file.size,
        checksumSha256,
        bucket: this.storage.bucket,
        objectKey,
        uploadedById: request.uploadedById,
        tags,
        category: request.category
      });

      await this.assetQueue.enqueueProcessing({
        assetId: asset.id,
        sourceKey: asset.objectKey,
        mimeType: asset.mimeType,
        filename: asset.filename
      });
      await this.analyticsService.recordAssetAction("upload", asset.id);
      logger.info({ assetId: asset.id, objectKey }, "Asset uploaded and queued");

      assets.push(asset);
    }

    return {
      success: true,
      data: { assets }
    };
  }

  async createDownloadUrl(assetId: string, isPreview = false) {
    const asset = await this.assetRepository.findById(assetId);
    if (!asset) {
      throw new HttpError(404, "Asset not found");
    }

    const objectKeyToUse = isPreview && asset.previewObjectKey ? asset.previewObjectKey : asset.objectKey;
    const url = await this.storage.presignedGetUrl(objectKeyToUse);

    if (!isPreview) {
      await this.analyticsService.recordAssetAction("download", asset.id);
    }

    return {
      success: true,
      data: {
        assetId: asset.id,
        url
      }
    };
  }

  async shareAsset(assetId: string, request: { expiresAt?: unknown; createdById?: string }) {
    const asset = await this.assetRepository.findById(assetId);
    if (!asset) {
      throw new HttpError(404, "Asset not found");
    }

    const expiresAt = parseDate(request.expiresAt, "expiresAt");
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const share = await this.assetRepository.createShareLink({
      assetId,
      tokenHash,
      createdById: request.createdById,
      expiresAt
    });

    await this.analyticsService.recordAssetAction("share", assetId);

    return {
      success: true,
      data: {
        share: {
          id: share.id,
          token,
          status: share.status,
          expiresAt: share.expiresAt?.toISOString() ?? null,
          createdAt: share.createdAt.toISOString()
        }
      }
    };
  }

  async getSharedAsset(token: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const share = await this.assetRepository.findShareLinkByTokenHash(tokenHash);

    if (!share) {
      throw new HttpError(404, "Invalid or expired share link");
    }

    if (share.status !== "ACTIVE") {
      throw new HttpError(404, "Share link is no longer active");
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new HttpError(404, "Share link has expired");
    }

    const url = await this.storage.presignedGetUrl(share.asset.objectKey);
    await this.analyticsService.recordAssetAction("download", share.asset.id);

    return {
      success: true,
      data: {
        asset: share.asset,
        url
      }
    };
  }
}

type UploadFile = CreateAssetRequest["files"][number];

function validateUploadFile(file: UploadFile) {
  if (!file.originalname || !file.mimetype || !file.size || (!file.buffer && !file.path)) {
    throw new HttpError(400, "Each file must include filename, MIME type, size, and content");
  }

  if (!SUPPORTED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix))) {
    throw new HttpError(400, "Only image and video assets are supported");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new HttpError(400, `File size must not exceed ${MAX_FILE_SIZE_BYTES} bytes`);
  }
}

async function createUploadChecksum(file: UploadFile) {
  const hash = createHash("sha256");

  for await (const chunk of createUploadReadStream(file)) {
    hash.update(chunk);
  }

  return hash.digest("hex");
}

function createUploadReadStream(file: UploadFile): Readable {
  if (file.path) {
    return createReadStream(file.path, { highWaterMark: UPLOAD_STREAM_CHUNK_SIZE_BYTES });
  }

  return Readable.from(file.buffer ?? []);
}

function getAssetType(mimeType: string): AssetType {
  if (mimeType.startsWith("image/")) {
    return "IMAGE";
  }

  if (mimeType.startsWith("video/")) {
    return "VIDEO";
  }

  return "OTHER";
}

function buildAutoTags(filename: string, mimeType: string, type: AssetType, requestedTags: string[]) {
  const extension = filename.includes(".") ? (filename.split(".").pop() ?? "") : "";
  const basename = filename.replace(/\.[^.]+$/, "");
  const filenameParts = basename.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const mimeParts = mimeType.split(/[/.+-]/).filter(Boolean);
  const allTags = [...requestedTags, type.toLowerCase(), extension, ...filenameParts, ...mimeParts];
  const seen = new Set<string>();

  return allTags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length >= 2)
    .filter((tag) => {
      if (seen.has(tag)) {
        return false;
      }
      seen.add(tag);
      return true;
    })
    .map((name) => ({ name, source: requestedTags.includes(name) ? "request" : "auto" }));
}

function normalizeTags(tags: string[]): string[] {
  return tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180);
}

function parsePage(value: unknown): number {
  const page = Number(value ?? 1);
  if (!Number.isInteger(page) || page < 1) {
    throw new HttpError(400, "page must be a positive integer");
  }

  return page;
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseAssetType(value: unknown): AssetType | undefined {
  if (!value) {
    return undefined;
  }

  const type = String(value).toUpperCase();
  if (!["IMAGE", "VIDEO"].includes(type)) {
    throw new HttpError(400, "type must be IMAGE or VIDEO");
  }

  return type as AssetType;
}

function parseAssetStatus(value: unknown) {
  if (!value) {
    return undefined;
  }

  const status = String(value).toUpperCase();
  if (!["UPLOADED", "QUEUED", "PROCESSING", "READY", "FAILED", "ARCHIVED"].includes(status)) {
    throw new HttpError(400, "status is invalid");
  }

  return status as ListAssetsQuery["status"];
}

function parseDate(value: unknown, field: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${field} must be a valid date`);
  }

  return date;
}
