import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LoginForm } from "../LoginForm.js";

describe("LoginForm", () => {
  it("renders and submits", () => {
    const onSubmit = vi.fn();
    render(<LoginForm loading={false} onSubmit={onSubmit} />);

    const idInput = screen.getByLabelText("ID");
    const pwdInput = screen.getByLabelText("Password");
    const submitBtn = screen.getByText("Login");

    fireEvent.change(idInput, { target: { value: "admin1" } });
    fireEvent.change(pwdInput, { target: { value: "pass1" } });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith("admin1", "pass1");
  });

  it("disables button while loading", () => {
    render(<LoginForm loading={true} onSubmit={vi.fn()} />);
    const submitBtn = screen.getByText("Logging in...");
    expect(submitBtn).toBeDisabled();
  });
});
