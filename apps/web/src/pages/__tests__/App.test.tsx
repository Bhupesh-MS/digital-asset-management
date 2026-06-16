import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { App } from "../App.js";
import { useRouter } from "../../hooks/useRouter.js";

vi.mock("../../hooks/useRouter.js", () => ({
  useRouter: vi.fn()
}));

describe("App", () => {
  it("renders HomePage on /", () => {
    vi.mocked(useRouter).mockReturnValue({ route: "/", navigate: vi.fn() });
    render(<App />);
    expect(screen.getByText("A simple digital asset hub for teams")).toBeInTheDocument();
  });

  it("renders UploadPage on /upload", () => {
    vi.mocked(useRouter).mockReturnValue({ route: "/upload", navigate: vi.fn() });
    render(<App />);
    expect(screen.getByText("Upload image and video files")).toBeInTheDocument();
  });

  it("renders GalleryPage on /gallery", () => {
    vi.mocked(useRouter).mockReturnValue({ route: "/gallery", navigate: vi.fn() });
    render(<App />);
    expect(screen.getByText("Uploaded files")).toBeInTheDocument();
  });

  it("renders AdminLoginPage on /admin/login", () => {
    vi.mocked(useRouter).mockReturnValue({ route: "/admin/login", navigate: vi.fn() });
    render(<App />);
    expect(screen.getByText("Sign in to access the protected dashboard.")).toBeInTheDocument();
  });
});
