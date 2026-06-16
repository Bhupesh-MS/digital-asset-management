import { useState } from "react";
import { Alert } from "../components/Alert.js";
import { PageShell } from "../components/layout/PageShell.js";
import { LoginForm } from "../features/auth/LoginForm.js";
import type { AppRoute } from "../hooks/useRouter.js";
import { loginAdmin } from "../services/auth.service.js";
import { useAuthStore } from "../store/auth.store.js";

export function AdminLoginPage({ navigate }: { navigate: (route: AppRoute) => void }) {
  const setToken = useAuthStore((state: any) => state.setToken);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(id: string, password: string) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await loginAdmin({ id, password });
      setToken(response.token);
      setSuccess("Login successful.");
      navigate("/admin");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell eyebrow="Admin" title="Login" description="Sign in to access the protected dashboard.">
      <div className="mb-4 grid max-w-md gap-3">
        <Alert message={success} tone="success" />
        <Alert message={error} tone="error" />
      </div>
      <LoginForm loading={loading} onSubmit={handleLogin} />
    </PageShell>
  );
}
