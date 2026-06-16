import type { AssetProcessingJob } from "@dam/shared-types";
import { logger } from "@dam/logger";
import { prisma } from "@dam/db";
import type { StorageClient } from "@dam/storage";

export async function processMetadata(job: AssetProcessingJob, storage: StorageClient): Promise<void> {
  const stat = await storage.statObject(job.sourceKey);

  await prisma.assetMetadata.upsert({
    where: { assetId: job.assetId },
    create: {
      assetId: job.assetId,
      raw: {
        mimeType: job.mimeType,
        filename: job.filename,
        objectKey: job.sourceKey,
        size: stat.size,
        etag: stat.etag,
        lastModified: stat.lastModified?.toISOString()
      }
    },
    update: {
      raw: {
        mimeType: job.mimeType,
        filename: job.filename,
        objectKey: job.sourceKey,
        size: stat.size,
        etag: stat.etag,
        lastModified: stat.lastModified?.toISOString()
      }
    }
  });

  logger.info({ assetId: job.assetId, sourceKey: job.sourceKey }, "Asset metadata extracted");
}
