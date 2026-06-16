import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useAssets } from "../useAssets.js";
import * as assetsService from "../../services/assets.service.js";

vi.mock("../../services/assets.service.js", () => ({
  fetchAssets: vi.fn(),
  uploadAssetFiles: vi.fn()
}));

describe("useAssets", () => {
  it("fetches assets on mount", async () => {
    vi.mocked(assetsService.fetchAssets).mockResolvedValueOnce({
      assets: [{ id: "1" } as any],
      total: 1,
      page: 1,
      pageSize: 5
    });

    const { result } = renderHook(() => useAssets());

    expect(result.current.loading).toBe(true);

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.assets).toHaveLength(1);
    });
  });

  it("handles createAsset", async () => {
    vi.mocked(assetsService.fetchAssets).mockResolvedValue({
      assets: [],
      total: 0,
      page: 1,
      pageSize: 5
    });
    vi.mocked(assetsService.uploadAssetFiles).mockResolvedValueOnce({ success: true, data: { assets: [] } });

    const { result } = renderHook(() => useAssets());

    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createAsset([new File(["test"], "test.jpg", { type: "image/jpeg" })]);
    });

    expect(assetsService.uploadAssetFiles).toHaveBeenCalled();
    expect(assetsService.fetchAssets).toHaveBeenCalled(); // mount + refresh + maybe effect
  });
});
