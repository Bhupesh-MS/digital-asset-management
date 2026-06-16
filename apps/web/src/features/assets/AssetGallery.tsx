import { useState } from "react";
import { Download, FileVideo, ImageIcon, Share2 } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge.js";
import type { AssetItem } from "../../types/assets.js";
import { getDownloadUrl, shareAsset } from "../../services/assets.service.js";
import { useAuthStore } from "../../store/auth.store.js";

export function AssetGallery({ assets, loading }: { assets: AssetItem[]; loading: boolean }) {
  const { token } = useAuthStore();
  const [sharing, setSharing] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleShare = async (id: string) => {
    try {
      setSharing(id);
      const { url } = await shareAsset(id, token ?? undefined);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert("Shared link copied to clipboard!");
      } else {
        prompt("Copy this link to share:", url);
      }
    } catch (e) {
      alert("Failed to share asset.");
    } finally {
      setSharing(null);
    }
  };

  const handleDownload = async (id: string, directUrl?: string) => {
    try {
      setDownloading(id);
      let url = directUrl;
      if (!url) {
        const res = await getDownloadUrl(id);
        url = res.url;
      }

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;
      const asset = assets.find((a) => a.id === id);
      a.download = asset?.filename ?? "download";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
    } catch (e) {
      alert("Failed to download asset.");
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return <div className="rounded-md border border-line bg-white p-6 text-sm text-slate-600">Loading assets...</div>;
  }

  if (assets.length === 0) {
    return <div className="rounded-md border border-line bg-white p-6 text-sm text-slate-600">No assets found.</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {assets.map((asset) => (
        <article className="overflow-hidden rounded-md border border-line bg-white" key={asset.id}>
          <div className="flex aspect-video items-center justify-center bg-slate-100">
            {asset.previewUrl ? (
              asset.mimeType.startsWith("video/") ? (
                <video className="h-full w-full object-cover" controls src={asset.previewUrl} />
              ) : (
                <img alt={asset.filename} className="h-full w-full object-cover" src={asset.previewUrl} />
              )
            ) : asset.mimeType.startsWith("video/") ? (
              <FileVideo className="text-slate-400" size={42} />
            ) : (
              <ImageIcon className="text-slate-400" size={42} />
            )}
          </div>
          <div className="space-y-3 p-3">
            <div>
              <h2 className="truncate text-sm font-semibold text-ink" title={asset.filename}>
                {asset.filename}
              </h2>
              <p className="text-xs text-slate-500">
                {asset.mimeType} · {formatBytes(asset.sizeBytes)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={asset.status} />
              <div className="flex items-center gap-2">
                <button
                  disabled={sharing === asset.id || asset.status !== "READY"}
                  onClick={() => handleShare(asset.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink hover:bg-fog disabled:opacity-50"
                  title="Share"
                >
                  <Share2 size={15} />
                </button>
                <button
                  disabled={downloading === asset.id || asset.status !== "READY"}
                  onClick={() => handleDownload(asset.id, asset.downloadUrl)}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-2 text-sm font-medium text-ink hover:bg-fog disabled:opacity-50"
                  title="Download"
                >
                  <Download size={15} />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
