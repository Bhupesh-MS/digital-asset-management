import { Image, LayoutDashboard, LogOut, Upload } from "lucide-react";
import type { AppRoute } from "../../hooks/useRouter.js";
import { useAuthStore } from "../../store/auth.store.js";

export function Navbar({ currentRoute, navigate }: { currentRoute: AppRoute; navigate: (route: AppRoute) => void }) {
  const { isLoggedIn, logout } = useAuthStore();

  function handleLogout() {
    logout();
    navigate("/admin/login");
  }

  const dynamicNavItems: Array<{ href: AppRoute; label: string; icon: typeof Upload }> = [
    { href: "/upload", label: "Upload file", icon: Upload },
    { href: "/gallery", label: "Gallery", icon: Image }
  ];

  if (isLoggedIn) {
    dynamicNavItems.push({ href: "/admin", label: "Admin", icon: LayoutDashboard });
  } else {
    dynamicNavItems.push({ href: "/admin/login", label: "Admin Login", icon: LayoutDashboard });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
        <button className="text-left" onClick={() => navigate("/")} type="button">
          <span className="block text-base font-semibold text-ink">Digital Asset Management</span>
          <span className="block text-xs text-slate-500">Upload, preview, and manage assets</span>
        </button>
        <div className="flex items-center gap-2">
          {dynamicNavItems.map((item) => {
            const Icon = item.icon;
            const active = currentRoute === item.href;
            return (
              <button
                className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition ${
                  active ? "bg-brand text-white" : "text-slate-700 hover:bg-fog hover:text-ink"
                }`}
                key={item.href}
                onClick={() => navigate(item.href)}
                title={item.label}
                type="button"
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
          {isLoggedIn ? (
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-medium text-slate-700 hover:bg-fog"
              onClick={handleLogout}
              title="Logout"
              type="button"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
