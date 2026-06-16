import sharp from "sharp";

export interface ThumbnailOptions {
  width?: number;
  height?: number;
}

export async function createThumbnail(inputPath: string, outputPath: string, options: ThumbnailOptions = {}) {
  const width = options.width ?? 320;
  const height = options.height ?? 320;

  await sharp(inputPath)
    .resize(width, height, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(outputPath);

  return { outputPath, width, height };
}
