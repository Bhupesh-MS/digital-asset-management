import type { AssetStatus } from "@dam/shared-types";

const labels: Record<AssetStatus, string> = {
  UPLOADED: "Uploaded",
  QUEUED: "Queued",
  PROCESSING: "Processing",
  READY: "Ready",
  FAILED: "Failed",
  ARCHIVED: "Archived"
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  return (
    <span className="inline-flex h-7 items-center rounded-md border border-line bg-white px-2 text-xs font-medium text-ink">
      {labels[status]}
    </span>
  );
}
