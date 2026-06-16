import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AdminDashboardPage } from "../AdminDashboardPage.js";
import { useAdminAnalytics } from "../../hooks/useAdminAnalytics.js";
import { usePaginatedAssets } from "../../hooks/usePaginatedAssets.js";
import { useAuthStore } from "../../store/auth.store.js";

vi.mock("../../hooks/useAdminAnalytics.js", () => ({ useAdminAnalytics: vi.fn() }));
vi.mock("../../hooks/usePaginatedAssets.js", () => ({ usePaginatedAssets: vi.fn() }));
vi.mock("../../store/auth.store.js", () => ({ useAuthStore: vi.fn() }));

describe("AdminDashboardPage", () => {
  it("renders analytics and assets", () => {
    vi.mocked(useAuthStore).mockReturnValue("token123" as any);
    vi.mocked(useAdminAnalytics).mockReturnValue({
      analytics: { totalUploads: 5, totalDownloads: 2, totalShares: 1 },
      loading: false,
      error: null,
      refresh: vi.fn() as any
    });
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

    render(<AdminDashboardPage onUnauthorized={vi.fn()} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Total uploads")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Total downloads")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Total shares")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("All assets")).toBeInTheDocument();
  });
});
