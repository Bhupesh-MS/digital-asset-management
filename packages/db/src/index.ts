import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

export type { PrismaClient } from "./generated/prisma/client.ts";

const connectionString = requiredEnv("DATABASE_URL");
const ssl =
  process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" }
    : undefined;

const adapter = new PrismaPg({ connectionString, ssl });

export const prisma = new PrismaClient({ adapter });

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
