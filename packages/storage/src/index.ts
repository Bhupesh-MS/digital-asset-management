import { Client } from "minio";
import type { Readable } from "node:stream";

export interface StorageConfig {
  endPoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  bucket: string;
  useSSL?: boolean;
  publicEndPoint?: string;
  publicPort?: number;
  region?: string;
}

export function createStorageClient(config: StorageConfig) {
  const client = new Client({
    endPoint: config.endPoint,
    port: config.port,
    useSSL: config.useSSL ?? false,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: config.region ?? "us-east-1"
  });

  const publicClient =
    config.publicEndPoint && config.publicEndPoint !== config.endPoint
      ? new Client({
          endPoint: config.publicEndPoint,
          port: config.publicPort ?? config.port,
          useSSL: config.useSSL ?? false,
          accessKey: config.accessKey,
          secretKey: config.secretKey,
          region: config.region ?? "us-east-1"
        })
      : client;

  return {
    async ensureBucket() {
      const exists = await client.bucketExists(config.bucket);
      if (!exists) {
        await client.makeBucket(config.bucket);
      }
    },
    async presignedPutUrl(objectKey: string, expirySeconds = 60 * 15) {
      return publicClient.presignedPutObject(config.bucket, objectKey, expirySeconds);
    },
    async presignedGetUrl(objectKey: string, expirySeconds = 60 * 15) {
      return publicClient.presignedGetObject(config.bucket, objectKey, expirySeconds);
    },
    async putObject(objectKey: string, data: Buffer | Readable, size?: number, metaData?: Record<string, string>) {
      return client.putObject(config.bucket, objectKey, data, size, metaData);
    },
    async getObject(objectKey: string) {
      return client.getObject(config.bucket, objectKey);
    },
    async statObject(objectKey: string) {
      return client.statObject(config.bucket, objectKey);
    },
    client,
    bucket: config.bucket
  };
}

export type StorageClient = ReturnType<typeof createStorageClient>;

export function createStorageClientFromEnv(): StorageClient {
  const endPoint = requiredEnv("MINIO_ENDPOINT");
  const accessKey = requiredEnv("MINIO_ACCESS_KEY");
  const secretKey = requiredEnv("MINIO_SECRET_KEY");
  const bucket = process.env.MINIO_BUCKET ?? "dam-assets";

  return createStorageClient({
    endPoint,
    accessKey,
    secretKey,
    bucket,
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL === "true",
    publicEndPoint: process.env.MINIO_PUBLIC_ENDPOINT,
    publicPort: process.env.MINIO_PUBLIC_PORT ? Number(process.env.MINIO_PUBLIC_PORT) : undefined,
    region: process.env.MINIO_REGION ?? "us-east-1"
  });
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
