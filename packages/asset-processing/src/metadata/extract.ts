import exifr from "exifr";
const { parse } = exifr;

export interface AssetMetadata {
  width?: number;
  height?: number;
  durationSeconds?: number;
  raw?: unknown;
}

export async function extractImageMetadata(inputPath: string): Promise<AssetMetadata> {
  const raw = await parse(inputPath).catch(() => undefined);
  return { raw };
}
