import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

export type { PrismaClient } from "./generated/prisma/client.ts";

const connectionString = requiredEnv("DATABASE_URL");

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
