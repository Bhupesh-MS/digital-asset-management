import type { AssetProcessingJob } from "@dam/shared-types";
import { logger } from "@dam/logger";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { transcodeVideo } from "@dam/asset-processing";
import { prisma } from "@dam/db";
import type { StorageClient } from "@dam/storage";

const RESOLUTIONS = [
  { label: "720p", size: "1280x?", bitrate: "2500k" },
  { label: "1080p", size: "1920x?", bitrate: "5000k" }
];

export async function processVideo(job: AssetProcessingJob, storage: StorageClient): Promise<void> {
  const workspace = join(tmpdir(), `dam-${job.assetId}`);
  await mkdir(workspace, { recursive: true });
  const inputPath = join(workspace, job.filename);

  try {
    await pipeline(await storage.getObject(job.sourceKey), createWriteStream(inputPath));

    for (const resolution of RESOLUTIONS) {
      const outputPath = join(workspace, `${resolution.label}.mp4`);
      const objectKey = `processed/${job.assetId}/${resolution.label}.mp4`;

      await transcodeVideo(inputPath, outputPath, {
        size: resolution.size,
        videoBitrate: resolution.bitrate
      });

      const buffer = await readFile(outputPath);
      await storage.putObject(objectKey, buffer, buffer.length, {
        "Content-Type": "video/mp4"
      });

      await prisma.assetObject.upsert({
        where: {
          assetId_kind_resolutionLabel: {
            assetId: job.assetId,
            kind: "TRANSCODED",
            resolutionLabel: resolution.label
          }
        },
        create: {
          assetId: job.assetId,
          kind: "TRANSCODED",
          bucket: storage.bucket,
          objectKey,
          mimeType: "video/mp4",
          sizeBytes: BigInt(buffer.length),
          resolutionLabel: resolution.label
        },
        update: {
          objectKey,
          sizeBytes: BigInt(buffer.length)
        }
      });

      if (resolution.label === "720p") {
        await prisma.asset.update({
          where: { id: job.assetId },
          data: { previewObjectKey: objectKey }
        });
      }
    }

    logger.info({ assetId: job.assetId }, "Video transcodes created");
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
