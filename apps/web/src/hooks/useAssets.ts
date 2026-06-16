import { useCallback, useEffect, useState } from "react";
import type { AssetDto } from "@dam/shared-types";
import { fetchAssets, uploadAssetFiles } from "../services/assets.service.js";

export function useAssets() {
  const [assets, setAssets] = useState<AssetDto[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchAssets(1, 100);
      setAssets(response.assets);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const createAsset = useCallback(
    async (files: File[]) => {
      await uploadAssetFiles(files);
      await refresh();
    },
    [refresh]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { assets, loading, createAsset, refresh };
}
