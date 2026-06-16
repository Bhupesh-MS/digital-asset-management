import { useState, type DragEvent } from "react";
import { UploadCloud, X } from "lucide-react";

export function UploadPanel({
  files,
  loading,
  onFilesChange,
  onSubmit,
  validationError,
  tags,
  onTagsChange,
  category,
  onCategoryChange
}: {
  files: File[];
  loading: boolean;
  onFilesChange: (files: File[]) => void;
  onSubmit: () => void;
  validationError: string | null;
  tags?: string;
  onTagsChange?: (tags: string) => void;
  category?: string;
  onCategoryChange?: (category: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (newFiles: File[]) => {
    const existing = new Set(files.map((f) => f.name + f.size));
    const added = newFiles.filter((f) => !existing.has(f.name + f.size));
    if (added.length > 0) {
      onFilesChange([...files, ...added]);
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };

  return (
    <div className="rounded-md border border-line bg-white p-6">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`mb-6 flex flex-col items-center justify-center rounded-md border-2 border-dashed py-10 transition-colors ${
          isDragging ? "border-brand bg-teal-50" : "border-line bg-slate-50"
        }`}
      >
        <UploadCloud className={`mb-2 ${isDragging ? "text-brand" : "text-slate-400"}`} size={40} />
        <label className="cursor-pointer text-sm font-medium text-brand hover:underline">
          Browse files
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleFiles(Array.from(e.target.files));
              }
              e.target.value = ""; // Reset to allow selecting the same file again if removed
            }}
          />
        </label>
        <p className="mt-1 text-xs text-slate-500">or drag and drop multiple files here</p>
      </div>

      {files.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Selected files ({files.length})</h3>
            <button onClick={() => onFilesChange([])} className="text-xs font-medium text-brand hover:underline">
              Clear all
            </button>
          </div>
          <ul className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between rounded-md border border-line p-2 text-xs text-slate-600"
              >
                <span className="truncate pr-4" title={f.name}>
                  {f.name} <span className="text-slate-400">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                </span>
                <button
                  onClick={() => removeFile(i)}
                  className="text-slate-400 hover:text-red-500 flex-shrink-0"
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {onTagsChange && (
        <label className="mb-4 block text-sm font-medium text-ink">
          Tags (optional, comma separated)
          <input
            className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-brand"
            value={tags}
            onChange={(e) => onTagsChange(e.target.value)}
            placeholder="nature, landscape"
          />
        </label>
      )}

      {onCategoryChange && (
        <label className="mb-6 block text-sm font-medium text-ink">
          Category (optional)
          <input
            className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-brand"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            placeholder="Marketing"
          />
        </label>
      )}

      <button
        disabled={loading || files.length === 0 || !!validationError}
        onClick={onSubmit}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {loading ? "Uploading..." : `Upload ${files.length} file${files.length === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}
