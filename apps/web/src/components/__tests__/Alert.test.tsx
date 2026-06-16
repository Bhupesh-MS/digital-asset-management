import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Alert } from "../Alert.js";

describe("Alert", () => {
  it("renders nothing when message is null", () => {
    const { container } = render(<Alert message={null} tone="success" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders success alert", () => {
    render(<Alert message="Success message" tone="success" />);
    expect(screen.getByText("Success message")).toBeInTheDocument();
  });

  it("renders error alert", () => {
    render(<Alert message="Error message" tone="error" />);
    expect(screen.getByText("Error message")).toBeInTheDocument();
  });
});
