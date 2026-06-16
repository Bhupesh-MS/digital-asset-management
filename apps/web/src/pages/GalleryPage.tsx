import { Alert } from "../components/Alert.js";
import { PageShell } from "../components/layout/PageShell.js";
import { AssetGallery } from "../features/assets/AssetGallery.js";
import { PaginationControls } from "../features/assets/PaginationControls.js";
import { usePaginatedAssets } from "../hooks/usePaginatedAssets.js";

export function GalleryPage() {
  const assets = usePaginatedAssets();

  return (
    <PageShell
      eyebrow="Gallery"
      title="Uploaded files"
      description="View uploaded files five at a time with preview and download actions."
    >
      <div className="mb-4 grid gap-3">
        <Alert message={assets.success} tone="success" />
        <Alert message={assets.error} tone="error" />
      </div>
      <AssetGallery assets={assets.assets} loading={assets.loading} />
      <PaginationControls
        hasNextPage={assets.hasNextPage}
        hasPreviousPage={assets.hasPreviousPage}
        loading={assets.loading}
        onPageChange={assets.loadPage}
        page={assets.page}
        total={assets.total}
      />
    </PageShell>
  );
}
