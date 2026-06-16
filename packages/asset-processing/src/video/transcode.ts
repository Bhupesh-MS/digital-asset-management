import ffmpeg from "fluent-ffmpeg";

export interface TranscodeOptions {
  videoBitrate?: string;
  size?: string;
}

export function transcodeVideo(inputPath: string, outputPath: string, options: TranscodeOptions = {}) {
  return new Promise<{ outputPath: string }>((resolve, reject) => {
    ffmpeg(inputPath)
      .videoBitrate(options.videoBitrate ?? "1200k")
      .size(options.size ?? "1280x?")
      .output(outputPath)
      .on("end", () => resolve({ outputPath }))
      .on("error", reject)
      .run();
  });
}
