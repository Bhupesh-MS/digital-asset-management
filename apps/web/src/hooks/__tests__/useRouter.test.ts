import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useRouter, getCurrentRoute } from "../useRouter.js";

describe("useRouter", () => {
  it("getCurrentRoute returns default route if not found", () => {
    Object.defineProperty(window, "location", { value: { hash: "#/invalid" }, writable: true });
    expect(getCurrentRoute()).toBe("/");
  });

  it("getCurrentRoute returns matched route", () => {
    window.location.hash = "#/upload";
    expect(getCurrentRoute()).toBe("/upload");
  });

  it("initializes with current route", () => {
    window.location.hash = "#/gallery";
    const { result } = renderHook(() => useRouter());
    expect(result.current.route).toBe("/gallery");
  });

  it("navigates to new route", () => {
    const { result } = renderHook(() => useRouter());
    act(() => {
      result.current.navigate("/admin");
    });
    expect(result.current.route).toBe("/admin");
  });
});
