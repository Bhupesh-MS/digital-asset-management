import test from "node:test";
import assert from "node:assert/strict";

test("prisma client is exported", async () => {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost:5432/dummy";
  const { prisma } = await import("./index.js");
  assert.ok(prisma !== undefined);
});
