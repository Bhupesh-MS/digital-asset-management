import type { ReactNode } from "react";

export function PageShell({
  children,
  eyebrow,
  title,
  description
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-[calc(100vh-65px)] bg-fog">
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-6 max-w-3xl">
          {eyebrow ? (
            <p className="mb-2 text-sm font-semibold uppercase tracking-normal text-accent">{eyebrow}</p>
          ) : null}
          <h1 className="text-3xl font-semibold tracking-normal text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {children}
      </section>
    </main>
  );
}
