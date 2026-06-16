import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useAdminAnalytics } from "../useAdminAnalytics.js";
import * as assetsService from "../../services/assets.service.js";
import { ApiError } from "../../services/http.js";

vi.mock("../../services/assets.service.js", () => ({
  fetchAdminAnalytics: vi.fn()
}));

describe("useAdminAnalytics", () => {
  it("fetches analytics", async () => {
    vi.mocked(assetsService.fetchAdminAnalytics).mockResolvedValueOnce({
      totalUploads: 10,
      totalDownloads: 5,
      totalShares: 2
    });

    const onUnauthorized = vi.fn();
    const { result } = renderHook(() => useAdminAnalytics("token", onUnauthorized));

    expect(result.current.loading).toBe(true);

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.analytics).toEqual({ totalUploads: 10, totalDownloads: 5, totalShares: 2 });
    });
  });

  it("handles unauthorized", async () => {
    const error = new ApiError("Auth failed", 401);
    vi.mocked(assetsService.fetchAdminAnalytics).mockRejectedValueOnce(error);
    const onUnauthorized = vi.fn();

    const { result } = renderHook(() => useAdminAnalytics("token", onUnauthorized));

    await vi.waitFor(() => {
      expect(onUnauthorized).toHaveBeenCalled();
    });
  });

  it("handles generic error", async () => {
    vi.mocked(assetsService.fetchAdminAnalytics).mockRejectedValueOnce(new Error("Fail"));

    const onUnauthorized = vi.fn();
    const { result } = renderHook(() => useAdminAnalytics("token", onUnauthorized));

    await vi.waitFor(() => {
      expect(result.current.error).toBe("Fail");
    });
  });
});
