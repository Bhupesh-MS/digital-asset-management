import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore, isJwtExpired } from "../../store/auth.store.js";

describe("auth.store", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, isLoggedIn: false });
  });

  it("isJwtExpired returns true for invalid tokens", () => {
    expect(isJwtExpired("invalid")).toBe(true);
    expect(isJwtExpired("invalid.payload.sig")).toBe(true);
  });

  it("isJwtExpired returns true for expired token", () => {
    const expiredPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 100 }));
    expect(isJwtExpired(`header.${expiredPayload}.sig`)).toBe(true);
  });

  it("isJwtExpired returns false for valid token", () => {
    const validPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 1000 }));
    expect(isJwtExpired(`header.${validPayload}.sig`)).toBe(false);
  });

  it("setToken and logout", () => {
    const { setToken, logout } = useAuthStore.getState();
    setToken("test_token");
    expect(localStorage.getItem("dam_admin_token")).toBe("test_token");
    expect(useAuthStore.getState().token).toBe("test_token");
    expect(useAuthStore.getState().isLoggedIn).toBe(true);

    logout();
    expect(localStorage.getItem("dam_admin_token")).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });

  it("syncFromStorage", () => {
    localStorage.setItem("dam_admin_token", "stored_token");
    // Mock valid token
    const validPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 1000 }));
    localStorage.setItem("dam_admin_token", `header.${validPayload}.sig`);

    useAuthStore.getState().syncFromStorage();
    expect(useAuthStore.getState().token).toBe(`header.${validPayload}.sig`);
  });
});
