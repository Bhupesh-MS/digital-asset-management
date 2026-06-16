import type { AssetDto } from "@dam/shared-types";
import { StatusBadge } from "../../components/StatusBadge.js";

export function AssetTable({ assets, loading }: { assets: AssetDto[]; loading: boolean }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Asset Library</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-fog text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">File</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Size</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  Loading assets...
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  No assets yet.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr className="border-t border-line" key={asset.id}>
                  <td className="px-4 py-3 font-medium text-ink">{asset.filename}</td>
                  <td className="px-4 py-3 text-slate-600">{asset.mimeType}</td>
                  <td className="px-4 py-3 text-slate-600">{formatBytes(asset.sizeBytes)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={asset.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
