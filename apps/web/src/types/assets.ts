import type { AssetDto } from "@dam/shared-types";

export interface AssetItem extends AssetDto {
  previewUrl?: string;
  downloadUrl?: string;
}

export interface PaginatedAssetsResponse {
  assets: AssetItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminAnalytics {
  totalDownloads: number;
  totalUploads: number;
  totalShares: number;
}
