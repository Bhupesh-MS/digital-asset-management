import { describe, it, expect, vi, beforeEach } from "vitest";
import { loginAdmin } from "../auth.service.js";

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("auth.service", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("loginAdmin success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          token: "123",
          user: { id: "admin", email: "admin@test.com", role: "admin" }
        }
      })
    });
    const result = await loginAdmin({ id: "admin", password: "pass" });
    expect(result).toEqual({ token: "123" });
  });

  it("loginAdmin fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(loginAdmin({ id: "admin", password: "pass" })).rejects.toThrow("Unable to login");
  });
});
