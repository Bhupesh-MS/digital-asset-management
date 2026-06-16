import test from "node:test";
import assert from "node:assert/strict";
import { getQueueClient, QueueClient } from "./index.js";
import amqp from "amqplib";

test("QueueClient", async (t) => {
  let connectCalled = false;
  let assertQueueCalled = false;
  let sendToQueueCalled = false;
  let consumeCalled = false;

  const mockChannel = {
    on: () => {},
    close: async () => {},
    assertQueue: async () => {
      assertQueueCalled = true;
    },
    sendToQueue: (q: string, b: Buffer, o: any, cb: (e: any) => void) => {
      sendToQueueCalled = true;
      cb(null);
    },
    prefetch: async () => {},
    consume: async (q: string, cb: (msg: any) => void) => {
      consumeCalled = true;
      cb({ content: Buffer.from(JSON.stringify({ test: "data" })) });
    },
    ack: () => {},
    nack: () => {}
  };

  const mockConnection = {
    on: () => {},
    close: async () => {},
    createConfirmChannel: async () => mockChannel,
    createChannel: async () => mockChannel
  };

  // @ts-ignore
  amqp.connect = async () => {
    connectCalled = true;
    return mockConnection;
  };

  await t.test("connects and publishes", async () => {
    const client = new QueueClient("amqp://localhost");
    await client.connect();
    assert.equal(connectCalled, true);

    await client.publish("test-queue", { hello: "world" });
    assert.equal(assertQueueCalled, true);
    assert.equal(sendToQueueCalled, true);
  });

  await t.test("connects and consumes", async () => {
    const client = new QueueClient("amqp://localhost");
    let handlerCalled = false;
    await client.consume("test-queue", async (payload: any) => {
      assert.equal(payload.test, "data");
      handlerCalled = true;
    });
    assert.equal(consumeCalled, true);
    assert.equal(handlerCalled, true);
  });

  await t.test("closes gracefully", async () => {
    const client = new QueueClient("amqp://localhost");
    await client.connect();
    await client.close();
    // Subsequent publish should fail or reconnect depending on implementation
  });

  await t.test("getQueueClient singleton", () => {
    const client1 = getQueueClient("amqp://localhost");
    const client2 = getQueueClient();
    assert.equal(client1, client2);
  });
});
