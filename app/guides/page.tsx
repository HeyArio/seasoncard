import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, JsonLd, ScanCta } from "@/components/ContentBits";
import { GUIDES } from "@/lib/guides";
import { breadcrumbLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Colour analysis guides",
  description: "Short, practical guides to seasonal colour analysis: finding your undertone, gold vs silver, whether black suits you, and the best light for a colour analysis selfie.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndex() {
  return (
    <ContentPage>
      <JsonLd data={breadcrumbLd([["Season Card", "/"], ["Guides", "/guides"]])} />
      <h1>Colour analysis guides</h1>
      <p className="lede-answer">Practical, painter-style answers to the questions people ask most about colour seasons.</p>
      <section className="section">
        <div className="season-list">
          {GUIDES.map((g) => (
            <Link key={g.slug} href={`/guides/${g.slug}`} className="card card-flat season-link">
              <span>
                <strong>{g.title}</strong>
                <span className="small muted" style={{ display: "block" }}>{g.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="section">
        <ScanCta />
      </section>
    </ContentPage>
  );
}
