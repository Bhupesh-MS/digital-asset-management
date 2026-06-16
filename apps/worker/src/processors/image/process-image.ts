import type { AssetProcessingJob } from "@dam/shared-types";
import { logger } from "@dam/logger";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createThumbnail } from "@dam/asset-processing";
import { prisma } from "@dam/db";
import type { StorageClient } from "@dam/storage";

export async function processImage(job: AssetProcessingJob, storage: StorageClient): Promise<void> {
  const workspace = join(tmpdir(), `dam-${job.assetId}`);
  await mkdir(workspace, { recursive: true });

  const inputPath = join(workspace, job.filename);
  const outputPath = join(workspace, "thumbnail.jpg");
  const thumbnailKey = `processed/${job.assetId}/thumbnail.jpg`;

  try {
    await pipeline(await storage.getObject(job.sourceKey), createWriteStream(inputPath));
    const thumbnail = await createThumbnail(inputPath, outputPath);
    const thumbnailBuffer = await readFile(thumbnail.outputPath);

    await storage.putObject(thumbnailKey, thumbnailBuffer, thumbnailBuffer.length, {
      "Content-Type": "image/jpeg"
    });

    await prisma.assetObject.upsert({
      where: {
        assetId_kind_resolutionLabel: {
          assetId: job.assetId,
          kind: "THUMBNAIL",
          resolutionLabel: "320"
        }
      },
      create: {
        assetId: job.assetId,
        kind: "THUMBNAIL",
        bucket: storage.bucket,
        objectKey: thumbnailKey,
        mimeType: "image/jpeg",
        sizeBytes: BigInt(thumbnailBuffer.length),
        width: thumbnail.width,
        height: thumbnail.height,
        resolutionLabel: "320"
      },
      update: {
        objectKey: thumbnailKey,
        sizeBytes: BigInt(thumbnailBuffer.length),
        width: thumbnail.width,
        height: thumbnail.height
      }
    });

    await prisma.asset.update({
      where: { id: job.assetId },
      data: { thumbnailObjectKey: thumbnailKey, previewObjectKey: thumbnailKey }
    });

    logger.info({ assetId: job.assetId, thumbnailKey }, "Image thumbnail created");
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
