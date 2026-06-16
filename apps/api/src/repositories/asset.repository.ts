import type { AssetDto, AssetStatus, AssetType } from "@dam/shared-types";
import type { PrismaClient } from "@dam/db";

interface AssetWithRelations {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  type: AssetType;
  sizeBytes: bigint | number;
  status: AssetStatus;
  bucket: string;
  objectKey: string;
  previewObjectKey?: string | null;
  thumbnailObjectKey?: string | null;
  tags?: Array<{ tag: { name: string } }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssetData {
  filename: string;
  originalFilename: string;
  mimeType: string;
  type: AssetType;
  sizeBytes: number;
  checksumSha256: string;
  bucket: string;
  objectKey: string;
  uploadedById?: string;
  tags: Array<{ name: string; source: string }>;
  category?: string;
}

export interface ListAssetsQuery {
  page: number;
  type?: AssetType;
  status?: AssetStatus;
  search?: string;
  tag?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class AssetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findMany(query: ListAssetsQuery): Promise<{ assets: AssetDto[]; total: number }> {
    const take = 5;
    const skip = (query.page - 1) * take;
    const where: Record<string, unknown> = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { filename: { contains: query.search, mode: "insensitive" } },
        { originalFilename: { contains: query.search, mode: "insensitive" } },
        { tags: { some: { tag: { name: { contains: query.search, mode: "insensitive" } } } } }
      ];
    }

    if (query.tag) {
      where.tags = {
        some: {
          tag: {
            slug: slugify(query.tag)
          }
        }
      };
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: query.dateFrom } : {}),
        ...(query.dateTo ? { lte: query.dateTo } : {})
      };
    }

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        include: { tags: { include: { tag: true } } }
      }),
      this.prisma.asset.count({ where })
    ]);

    return {
      assets: assets.map(toAssetDto),
      total
    };
  }

  async create(data: CreateAssetData): Promise<AssetDto> {
    const created = await this.prisma.asset.create({
      data: {
        filename: data.filename,
        originalFilename: data.originalFilename,
        mimeType: data.mimeType,
        type: data.type,
        sizeBytes: BigInt(data.sizeBytes),
        checksumSha256: data.checksumSha256,
        status: "QUEUED",
        bucket: data.bucket,
        objectKey: data.objectKey,
        uploadedById: data.uploadedById,
        objects: {
          create: {
            kind: "ORIGINAL",
            bucket: data.bucket,
            objectKey: data.objectKey,
            mimeType: data.mimeType,
            sizeBytes: BigInt(data.sizeBytes)
          }
        },
        tags: {
          create: data.tags.map((tag) => ({
            source: tag.source,
            tag: {
              connectOrCreate: {
                where: { slug: slugify(tag.name) },
                create: { name: tag.name, slug: slugify(tag.name) }
              }
            }
          }))
        },
        categories: data.category
          ? {
              create: {
                category: {
                  connectOrCreate: {
                    where: { slug: slugify(data.category) },
                    create: { name: data.category, slug: slugify(data.category) }
                  }
                }
              }
            }
          : undefined,
        processingJobs: {
          create: buildProcessingJobs(data)
        }
      },
      include: { tags: { include: { tag: true } } }
    });

    return toAssetDto(created);
  }

  async findById(id: string): Promise<AssetDto | null> {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } }
    });

    return asset ? toAssetDto(asset) : null;
  }

  async createShareLink(data: { assetId: string; tokenHash: string; createdById?: string; expiresAt?: Date }) {
    return this.prisma.shareLink.create({
      data: {
        assetId: data.assetId,
        tokenHash: data.tokenHash,
        createdById: data.createdById,
        expiresAt: data.expiresAt
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        createdAt: true
      }
    });
  }

  async findShareLinkByTokenHash(tokenHash: string) {
    const share = await this.prisma.shareLink.findUnique({
      where: { tokenHash },
      include: {
        asset: {
          include: { tags: { include: { tag: true } } }
        }
      }
    });

    if (!share) {
      return null;
    }

    return {
      ...share,
      asset: toAssetDto(share.asset)
    };
  }
}

type ProcessingJobCreate = {
  type: "EXTRACT_METADATA" | "AUTO_TAG" | "GENERATE_THUMBNAIL" | "TRANSCODE_VIDEO";
  payload: object;
};

function buildProcessingJobs(data: CreateAssetData): ProcessingJobCreate[] {
  const jobs: ProcessingJobCreate[] = [
    { type: "EXTRACT_METADATA" as const, payload: { objectKey: data.objectKey } },
    { type: "AUTO_TAG" as const, payload: { tags: data.tags.map((tag) => tag.name) } }
  ];

  if (data.type === "IMAGE") {
    jobs.push({ type: "GENERATE_THUMBNAIL" as const, payload: { objectKey: data.objectKey } });
  }

  if (data.type === "VIDEO") {
    jobs.push({ type: "TRANSCODE_VIDEO" as const, payload: { objectKey: data.objectKey } });
  }

  return jobs;
}

function toAssetDto(asset: AssetWithRelations): AssetDto {
  return {
    id: asset.id,
    filename: asset.filename,
    originalFilename: asset.originalFilename,
    mimeType: asset.mimeType,
    type: asset.type,
    sizeBytes: Number(asset.sizeBytes),
    status: asset.status,
    bucket: asset.bucket,
    objectKey: asset.objectKey,
    previewObjectKey: asset.previewObjectKey,
    thumbnailObjectKey: asset.thumbnailObjectKey,
    tags: asset.tags?.map((assetTag) => assetTag.tag.name) ?? [],
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString()
  };
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
