import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../services/http.js";
import { fetchAssets, getDownloadUrl } from "../services/assets.service.js";
import type { AssetItem } from "../types/assets.js";

const PAGE_SIZE = 5;

export function usePaginatedAssets(token?: string, onUnauthorized?: () => void) {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPage = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const data = await fetchAssets(nextPage, PAGE_SIZE, token);
        const assetsWithUrls = await Promise.all(
          data.assets.map(async (asset) => {
            let previewUrl;
            if (asset.status === "READY") {
              try {
                const { url } = await getDownloadUrl(asset.id, true);
                previewUrl = url;
              } catch {
                // Ignore
              }
            }
            return {
              ...asset,
              previewUrl
            };
          })
        );
        setAssets(assetsWithUrls);
        setTotal(data.total);
        setPage(data.page);
        setSuccess(assetsWithUrls.length > 0 ? "Assets loaded successfully." : null);
      } catch (caught) {
        if (caught instanceof ApiError) {
          if (caught.status === 401 || caught.status === 403) {
            onUnauthorized?.();
            return;
          }
          setError(caught.message);
        } else {
          setError(caught instanceof Error ? caught.message : "Unable to load assets.");
        }
      } finally {
        setLoading(false);
      }
    },
    [onUnauthorized, token]
  );

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  return {
    assets,
    error,
    hasNextPage: page * PAGE_SIZE < total,
    hasPreviousPage: page > 1,
    loading,
    page,
    pageSize: PAGE_SIZE,
    success,
    total,
    loadPage
  };
}
