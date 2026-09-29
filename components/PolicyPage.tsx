import { SiteFooter, SiteHeader } from "./SiteChrome";

export function PolicyPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="page">
      <SiteHeader />
      <article className="prose">
        <h1>{title}</h1>
        <p className="muted small">Last updated {updated}</p>
        {children}
      </article>
      <SiteFooter />
    </main>
  );
}
