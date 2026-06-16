import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAssets, uploadAssetFiles, shareAsset, getDownloadUrl, fetchAdminAnalytics } from "../assets.service.js";

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("assets.service", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("fetchAssets", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { assets: [], pagination: { total: 0, page: 1, perPage: 5 } } })
    });
    const result = await fetchAssets(1, 5, "token123");
    expect(result).toEqual({ assets: [], total: 0, page: 1, pageSize: 5 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("page=1"),
      expect.objectContaining({
        headers: { Authorization: "Bearer token123" }
      })
    );
  });

  it("fetchAssets error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(fetchAssets()).rejects.toThrow("Unable to fetch assets");
  });

  it("uploadAssetFiles", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const result = await uploadAssetFiles([file], ["tag1"], "cat1");
    expect(result).toEqual({ success: true });
  });

  it("uploadAssetFiles error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(uploadAssetFiles([])).rejects.toThrow("Unable to upload files");
  });

  it("shareAsset", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { share: { token: "token", expiresAt: "exp" } } })
    });
    const result = await shareAsset("id1", "auth_token");
    expect(result).toEqual({ token: "token", expiresAt: "exp", url: "http://localhost:3000/assets/shared/token" });
  });

  it("shareAsset error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(shareAsset("id")).rejects.toThrow("Unable to share asset");
  });

  it("getDownloadUrl", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { url: "dl_url" } }) });
    const result = await getDownloadUrl("id1");
    expect(result).toEqual({ url: "dl_url" });
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/assets/id1/download"), expect.any(Object));
  });

  it("getDownloadUrl with preview", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { url: "dl_preview_url" } }) });
    const result = await getDownloadUrl("id1", true);
    expect(result).toEqual({ url: "dl_preview_url" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/assets/id1/download?preview=true"),
      expect.any(Object)
    );
  });

  it("getDownloadUrl error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(getDownloadUrl("id")).rejects.toThrow("Unable to get download url");
  });

  it("fetchAdminAnalytics", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { totals: { uploads: 1, downloads: 2, shares: 3 } } })
    });
    const result = await fetchAdminAnalytics("token");
    expect(result).toEqual({ totalUploads: 1, totalDownloads: 2, totalShares: 3 });
  });

  it("fetchAdminAnalytics error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(fetchAdminAnalytics("token")).rejects.toThrow("Unable to fetch analytics");
  });
});
