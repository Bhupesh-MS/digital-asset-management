import { createClient, type RedisClientType } from "redis";
import { logger } from "@dam/logger";

export type AnalyticsAction = "upload" | "download" | "share" | "list";

export class AnalyticsService {
  private client?: RedisClientType;
  private connectPromise?: Promise<RedisClientType | undefined>;

  async recordAssetAction(action: AnalyticsAction, assetId?: string): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      return;
    }

    const day = new Date().toISOString().slice(0, 10);
    await Promise.all([
      client.hIncrBy("analytics:totals", action, 1),
      client.hIncrBy(`analytics:daily:${day}`, action, 1),
      assetId ? client.hIncrBy(`analytics:asset:${assetId}`, action, 1) : Promise.resolve(0)
    ]);
  }

  async getDashboard() {
    const client = await this.getClient();
    if (!client) {
      return {
        success: true,
        data: {
          totals: { uploads: 0, downloads: 0, shares: 0, lists: 0 },
          topDownloadedAssets: []
        }
      };
    }

    const totals = await client.hGetAll("analytics:totals");
    const keys = await client.keys("analytics:asset:*");
    const assetCounts = await Promise.all(
      keys.map(async (key) => ({
        assetId: key.replace("analytics:asset:", ""),
        downloads: Number((await client.hGet(key, "download")) ?? 0),
        shares: Number((await client.hGet(key, "share")) ?? 0)
      }))
    );

    return {
      success: true,
      data: {
        totals: {
          uploads: Number(totals.upload ?? 0),
          downloads: Number(totals.download ?? 0),
          shares: Number(totals.share ?? 0),
          lists: Number(totals.list ?? 0)
        },
        topDownloadedAssets: assetCounts.sort((left, right) => right.downloads - left.downloads).slice(0, 5)
      }
    };
  }

  private async getClient(): Promise<RedisClientType | undefined> {
    if (!process.env.REDIS_URL) {
      return undefined;
    }

    if (this.client?.isOpen) {
      return this.client;
    }

    if (!this.connectPromise) {
      const client = createClient({ url: process.env.REDIS_URL });
      client.on("error", (error) => logger.error({ error }, "Redis client error"));
      this.connectPromise = client
        .connect()
        .then(() => {
          this.client = client as RedisClientType;
          return this.client;
        })
        .catch((error) => {
          logger.error({ error }, "Redis connection failed; analytics disabled");
          this.connectPromise = undefined;
          return undefined;
        });
    }

    return this.connectPromise;
  }
}
