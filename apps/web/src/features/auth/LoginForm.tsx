import { LockKeyhole } from "lucide-react";
import type { FormEvent } from "react";

export function LoginForm({
  loading,
  onSubmit
}: {
  loading: boolean;
  onSubmit: (id: string, password: string) => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit(String(form.get("id")), String(form.get("password")));
  }

  return (
    <form className="max-w-md rounded-md border border-line bg-white p-5" onSubmit={handleSubmit}>
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand text-white">
          <LockKeyhole size={18} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-ink">Admin login</h2>
          <p className="text-sm text-slate-500">Use admin ID and password.</p>
        </div>
      </div>
      <label className="mb-3 block text-sm font-medium text-ink">
        ID
        <input
          className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-brand"
          name="id"
          required
        />
      </label>
      <label className="mb-4 block text-sm font-medium text-ink">
        Password
        <input
          className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-brand"
          name="password"
          required
          type="password"
        />
      </label>
      <button
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        disabled={loading}
        type="submit"
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
