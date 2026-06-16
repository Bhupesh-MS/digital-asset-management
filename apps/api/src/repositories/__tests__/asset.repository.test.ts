import test from "node:test";
import assert from "node:assert/strict";
import { AssetRepository } from "../asset.repository.js";

test("AssetRepository", async (t) => {
  let findManyCalled = false;
  let countCalled = false;
  let createCalled = false;
  let findUniqueCalled = false;
  let createShareLinkCalled = false;
  let findShareLinkCalled = false;

  const mockPrisma = {
    asset: {
      findMany: async (_args: any) => {
        findManyCalled = true;
        return [
          {
            id: "asset_1",
            filename: "test.jpg",
            originalFilename: "test.jpg",
            mimeType: "image/jpeg",
            type: "IMAGE",
            sizeBytes: BigInt(100),
            status: "READY",
            bucket: "test-bucket",
            objectKey: "test.jpg",
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: []
          }
        ];
      },
      count: async () => {
        countCalled = true;
        return 1;
      },
      create: async (args: any) => {
        createCalled = true;
        return {
          id: "asset_new",
          filename: args.data.filename,
          originalFilename: args.data.originalFilename,
          mimeType: args.data.mimeType,
          type: args.data.type,
          sizeBytes: args.data.sizeBytes,
          status: "QUEUED",
          bucket: args.data.bucket,
          objectKey: args.data.objectKey,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: []
        };
      },
      findUnique: async (args: any) => {
        findUniqueCalled = true;
        if (args.where.id === "asset_1") {
          return {
            id: "asset_1",
            filename: "test.jpg",
            originalFilename: "test.jpg",
            mimeType: "image/jpeg",
            type: "IMAGE",
            sizeBytes: BigInt(100),
            status: "READY",
            bucket: "test-bucket",
            objectKey: "test.jpg",
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: []
          };
        }
        return null;
      }
    },
    shareLink: {
      create: async (args: any) => {
        createShareLinkCalled = true;
        return {
          id: "share_1",
          status: "ACTIVE",
          expiresAt: args.data.expiresAt,
          createdAt: new Date()
        };
      },
      findUnique: async (args: any) => {
        findShareLinkCalled = true;
        if (args.where.tokenHash === "valid_hash") {
          return {
            id: "share_1",
            tokenHash: "valid_hash",
            status: "ACTIVE",
            expiresAt: null,
            createdAt: new Date(),
            asset: {
              id: "asset_1",
              filename: "test.jpg",
              originalFilename: "test.jpg",
              mimeType: "image/jpeg",
              type: "IMAGE",
              sizeBytes: BigInt(100),
              status: "READY",
              bucket: "test-bucket",
              objectKey: "test.jpg",
              createdAt: new Date(),
              updatedAt: new Date(),
              tags: []
            }
          };
        }
        return null;
      }
    }
  };

  const repo = new AssetRepository(mockPrisma as any);

  await t.test("findMany", async () => {
    const res = await repo.findMany({
      page: 1,
      type: "IMAGE",
      status: "READY",
      search: "test",
      tag: "hero",
      dateFrom: new Date(),
      dateTo: new Date()
    });
    assert.equal(findManyCalled, true);
    assert.equal(countCalled, true);
    assert.equal(res.total, 1);
    assert.equal(res.assets.length, 1);
  });

  await t.test("create image", async () => {
    const res = await repo.create({
      filename: "test.jpg",
      originalFilename: "test.jpg",
      mimeType: "image/jpeg",
      type: "IMAGE",
      sizeBytes: 100,
      checksumSha256: "hash",
      bucket: "test-bucket",
      objectKey: "test.jpg",
      tags: [{ name: "hero", source: "USER" }],
      category: "marketing"
    });
    assert.equal(createCalled, true);
    assert.equal(res.id, "asset_new");
  });

  await t.test("create video", async () => {
    const res = await repo.create({
      filename: "test.mp4",
      originalFilename: "test.mp4",
      mimeType: "video/mp4",
      type: "VIDEO",
      sizeBytes: 100,
      checksumSha256: "hash",
      bucket: "test-bucket",
      objectKey: "test.mp4",
      tags: []
    });
    assert.equal(res.id, "asset_new");
  });

  await t.test("findById", async () => {
    const res = await repo.findById("asset_1");
    assert.equal(findUniqueCalled, true);
    assert.equal(res?.id, "asset_1");

    const missing = await repo.findById("asset_missing");
    assert.equal(missing, null);
  });

  await t.test("createShareLink", async () => {
    const res = await repo.createShareLink({ assetId: "asset_1", tokenHash: "hash" });
    assert.equal(createShareLinkCalled, true);
    assert.equal(res.id, "share_1");
  });

  await t.test("findShareLinkByTokenHash", async () => {
    const res = await repo.findShareLinkByTokenHash("valid_hash");
    assert.equal(findShareLinkCalled, true);
    assert.equal(res?.id, "share_1");

    const missing = await repo.findShareLinkByTokenHash("invalid_hash");
    assert.equal(missing, null);
  });
});
