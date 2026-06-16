export type AssetStatus = "UPLOADED" | "QUEUED" | "PROCESSING" | "READY" | "FAILED" | "ARCHIVED";
export type AssetType = "IMAGE" | "VIDEO" | "DOCUMENT" | "OTHER";

export interface AssetDto {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  type: AssetType;
  sizeBytes: number;
  status: AssetStatus;
  bucket: string;
  objectKey: string;
  previewObjectKey?: string | null;
  thumbnailObjectKey?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetRequest {
  files: Array<{
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Uint8Array;
  }>;
  tags?: string[];
  category?: string;
  uploadedById?: string;
}

export interface CreateAssetResponse {
  success: boolean;
  data: {
    assets: AssetDto[];
  };
}

export interface AssetProcessingJob {
  assetId: string;
  sourceKey: string;
  mimeType: string;
  filename: string;
}

export interface ThumbnailResult {
  key: string;
  width: number;
  height: number;
}
