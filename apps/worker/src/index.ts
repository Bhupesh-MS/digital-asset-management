import "dotenv/config";
import { logger } from "@dam/logger";
import { getQueueClient } from "@dam/rabbitmq";
import { startAssetProcessingConsumer } from "./consumers/asset-processing.consumer.js";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startAssetProcessingConsumerWithRetry() {
  const attempts = 10;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await startAssetProcessingConsumer();
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      logger.warn({ attempt, maxAttempts: attempts, err: error }, "RabbitMQ connection failed; retrying");
      await delay(2000);
    }
  }
}

async function start() {
  await startAssetProcessingConsumerWithRetry();

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Shutting down worker");
    if (process.env.RABBITMQ_URL) {
      await getQueueClient(process.env.RABBITMQ_URL).close();
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch(async (error) => {
  logger.error({ error }, "Worker failed to start");
  if (process.env.RABBITMQ_URL) {
    await getQueueClient(process.env.RABBITMQ_URL).close();
  }
  process.exit(1);
});
