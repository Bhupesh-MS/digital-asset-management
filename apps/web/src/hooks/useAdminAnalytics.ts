import { useCallback, useEffect, useState } from "react";
import { fetchAdminAnalytics } from "../services/assets.service.js";
import { ApiError } from "../services/http.js";
import type { AdminAnalytics } from "../types/assets.js";

export function useAdminAnalytics(token: string | null | undefined, onUnauthorized: () => void) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setError("Authentication required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setAnalytics(await fetchAdminAnalytics(token));
    } catch (caught) {
      if (caught instanceof ApiError && (caught.status === 401 || caught.status === 403)) {
        onUnauthorized();
        return;
      }

      setError(caught instanceof Error ? caught.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { analytics, error, loading, refresh };
}
