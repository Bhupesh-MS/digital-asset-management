import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationControls({
  hasNextPage,
  hasPreviousPage,
  loading,
  onPageChange,
  page,
  total
}: {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  loading: boolean;
  onPageChange: (page: number) => void;
  page: number;
  total: number;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-white px-4 py-3">
      <p className="text-sm text-slate-600">
        Page {page} · {total} total files
      </p>
      <div className="flex items-center gap-2">
        <button
          className="inline-flex h-9 items-center gap-1 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-fog disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasPreviousPage || loading}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <button
          className="inline-flex h-9 items-center gap-1 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-fog disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasNextPage || loading}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
