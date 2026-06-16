import { useCallback, useEffect, useMemo, useState } from "react";

export type AppRoute = "/" | "/upload" | "/gallery" | "/admin" | "/admin/login";

const routes = new Set<AppRoute>(["/", "/upload", "/gallery", "/admin", "/admin/login"]);

export function getCurrentRoute(): AppRoute {
  let path = window.location.hash.slice(1) as AppRoute;
  if (!path) path = "/";
  return routes.has(path) ? path : "/";
}

export function useRouter() {
  const [route, setRoute] = useState<AppRoute>(() => getCurrentRoute());

  const navigate = useCallback((path: AppRoute) => {
    window.location.hash = path;
    setRoute(path);
  }, []);

  useEffect(() => {
    const handleHashChange = () => setRoute(getCurrentRoute());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return useMemo(() => ({ route, navigate }), [navigate, route]);
}
