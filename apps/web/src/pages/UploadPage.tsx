import { useMemo, useState } from "react";
import { Alert } from "../components/Alert.js";
import { PageShell } from "../components/layout/PageShell.js";
import { UploadPanel } from "../features/assets/UploadPanel.js";
import { uploadAssetFiles } from "../services/assets.service.js";

export function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");

  const validationError = useMemo(() => {
    if (files.some((file) => !file.type.startsWith("image/") && !file.type.startsWith("video/"))) {
      return "Only image and video files are supported.";
    }

    return null;
  }, [files]);

  async function handleSubmit() {
    if (files.length === 0 || validationError) {
      setError(validationError ?? "Select at least one file.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await uploadAssetFiles(files, parsedTags, category);
      setSuccess(`${files.length} file${files.length === 1 ? "" : "s"} submitted successfully.`);
      setFiles([]);
      setCategory("");
      setTags("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload files.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      eyebrow="Upload"
      title="Upload image and video files"
      description="Drag and drop assets or browse files. Multiple files can be submitted together."
    >
      <div className="mb-4 grid gap-3">
        <Alert message={success} tone="success" />
        <Alert message={error} tone="error" />
      </div>
      <UploadPanel
        files={files}
        loading={loading}
        onFilesChange={setFiles}
        onSubmit={handleSubmit}
        validationError={validationError}
        tags={tags}
        onTagsChange={setTags}
        category={category}
        onCategoryChange={setCategory}
      />
    </PageShell>
  );
}
