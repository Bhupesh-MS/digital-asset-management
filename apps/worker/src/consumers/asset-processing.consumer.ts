import type { AssetProcessingJob } from "@dam/shared-types";
import { logger } from "@dam/logger";
import { getQueueClient } from "@dam/rabbitmq";
import { processAssetJob } from "../jobs/process-asset.job.js";

const QUEUE_NAME = "asset.processing";

export async function startAssetProcessingConsumer() {
  const url = process.env.RABBITMQ_URL;
  if (!url) {
    throw new Error("RABBITMQ_URL is required for worker startup");
  }

  const queue = getQueueClient(url);
  await queue.consume<AssetProcessingJob>(QUEUE_NAME, async (job) => {
    logger.info({ job }, "Processing asset job");
    await processAssetJob(job);
  });

  logger.info({ queue: QUEUE_NAME }, "Worker consuming queue");
}
