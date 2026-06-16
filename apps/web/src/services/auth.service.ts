import { API_BASE_URL, parseJsonResponse } from "./http.js";

export interface LoginRequest {
  id: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

interface WrappedLoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      role: string;
    };
  };
}

export async function loginAdmin(request: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });

  const result = await parseJsonResponse<WrappedLoginResponse>(response, "Unable to login");
  return { token: result.data.token };
}
