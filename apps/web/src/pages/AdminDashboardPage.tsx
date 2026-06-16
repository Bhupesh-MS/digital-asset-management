import { BarChart3, Download, Upload, Share2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useEffect } from "react";
import { Alert } from "../components/Alert.js";
import { PageShell } from "../components/layout/PageShell.js";
import { AssetGallery } from "../features/assets/AssetGallery.js";
import { PaginationControls } from "../features/assets/PaginationControls.js";
import { useAdminAnalytics } from "../hooks/useAdminAnalytics.js";
import { usePaginatedAssets } from "../hooks/usePaginatedAssets.js";
import { useAuthStore } from "../store/auth.store.js";

const DEFAULT_ANALYTICS = {
  analytics: null,
  loading: false,
  error: "Authentication required to view analytics",
  refresh: () => Promise.resolve()
};

export function AdminDashboardPage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const token = useAuthStore((state: any) => state.token);

  useEffect(() => {
    if (!token) {
      onUnauthorized();
    }
  }, [token, onUnauthorized]);

  const analyticsData = useAdminAnalytics(token, onUnauthorized);
  const analytics = useMemo(() => (token ? analyticsData : DEFAULT_ANALYTICS), [token, analyticsData]);
  const assets = usePaginatedAssets(token ?? undefined, onUnauthorized);

  return (
    <PageShell
      eyebrow="Admin"
      title="Dashboard"
      description="Review upload and download activity, then browse assets in a protected paginated view."
    >
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={<Upload size={20} />}
          label="Total uploads"
          loading={analytics.loading}
          value={analytics.analytics?.totalUploads}
        />
        <MetricCard
          icon={<Download size={20} />}
          label="Total downloads"
          loading={analytics.loading}
          value={analytics.analytics?.totalDownloads}
        />
        <MetricCard
          icon={<Share2 size={20} />}
          label="Total shares"
          loading={analytics.loading}
          value={analytics.analytics?.totalShares}
        />
      </div>
      <div className="mb-4 grid gap-3">
        <Alert message={analytics.error} tone="error" />
        <Alert message={assets.success} tone="success" />
        <Alert message={assets.error} tone="error" />
      </div>
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="text-brand" size={20} />
        <h2 className="text-lg font-semibold text-ink">All assets</h2>
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

function MetricCard({
  icon,
  label,
  loading,
  value
}: {
  icon: ReactNode;
  label: string;
  loading: boolean;
  value?: number;
}) {
  return (
    <div className="rounded-md border border-line bg-white p-5">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-brand">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-ink">{loading ? "..." : (value ?? 0)}</p>
    </div>
  );
}
