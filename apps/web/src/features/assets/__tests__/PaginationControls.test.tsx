import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PaginationControls } from "../PaginationControls.js";

describe("PaginationControls", () => {
  it("renders correctly with multiple pages", () => {
    const onPageChange = vi.fn();
    render(
      <PaginationControls
        hasNextPage={true}
        hasPreviousPage={true}
        loading={false}
        onPageChange={onPageChange}
        page={2}
        total={15}
      />
    );

    expect(screen.getByText("Page 2 · 15 total files")).toBeInTheDocument();

    const prevBtn = screen.getByText("Previous");
    const nextBtn = screen.getByText("Next");

    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("disables buttons appropriately", () => {
    render(
      <PaginationControls
        hasNextPage={false}
        hasPreviousPage={false}
        loading={true}
        onPageChange={vi.fn()}
        page={1}
        total={5}
      />
    );

    const prevBtn = screen.getByText("Previous");
    const nextBtn = screen.getByText("Next");

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeDisabled();
  });
});
