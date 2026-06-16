import type { AssetDto, CreateAssetResponse } from "@dam/shared-types";
import type { PaginatedAssetsResponse } from "../types/assets.js";
import { API_BASE_URL, parseJsonResponse } from "./http.js";

interface WrappedResponse<T> {
  success: boolean;
  data: T;
}

export async function fetchAssets(page = 1, pageSize = 5, token?: string): Promise<PaginatedAssetsResponse> {
  const url = new URL(`${API_BASE_URL}/assets`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(pageSize));

  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), { headers });
  const result = await parseJsonResponse<
    WrappedResponse<{
      assets: AssetDto[];
      pagination: { page: number; perPage: number; total: number; totalPages: number };
    }>
  >(response, "Unable to fetch assets");

  return {
    assets: result.data.assets,
    total: result.data.pagination.total,
    page: result.data.pagination.page,
    pageSize: result.data.pagination.perPage
  };
}

export async function uploadAssetFiles(
  files: File[],
  tags?: string[],
  category?: string
): Promise<CreateAssetResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  if (tags && tags.length > 0) {
    formData.append("tags", tags.join(","));
  }

  if (category) {
    formData.append("category", category);
  }

  const response = await fetch(`${API_BASE_URL}/assets`, {
    method: "POST",
    body: formData
  });

  return parseJsonResponse<CreateAssetResponse>(response, "Unable to upload files");
}

export async function shareAsset(
  id: string,
  token?: string,
  expiresAt?: string
): Promise<{ token: string; expiresAt: string; url: string }> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/assets/${id}/share`, {
    method: "POST",
    headers,
    body: JSON.stringify({ expiresAt })
  });

  const result = await parseJsonResponse<
    WrappedResponse<{
      share: { id: string; token: string; status: string; expiresAt: string | null; createdAt: string };
    }>
  >(response, "Unable to share asset");

  const shareUrl = `${API_BASE_URL}/assets/shared/${result.data.share.token}`;
  return {
    token: result.data.share.token,
    expiresAt: result.data.share.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    url: shareUrl
  };
}

export async function getDownloadUrl(id: string, preview = false): Promise<{ url: string }> {
  const query = preview ? "?preview=true" : "";
  const response = await fetch(`${API_BASE_URL}/assets/${id}/download${query}`, {
    method: "GET"
  });

  const result = await parseJsonResponse<WrappedResponse<{ assetId: string; url: string }>>(
    response,
    "Unable to get download url"
  );
  return { url: result.data.url };
}

export async function fetchAdminAnalytics(
  token: string
): Promise<{ totalUploads: number; totalDownloads: number; totalShares: number }> {
  const response = await fetch(`${API_BASE_URL}/assets/analytics`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const result = await parseJsonResponse<
    WrappedResponse<{
      totals: { uploads: number; downloads: number; shares: number; lists: number };
      topDownloadedAssets: any[];
    }>
  >(response, "Unable to fetch analytics");

  return {
    totalUploads: result.data.totals.uploads,
    totalDownloads: result.data.totals.downloads,
    totalShares: result.data.totals.shares
  };
}
