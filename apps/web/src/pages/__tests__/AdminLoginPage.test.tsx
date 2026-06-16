import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AdminLoginPage } from "../AdminLoginPage.js";
import * as authService from "../../services/auth.service.js";
import { useAuthStore } from "../../store/auth.store.js";

vi.mock("../../services/auth.service.js", () => ({ loginAdmin: vi.fn() }));
vi.mock("../../store/auth.store.js", () => ({ useAuthStore: vi.fn() }));

describe("AdminLoginPage", () => {
  it("handles successful login", async () => {
    const setToken = vi.fn();
    vi.mocked(useAuthStore).mockReturnValue(setToken as any);
    vi.mocked(authService.loginAdmin).mockResolvedValueOnce({ token: "tok123" });
    const navigate = vi.fn();

    render(<AdminLoginPage navigate={navigate} />);

    const idInput = screen.getByLabelText("ID");
    const pwdInput = screen.getByLabelText("Password");
    const submitBtn = screen.getByRole("button", { name: "Login" });

    fireEvent.change(idInput, { target: { value: "admin" } });
    fireEvent.change(pwdInput, { target: { value: "pass" } });
    fireEvent.click(submitBtn);

    await vi.waitFor(() => {
      expect(authService.loginAdmin).toHaveBeenCalledWith({ id: "admin", password: "pass" });
      expect(setToken).toHaveBeenCalledWith("tok123");
      expect(navigate).toHaveBeenCalledWith("/admin");
    });
  });

  it("handles login error", async () => {
    vi.mocked(useAuthStore).mockReturnValue(vi.fn() as any);
    vi.mocked(authService.loginAdmin).mockRejectedValueOnce(new Error("Bad credentials"));
    const navigate = vi.fn();

    render(<AdminLoginPage navigate={navigate} />);

    const idInput = screen.getByLabelText("ID");
    const pwdInput = screen.getByLabelText("Password");
    const submitBtn = screen.getByRole("button", { name: "Login" });

    fireEvent.change(idInput, { target: { value: "admin" } });
    fireEvent.change(pwdInput, { target: { value: "pass" } });
    fireEvent.click(submitBtn);

    await vi.waitFor(() => {
      expect(screen.getByText("Bad credentials")).toBeInTheDocument();
    });
  });
});
