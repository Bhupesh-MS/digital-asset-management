import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "../StatusBadge.js";
import type { AssetStatus } from "@dam/shared-types";

describe("StatusBadge", () => {
  const statuses: AssetStatus[] = ["UPLOADED", "QUEUED", "PROCESSING", "READY", "FAILED", "ARCHIVED"];

  it.each(statuses)("renders badge for status %s", (status) => {
    render(<StatusBadge status={status} />);
    const labels: Record<AssetStatus, string> = {
      UPLOADED: "Uploaded",
      QUEUED: "Queued",
      PROCESSING: "Processing",
      READY: "Ready",
      FAILED: "Failed",
      ARCHIVED: "Archived"
    };
    expect(screen.getByText(labels[status])).toBeInTheDocument();
  });
});
