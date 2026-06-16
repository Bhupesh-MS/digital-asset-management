import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HomePage } from "../HomePage.js";

describe("HomePage", () => {
  it("renders and navigates", () => {
    const navigate = vi.fn();
    render(<HomePage navigate={navigate} />);

    expect(screen.getByText("A simple digital asset hub for teams")).toBeInTheDocument();

    const uploadBtn = screen.getByText("Upload files");
    fireEvent.click(uploadBtn);
    expect(navigate).toHaveBeenCalledWith("/upload");

    const galleryBtn = screen.getByText("Browse gallery");
    fireEvent.click(galleryBtn);
    expect(navigate).toHaveBeenCalledWith("/gallery");

    const adminBtn = screen.getByText("Admin dashboard");
    // Button is inside a div, find by text "Open admin "
    const openAdminBtn = screen.getByText(/Open admin/);
    fireEvent.click(openAdminBtn);
    expect(navigate).toHaveBeenCalledWith("/admin");
  });
});
