import test from "node:test";
import assert from "node:assert/strict";
import { logger } from "./index.js";

test("logger exposes info method", () => {
  assert.equal(typeof logger.info, "function");
});
