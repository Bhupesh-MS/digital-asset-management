import test from "node:test";
import assert from "node:assert/strict";
import { createId, nowIso } from "./index.js";

test("createId generates prefixed string", () => {
  const id = createId("test");
  assert.ok(id.startsWith("test_"));
});

test("nowIso returns valid ISO string", () => {
  const iso = nowIso();
  assert.ok(!isNaN(Date.parse(iso)));
});
