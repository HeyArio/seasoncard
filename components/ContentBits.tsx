import Link from "next/link";
import type { Swatch } from "@/lib/seasons";
import { SiteFooter, SiteHeader } from "./SiteChrome";

/** Structured data for search engines and AI assistants. Content is built only from our own static data. */
export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function ContentPage({ children }: { children: React.ReactNode }) {
  return (
    <main className="page">
      <SiteHeader right={<Link href="/scan" className="header-link">Free scan</Link>} />
      <article className="content">{children}</article>
      <SiteFooter />
    </main>
  );
}

export function Crumbs({ items }: { items: [string, string?][] }) {
  return (
    <nav className="crumbs small muted" aria-label="Breadcrumb">
      {items.map(([name, href], i) => (
        <span key={name}>
          {i > 0 ? " / " : ""}
          {href ? <Link href={href}>{name}</Link> : name}
        </span>
      ))}
    </nav>
  );
}

export function ColourGrid({ items, cols = 3 }: { items: Swatch[]; cols?: number }) {
  return (
    <div className="peek-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {items.map((c) => (
        <div key={`${c.hex}-${c.name}`} className="peek-cell">
          <span className="peek-swatch" style={{ background: c.hex }} />
          <span className="peek-name">{c.name}</span>
        </div>
      ))}
    </div>
  );
}

export function ScanCta({ title = "Find your season in 30 seconds", note }: { title?: string; note?: string }) {
  return (
    <div className="card card-lg cta-card">
      <h2>{title}</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        {note ?? "One selfie by a window. Free result with your four measurements. Your photo never leaves your phone."}
      </p>
      <Link href="/scan" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
        Take the free scan
      </Link>
      <p className="fineprint">Full 36-colour report $9.99 · 7-day refund, one click</p>
    </div>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section className="section faq">
      <h2 className="section-title">Questions</h2>
      {items.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </section>
  );
}
