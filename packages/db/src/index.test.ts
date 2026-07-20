import test from "node:test";
import assert from "node:assert/strict";

test("prisma client is exported", async () => {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost:5432/dummy";
  const { prisma } = await import("./index.js");
  assert.ok(prisma !== undefined);
});

test("pool config enables SSL when DATABASE_SSL is true", async () => {
  const { createPoolConfig } = await import("./index.js");
  const config = createPoolConfig("postgresql://dummy:dummy@localhost:5432/dummy", {
    DATABASE_SSL: "true",
    DATABASE_SSL_REJECT_UNAUTHORIZED: "false"
  });

  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
  assert.match(config.connectionString, /[?&]ssl=true(?:&|$)/);
  assert.match(config.connectionString, /[?&]sslmode=require(?:&|$)/);
});

test("pool config enables SSL when connection string requires it", async () => {
  const { createPoolConfig } = await import("./index.js");
  const config = createPoolConfig(
    "postgresql://dummy:dummy@localhost:5432/dummy?schema=public&sslmode=require",
    {}
  );

  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
  assert.match(config.connectionString, /[?&]ssl=true(?:&|$)/);
});
