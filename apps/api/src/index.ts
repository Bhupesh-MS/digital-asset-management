import "dotenv/config";
import { logger } from "@dam/logger";
import { prisma } from "@dam/db";
import { createApp } from "./app.js";
import { seedAdmin } from "./utils/seedAdmin.js";
import { getQueueClient } from "@dam/rabbitmq";

const port = Number(process.env.API_PORT ?? 3000);
const databaseConnectAttempts = Number(process.env.DATABASE_CONNECT_ATTEMPTS ?? 10);
const databaseConnectDelayMs = Number(process.env.DATABASE_CONNECT_DELAY_MS ?? 2000);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectToDatabase() {
  for (let attempt = 1; attempt <= databaseConnectAttempts; attempt += 1) {
    try {
      await prisma.$connect();
      logger.info("Connected to database");
      return;
    } catch (error) {
      if (attempt === databaseConnectAttempts) {
        throw error;
      }

      logger.warn(
        { attempt, maxAttempts: databaseConnectAttempts, err: error },
        "Database connection failed; retrying"
      );
      await delay(databaseConnectDelayMs);
    }
  }
}

async function connectToRabbitMQ() {
  if (!process.env.RABBITMQ_URL) return;

  for (let attempt = 1; attempt <= databaseConnectAttempts; attempt += 1) {
    try {
      await getQueueClient(process.env.RABBITMQ_URL).connect();
      logger.info("Connected to RabbitMQ");
      return;
    } catch (error) {
      if (attempt === databaseConnectAttempts) {
        throw error;
      }

      logger.warn(
        { attempt, maxAttempts: databaseConnectAttempts, err: error },
        "RabbitMQ connection failed; retrying"
      );
      await delay(databaseConnectDelayMs);
    }
  }
}

async function start() {
  await connectToDatabase();
  await seedAdmin();
  await connectToRabbitMQ();
  const app = createApp();

  const server = app.listen(port, () => {
    logger.info({ port }, "API listening");
  });

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Shutting down API");

    server.close(async () => {
      await prisma.$disconnect();
      if (process.env.RABBITMQ_URL) {
        await getQueueClient(process.env.RABBITMQ_URL).close();
      }
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch(async (error) => {
  logger.error({ err: error }, "Failed to start API");
  await prisma.$disconnect();
  if (process.env.RABBITMQ_URL) {
    await getQueueClient(process.env.RABBITMQ_URL).close();
  }
  process.exit(1);
});
