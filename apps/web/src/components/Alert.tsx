import { CheckCircle2, XCircle } from "lucide-react";

export function Alert({ message, tone }: { message: string | null; tone: "success" | "error" }) {
  if (!message) {
    return null;
  }

  const Icon = tone === "success" ? CheckCircle2 : XCircle;
  const toneClass =
    tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800";

  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${toneClass}`}>
      <Icon className="mt-0.5 shrink-0" size={16} />
      <span>{message}</span>
    </div>
  );
}
