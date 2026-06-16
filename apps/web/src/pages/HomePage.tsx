import { ArrowRight, Images, UploadCloud } from "lucide-react";
import type { AppRoute } from "../hooks/useRouter.js";
import { PageShell } from "../components/layout/PageShell.js";

export function HomePage({ navigate }: { navigate: (route: AppRoute) => void }) {
  return (
    <PageShell
      eyebrow="Asset workspace"
      title="A simple digital asset hub for teams"
      description="Upload image and video assets, browse the shared gallery, and review administrative activity from one consistent interface."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <button
          className="rounded-md border border-line bg-white p-5 text-left hover:border-brand"
          onClick={() => navigate("/upload")}
          type="button"
        >
          <UploadCloud className="mb-4 text-brand" size={30} />
          <h2 className="text-lg font-semibold text-ink">Upload files</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Add multiple images or videos with validation and upload status feedback.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand">
            Open upload <ArrowRight size={16} />
          </span>
        </button>
        <button
          className="rounded-md border border-line bg-white p-5 text-left hover:border-brand"
          onClick={() => navigate("/gallery")}
          type="button"
        >
          <Images className="mb-4 text-accent" size={30} />
          <h2 className="text-lg font-semibold text-ink">Browse gallery</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Preview uploaded media, page through assets five at a time, and download files.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand">
            View gallery <ArrowRight size={16} />
          </span>
        </button>
        <div className="rounded-md border border-line bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Admin dashboard</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Protected dashboard access shows paginated assets plus upload and download analytics.
          </p>
          <button
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-white hover:bg-teal-800"
            onClick={() => navigate("/admin")}
            type="button"
          >
            Open admin <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </PageShell>
  );
}
