import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

export type { PrismaClient } from "./generated/prisma/client.ts";

const connectionString = requiredEnv("DATABASE_URL");

const adapter = new PrismaPg(createPoolConfig(connectionString));

export const prisma = new PrismaClient({ adapter });

export function createPoolConfig(
  connectionString: string,
  env: NodeJS.ProcessEnv = process.env
): { connectionString: string; ssl?: { rejectUnauthorized: boolean } } {
  const requiresSsl = env.DATABASE_SSL === "true" || connectionStringRequiresSsl(connectionString);

  return {
    connectionString,
    ...(requiresSsl
      ? { ssl: { rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" } }
      : {})
  };
}

function connectionStringRequiresSsl(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
    return sslMode === "require" || sslMode === "verify-ca" || sslMode === "verify-full";
  } catch {
    return /(?:[?&])sslmode=(require|verify-ca|verify-full)(?:&|$)/i.test(connectionString);
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
