import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { usePaginatedAssets } from "../usePaginatedAssets.js";
import * as assetsService from "../../services/assets.service.js";
import { ApiError } from "../../services/http.js";

vi.mock("../../services/assets.service.js", () => ({
  fetchAssets: vi.fn()
}));

describe("usePaginatedAssets", () => {
  it("fetches first page on mount", async () => {
    vi.mocked(assetsService.fetchAssets).mockResolvedValueOnce({
      assets: [{ id: "1" } as any],
      total: 10,
      page: 1,
      pageSize: 5
    });

    const { result } = renderHook(() => usePaginatedAssets());

    expect(result.current.loading).toBe(true);

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.assets).toHaveLength(1);
      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.hasPreviousPage).toBe(false);
    });
  });

  it("handles pagination", async () => {
    vi.mocked(assetsService.fetchAssets).mockResolvedValueOnce({
      assets: [],
      total: 10,
      page: 1,
      pageSize: 5
    });

    const { result } = renderHook(() => usePaginatedAssets());

    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(assetsService.fetchAssets).mockResolvedValueOnce({
      assets: [{ id: "2" } as any],
      total: 10,
      page: 2,
      pageSize: 5
    });

    await act(async () => {
      await result.current.loadPage(2);
    });

    expect(result.current.page).toBe(2);
    expect(result.current.hasPreviousPage).toBe(true);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("handles unauthorized", async () => {
    const error = new ApiError("Auth failed", 401);
    vi.mocked(assetsService.fetchAssets).mockRejectedValueOnce(error);
    const onUnauthorized = vi.fn();

    const { result } = renderHook(() => usePaginatedAssets("token", onUnauthorized));

    await vi.waitFor(() => {
      expect(onUnauthorized).toHaveBeenCalled();
    });
  });
});
