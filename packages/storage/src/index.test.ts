import test from "node:test";
import assert from "node:assert/strict";
import { createStorageClient, createStorageClientFromEnv } from "./index.js";
import * as minio from "minio";

test("Storage Client", async (t) => {
  const config = {
    endPoint: "localhost",
    port: 9000,
    accessKey: "test",
    secretKey: "test",
    bucket: "test-bucket"
  };

  const client = createStorageClient(config);

  await t.test("createStorageClient returns client interface", () => {
    assert.ok(typeof client.presignedGetUrl === "function");
    assert.ok(client.client instanceof minio.Client);
    assert.equal(client.bucket, "test-bucket");
  });

  await t.test("ensureBucket makes bucket if it doesn't exist", async () => {
    let existsCalled = false;
    let makeCalled = false;
    // @ts-ignore
    client.client.bucketExists = async () => {
      existsCalled = true;
      return false;
    };
    // @ts-ignore
    client.client.makeBucket = async () => {
      makeCalled = true;
    };

    await client.ensureBucket();
    assert.ok(existsCalled);
    assert.ok(makeCalled);
  });

  await t.test("ensureBucket does not make bucket if it exists", async () => {
    let makeCalled = false;
    // @ts-ignore
    client.client.bucketExists = async () => true;
    // @ts-ignore
    client.client.makeBucket = async () => {
      makeCalled = true;
    };

    await client.ensureBucket();
    assert.equal(makeCalled, false);
  });

  await t.test("presignedPutUrl calls publicClient", async () => {
    // @ts-ignore
    client.client.presignedPutObject = async (b, k, e) => `put-${b}-${k}-${e}`;
    const url = await client.presignedPutUrl("obj.jpg", 123);
    assert.equal(url, "put-test-bucket-obj.jpg-123");
  });

  await t.test("presignedGetUrl calls publicClient", async () => {
    // @ts-ignore
    client.client.presignedGetObject = async (b, k, e) => `get-${b}-${k}-${e}`;
    const url = await client.presignedGetUrl("obj.jpg", 456);
    assert.equal(url, "get-test-bucket-obj.jpg-456");
  });

  await t.test("putObject calls client", async () => {
    // @ts-ignore
    client.client.putObject = async (b, k, d, s, m) => ({ b, k, s });
    const res: any = await client.putObject("obj.jpg", Buffer.from("test"), 4, { "Content-Type": "image/jpeg" });
    assert.equal(res.b, "test-bucket");
    assert.equal(res.k, "obj.jpg");
    assert.equal(res.s, 4);
  });

  await t.test("getObject calls client", async () => {
    // @ts-ignore
    client.client.getObject = async (b, k) => `get-${b}-${k}`;
    const res = await client.getObject("obj.jpg");
    assert.equal(res, "get-test-bucket-obj.jpg");
  });

  await t.test("statObject calls client", async () => {
    // @ts-ignore
    client.client.statObject = async (b, k) => `stat-${b}-${k}`;
    const res = await client.statObject("obj.jpg");
    assert.equal(res, "stat-test-bucket-obj.jpg");
  });
});

test("createStorageClientFromEnv", async (t) => {
  await t.test("throws if missing required env", () => {
    delete process.env.MINIO_ENDPOINT;
    assert.throws(() => createStorageClientFromEnv(), /Missing required environment variable/);
  });

  await t.test("creates client with env vars", () => {
    process.env.MINIO_ENDPOINT = "localhost";
    process.env.MINIO_ACCESS_KEY = "key123";
    process.env.MINIO_SECRET_KEY = "sec123";
    process.env.MINIO_BUCKET = "my-bucket";
    process.env.MINIO_PORT = "9001";
    process.env.MINIO_USE_SSL = "true";
    process.env.MINIO_PUBLIC_ENDPOINT = "public.example.com";
    process.env.MINIO_PUBLIC_PORT = "443";
    process.env.MINIO_REGION = "eu-west-1";

    const client = createStorageClientFromEnv();
    assert.equal(client.bucket, "my-bucket");
  });
});
