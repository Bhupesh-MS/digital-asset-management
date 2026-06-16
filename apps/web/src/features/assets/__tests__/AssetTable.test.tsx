import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AssetTable } from "../AssetTable.js";
import type { AssetDto } from "@dam/shared-types";

describe("AssetTable", () => {
  const mockAsset: AssetDto = {
    id: "1",
    filename: "test.jpg",
    originalFilename: "test.jpg",
    mimeType: "image/jpeg",
    type: "IMAGE",
    sizeBytes: 1048576, // 1MB
    status: "READY",
    bucket: "test",
    objectKey: "test",
    tags: ["nature"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  it("renders loading state", () => {
    render(<AssetTable assets={[]} loading={true} />);
    expect(screen.getByText("Loading assets...")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<AssetTable assets={[]} loading={false} />);
    expect(screen.getByText("No assets yet.")).toBeInTheDocument();
  });

  it("renders assets in table", () => {
    render(<AssetTable assets={[mockAsset]} loading={false} />);
    expect(screen.getByText("test.jpg")).toBeInTheDocument();
    expect(screen.getByText("1.00 MB")).toBeInTheDocument();
    expect(screen.getByText("image/jpeg")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    // tags not displayed in table
  });
});
