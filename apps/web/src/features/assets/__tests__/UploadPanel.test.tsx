import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UploadPanel } from "../UploadPanel.js";

describe("UploadPanel", () => {
  it("renders with files and optional inputs", () => {
    const files = [new File(["test"], "test.jpg", { type: "image/jpeg" })];
    const onTagsChange = vi.fn();
    const onCategoryChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <UploadPanel
        files={files}
        loading={false}
        onFilesChange={vi.fn()}
        onSubmit={onSubmit}
        validationError={null}
        tags="nature"
        onTagsChange={onTagsChange}
        category="marketing"
        onCategoryChange={onCategoryChange}
      />
    );

    expect(screen.getByText("Selected files (1)")).toBeInTheDocument();

    const tagsInput = screen.getByPlaceholderText("nature, landscape");
    fireEvent.change(tagsInput, { target: { value: "testtag" } });
    expect(onTagsChange).toHaveBeenCalledWith("testtag");

    const categoryInput = screen.getByPlaceholderText("Marketing");
    fireEvent.change(categoryInput, { target: { value: "testcat" } });
    expect(onCategoryChange).toHaveBeenCalledWith("testcat");

    const uploadBtn = screen.getByText("Upload 1 file");
    fireEvent.click(uploadBtn);
    expect(onSubmit).toHaveBeenCalled();
  });
});
