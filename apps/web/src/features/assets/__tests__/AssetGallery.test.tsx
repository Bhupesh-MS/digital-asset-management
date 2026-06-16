import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AssetGallery } from "../AssetGallery.js";
import * as assetsService from "../../../services/assets.service.js";
import type { AssetItem } from "../../../types/assets.js";

vi.mock("../../../services/assets.service.js", () => ({
  shareAsset: vi.fn(),
  getDownloadUrl: vi.fn()
}));

const mockAsset: AssetItem = {
  id: "1",
  filename: "test.jpg",
  originalFilename: "test.jpg",
  mimeType: "image/jpeg",
  type: "IMAGE",
  sizeBytes: 1024 * 1024 * 2, // 2MB
  status: "READY",
  bucket: "test",
  objectKey: "test",
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  previewUrl: "preview_url",
  downloadUrl: "download_url"
};

describe("AssetGallery", () => {
  it("renders loading state", () => {
    render(<AssetGallery assets={[]} loading={true} />);
    expect(screen.getByText("Loading assets...")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<AssetGallery assets={[]} loading={false} />);
    expect(screen.getByText("No assets found.")).toBeInTheDocument();
  });

  it("renders assets", () => {
    render(<AssetGallery assets={[mockAsset]} loading={false} />);
    expect(screen.getByText("test.jpg")).toBeInTheDocument();
    expect(screen.getByText("image/jpeg · 2.00 MB")).toBeInTheDocument();
  });

  it("handles share", async () => {
    vi.mocked(assetsService.shareAsset).mockResolvedValueOnce({ url: "shared_url", token: "token", expiresAt: "exp" });
    const clipboardMock = { writeText: vi.fn() };
    Object.assign(navigator, { clipboard: clipboardMock });
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<AssetGallery assets={[mockAsset]} loading={false} />);
    const shareBtn = screen.getByTitle("Share");
    fireEvent.click(shareBtn);

    // wait for async
    await vi.waitFor(() => {
      expect(assetsService.shareAsset).toHaveBeenCalledWith("1", undefined);
      expect(clipboardMock.writeText).toHaveBeenCalledWith("shared_url");
      expect(alertMock).toHaveBeenCalledWith("Shared link copied to clipboard!");
    });
  });

  it("handles share error", async () => {
    vi.mocked(assetsService.shareAsset).mockRejectedValueOnce(new Error("fail"));
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<AssetGallery assets={[mockAsset]} loading={false} />);
    const shareBtn = screen.getByTitle("Share");
    fireEvent.click(shareBtn);

    await vi.waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith("Failed to share asset.");
    });
  });

  it("handles download with directUrl", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      blob: () => Promise.resolve(new Blob(["test"]))
    } as any);
    vi.spyOn(window.URL, "createObjectURL").mockReturnValueOnce("blob_url");
    vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});

    render(<AssetGallery assets={[mockAsset]} loading={false} />);
    const downloadBtn = screen.getByTitle("Download");
    fireEvent.click(downloadBtn);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("download_url");
    });
  });

  it("handles download using API when directUrl is missing", async () => {
    vi.mocked(assetsService.getDownloadUrl).mockResolvedValueOnce({ url: "api_dl_url" });
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      blob: () => Promise.resolve(new Blob(["test"]))
    } as any);
    vi.spyOn(window.URL, "createObjectURL").mockReturnValueOnce("blob_url");
    vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});

    render(<AssetGallery assets={[{ ...mockAsset, downloadUrl: undefined }]} loading={false} />);
    const downloadBtn = screen.getByTitle("Download");
    fireEvent.click(downloadBtn);

    await vi.waitFor(() => {
      expect(assetsService.getDownloadUrl).toHaveBeenCalledWith("1");
      expect(fetchMock).toHaveBeenCalledWith("api_dl_url");
    });
  });
});
