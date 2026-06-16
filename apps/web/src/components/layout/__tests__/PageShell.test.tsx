import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PageShell } from "../PageShell.js";

describe("PageShell", () => {
  it("renders correctly", () => {
    render(
      <PageShell eyebrow="Test Eyebrow" title="Test Title" description="Test Desc">
        <div data-testid="child">Child Content</div>
      </PageShell>
    );

    expect(screen.getByText("Test Eyebrow")).toBeInTheDocument();
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Desc")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
