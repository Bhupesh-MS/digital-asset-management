import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Navbar } from "../Navbar.js";
import { useAuthStore } from "../../../store/auth.store.js";

vi.mock("../../../store/auth.store.js", () => ({
  useAuthStore: vi.fn()
}));

describe("Navbar", () => {
  it("renders nav items and active state", () => {
    vi.mocked(useAuthStore).mockReturnValue({ isLoggedIn: false, logout: vi.fn() } as any);
    const navigate = vi.fn();
    render(<Navbar currentRoute="/gallery" navigate={navigate} />);

    const galleryBtn = screen.getByTitle("Gallery");
    expect(galleryBtn.className).toContain("bg-brand"); // active

    const uploadBtn = screen.getByTitle("Upload file");
    fireEvent.click(uploadBtn);
    expect(navigate).toHaveBeenCalledWith("/upload");
  });

  it("renders logout when logged in", () => {
    const logoutMock = vi.fn();
    vi.mocked(useAuthStore).mockReturnValue({ isLoggedIn: true, logout: logoutMock } as any);
    const navigate = vi.fn();
    render(<Navbar currentRoute="/admin" navigate={navigate} />);

    const logoutBtn = screen.getByTitle("Logout");
    fireEvent.click(logoutBtn);
    expect(logoutMock).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/admin/login");
  });
});
