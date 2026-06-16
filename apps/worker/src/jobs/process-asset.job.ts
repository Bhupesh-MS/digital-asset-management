import type { AssetProcessingJob } from "@dam/shared-types";
import { logger } from "@dam/logger";
import { prisma } from "@dam/db";
import { createStorageClientFromEnv } from "@dam/storage";
import { processImage } from "../processors/image/process-image.js";
import { processVideo } from "../processors/video/process-video.js";
import { processMetadata } from "../processors/metadata/process-metadata.js";

export async function processAssetJob(job: AssetProcessingJob): Promise<void> {
  const storage = createStorageClientFromEnv();
  await updateAssetStatus(job.assetId, "PROCESSING");
  await markJobsRunning(job.assetId);

  try {
    await processMetadata(job, storage);

    if (job.mimeType.startsWith("image/")) {
      await processImage(job, storage);
    } else if (job.mimeType.startsWith("video/")) {
      await processVideo(job, storage);
    } else {
      logger.info({ job }, "No specialized processor for mime type");
    }

    await updateAssetStatus(job.assetId, "READY");
    await markJobsCompleted(job.assetId);
  } catch (error) {
    await updateAssetStatus(job.assetId, "FAILED");
    await markJobsFailed(job.assetId, error);
    throw error;
  }
}

async function updateAssetStatus(assetId: string, status: "PROCESSING" | "READY" | "FAILED") {
  await prisma.asset.update({
    where: { id: assetId },
    data: { status }
  });
}

async function markJobsRunning(assetId: string) {
  await prisma.processingJob.updateMany({
    where: { assetId, status: "PENDING" },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      attempts: { increment: 1 }
    }
  });
}

async function markJobsCompleted(assetId: string) {
  await prisma.processingJob.updateMany({
    where: { assetId, status: "RUNNING" },
    data: {
      status: "COMPLETED",
      finishedAt: new Date()
    }
  });
}

async function markJobsFailed(assetId: string, error: unknown) {
  await prisma.processingJob.updateMany({
    where: { assetId, status: "RUNNING" },
    data: {
      status: "FAILED",
      error: error instanceof Error ? error.message : "Unknown processing error",
      finishedAt: new Date()
    }
  });
}
