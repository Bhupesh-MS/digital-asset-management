import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GalleryPage } from "../GalleryPage.js";
import { usePaginatedAssets } from "../../hooks/usePaginatedAssets.js";

vi.mock("../../hooks/usePaginatedAssets.js", () => ({
  usePaginatedAssets: vi.fn()
}));

describe("GalleryPage", () => {
  it("renders gallery and pagination", () => {
    vi.mocked(usePaginatedAssets).mockReturnValue({
      assets: [],
      error: null,
      hasNextPage: false,
      hasPreviousPage: false,
      loading: false,
      page: 1,
      pageSize: 5,
      success: null,
      total: 0,
      loadPage: vi.fn()
    });

    render(<GalleryPage />);
    expect(screen.getByText("Uploaded files")).toBeInTheDocument();
    expect(screen.getByText("No assets found.")).toBeInTheDocument();
    expect(screen.getByText("Page 1 · 0 total files")).toBeInTheDocument();
  });
});
