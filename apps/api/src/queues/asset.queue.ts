import type { AssetProcessingJob } from "@dam/shared-types";
import { getQueueClient } from "@dam/rabbitmq";
import { logger } from "@dam/logger";

const QUEUE_NAME = "asset.processing";

export class AssetQueue {
  async enqueueProcessing(job: AssetProcessingJob): Promise<void> {
    const url = process.env.RABBITMQ_URL;
    if (!url) {
      logger.warn({ job }, "RABBITMQ_URL is not configured; skipping enqueue");
      return;
    }

    const queue = getQueueClient(url);
    await queue.publish(QUEUE_NAME, job);
  }
}
