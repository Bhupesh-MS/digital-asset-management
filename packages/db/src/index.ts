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
  const requiresSsl =
    env.DATABASE_SSL === "true" ||
    connectionStringRequiresSsl(connectionString) ||
    connectionStringTargetsAwsRds(connectionString);
  const normalizedConnectionString = requiresSsl
    ? connectionStringWithSslEnabled(connectionString)
    : connectionString;

  return {
    connectionString: normalizedConnectionString,
    ...(requiresSsl
      ? { ssl: { rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" } }
      : {})
  };
}

function connectionStringRequiresSsl(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
    const ssl = url.searchParams.get("ssl")?.toLowerCase();
    if (ssl === "true" || ssl === "1") return true;
    return sslMode === "require" || sslMode === "verify-ca" || sslMode === "verify-full";
  } catch {
    return /(?:[?&])(?:ssl=true|ssl=1|sslmode=(require|verify-ca|verify-full))(?:&|$)/i.test(
      connectionString
    );
  }
}

function connectionStringTargetsAwsRds(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    return hostname.endsWith(".rds.amazonaws.com");
  } catch {
    return /\.rds\.amazonaws\.com(?::\d+)?(?:\/|\?|$)/i.test(connectionString);
  }
}

function connectionStringWithSslEnabled(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (!url.searchParams.has("ssl")) {
      url.searchParams.set("ssl", "true");
    }
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    if (!url.searchParams.has("uselibpqcompat")) {
      url.searchParams.set("uselibpqcompat", "true");
    }
    return url.toString();
  } catch {
    const separator = connectionString.includes("?") ? "&" : "?";
    return `${connectionString}${separator}ssl=true&sslmode=require&uselibpqcompat=true`;
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
