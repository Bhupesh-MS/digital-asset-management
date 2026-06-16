import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UploadPage } from "../UploadPage.js";
import * as assetsService from "../../services/assets.service.js";

vi.mock("../../services/assets.service.js", () => ({
  uploadAssetFiles: vi.fn()
}));

describe("UploadPage", () => {
  it("renders upload panel and handles success", async () => {
    vi.mocked(assetsService.uploadAssetFiles).mockResolvedValueOnce({ success: true, data: { assets: [] } });

    render(<UploadPage />);
    expect(screen.getByText("Upload image and video files")).toBeInTheDocument();

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByLabelText("Browse files", { selector: "input" });

    // Fake adding files
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadBtn = screen.getByText("Upload 1 file");
    expect(uploadBtn).not.toBeDisabled();

    fireEvent.click(uploadBtn);

    await vi.waitFor(() => {
      expect(screen.getByText("1 file submitted successfully.")).toBeInTheDocument();
    });
  });

  it("handles validation error", () => {
    render(<UploadPage />);
    const file = new File(["test"], "test.txt", { type: "text/plain" });
    const fileInput = screen.getByLabelText("Browse files", { selector: "input" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadBtn = screen.getByText("Upload 1 file");
    expect(uploadBtn).toBeDisabled();

    // We can manually trigger submit to see error if we force it, but disabled button is enough
  });
});
