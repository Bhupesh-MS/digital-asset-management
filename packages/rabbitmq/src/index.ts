import amqp, { ConfirmChannel, ChannelModel, ConsumeMessage, Channel } from "amqplib";

export type { ConsumeMessage };

export class QueueClient {
  private connection: ChannelModel | null = null;
  private publishChannel: ConfirmChannel | null = null;
  private connectPromise: Promise<void> | null = null;

  constructor(private readonly url: string) {}

  async connect(): Promise<void> {
    if (this.connection) return;

    if (!this.connectPromise) {
      this.connectPromise = (async () => {
        try {
          this.connection = await amqp.connect(this.url);

          this.connection.on("error", (err) => {
            console.error("[RabbitMQ] Connection error:", err);
          });

          this.connection.on("close", () => {
            console.warn("[RabbitMQ] Connection closed. Will reconnect on next use.");
            this.connection = null;
            this.publishChannel = null;
            this.connectPromise = null;
          });

          this.publishChannel = await this.connection.createConfirmChannel();

          this.publishChannel.on("error", (err) => {
            console.error("[RabbitMQ] Publish channel error:", err);
          });

          this.publishChannel.on("close", () => {
            this.publishChannel = null;
          });
        } catch (error) {
          this.connectPromise = null;
          throw error;
        }
      })();
    }

    return this.connectPromise;
  }

  async publish<T>(queue: string, payload: T): Promise<void> {
    if (!this.publishChannel) {
      await this.connect();
    }

    if (!this.publishChannel) {
      throw new Error("[RabbitMQ] Not connected. Failed to publish.");
    }

    await this.publishChannel.assertQueue(queue, { durable: true });
    await new Promise<void>((resolve, reject) => {
      this.publishChannel!.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true }, (err) => {
        if (err !== null) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async consume<T>(queue: string, handler: (payload: T, message: ConsumeMessage) => Promise<void>): Promise<void> {
    if (!this.connection) {
      await this.connect();
    }

    if (!this.connection) {
      throw new Error("[RabbitMQ] Not connected. Failed to consume.");
    }

    const channel = await this.connection.createChannel();
    await channel.assertQueue(queue, { durable: true });
    await channel.prefetch(4);
    await channel.consume(queue, async (message) => {
      if (!message) return;

      try {
        await handler(JSON.parse(message.content.toString()) as T, message);
        channel.ack(message);
      } catch (error) {
        channel.nack(message, false, false);
        throw error;
      }
    });
  }

  async close(): Promise<void> {
    if (this.publishChannel) {
      try {
        await this.publishChannel.close();
      } catch (e) {}
      this.publishChannel = null;
    }
    if (this.connection) {
      try {
        await this.connection.close();
      } catch (e) {}
      this.connection = null;
    }
    this.connectPromise = null;
  }
}

let defaultClient: QueueClient | null = null;

export function getQueueClient(url?: string): QueueClient {
  if (!defaultClient) {
    if (!url) {
      throw new Error("RabbitMQ URL is required to initialize client");
    }
    defaultClient = new QueueClient(url);
  }
  return defaultClient;
}
