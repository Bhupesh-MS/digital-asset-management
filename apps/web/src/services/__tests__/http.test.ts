import { describe, it, expect } from "vitest";
import { ApiError, parseJsonResponse } from "../http.js";

describe("http", () => {
  it("ApiError constructs properly", () => {
    const err = new ApiError("msg", 404);
    expect(err.message).toBe("msg");
    expect(err.status).toBe(404);
    expect(err.name).toBe("ApiError");
  });

  it("parseJsonResponse throws ApiError on failure", async () => {
    const response = new Response(null, { status: 500, statusText: "Server Error" });
    await expect(parseJsonResponse(response, "fallback")).rejects.toThrow("fallback");
  });

  it("parseJsonResponse returns json on success", async () => {
    const response = new Response(JSON.stringify({ key: "val" }), { status: 200 });
    const data = await parseJsonResponse(response, "fallback");
    expect(data).toEqual({ key: "val" });
  });
});
