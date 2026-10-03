import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, JsonLd, ScanCta } from "@/components/ContentBits";
import { GUIDES } from "@/lib/guides";
import { abs, allSeasons, breadcrumbLd, comparisonPairs, seasonUrl } from "@/lib/seo";
import { getSeason } from "@/lib/seasons";

const description =
  "All 12 colour seasons explained: Light, True and Bright Spring; Light, True and Soft Summer; Soft, True and Deep Autumn; Deep, True and Bright Winter. Traits, sample palettes and how to find yours.";

export const metadata: Metadata = {
  title: "The 12 colour seasons explained, with palettes",
  description,
  alternates: { canonical: "/seasons" },
};

const FAMILIES = ["spring", "summer", "autumn", "winter"] as const;

export default function SeasonsIndex() {
  const seasons = allSeasons();
  return (
    <ContentPage>
      <JsonLd
        data={[
          breadcrumbLd([["Season Card", "/"], ["12 colour seasons", "/seasons"]]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "The 12 colour seasons",
            itemListElement: seasons.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.name, url: abs(seasonUrl(s.id)) })),
          },
        ]}
      />
      <h1>The 12 colour seasons</h1>
      <p className="lede-answer">
        Seasonal colour analysis sorts natural colouring into 12 seasons using four traits: undertone, depth, contrast and chroma. Springs are warm and
        clear, Summers cool and soft, Autumns warm and muted, and Winters cool and clear.
      </p>

      {FAMILIES.map((f) => (
        <section key={f} className="section">
          <h2 className="section-title" style={{ textTransform: "capitalize" }}>{f}</h2>
          <div className="season-list">
            {seasons
              .filter((s) => s.family === f)
              .map((s) => (
                <Link key={s.id} href={seasonUrl(s.id)} className="card card-flat season-link">
                  <span className="season-dots">
                    {s.cardSwatches.map((c) => <i key={c} style={{ background: c }} />)}
                  </span>
                  <span>
                    <strong>{s.name}</strong>
                    <span className="small muted" style={{ display: "block" }}>{s.tagline}</span>
                  </span>
                </Link>
              ))}
          </div>
        </section>
      ))}

      <section className="section">
        <h2 className="section-title">Compare neighbouring seasons</h2>
        <ul className="link-list">
          {comparisonPairs().map((p) => (
            <li key={p.slug}>
              <Link href={`/compare/${p.slug}`}>{getSeason(p.a).season.name} vs {getSeason(p.b).season.name}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2 className="section-title">Guides</h2>
        <ul className="link-list">
          {GUIDES.map((g) => (
            <li key={g.slug}><Link href={`/guides/${g.slug}`}>{g.title}</Link></li>
          ))}
        </ul>
      </section>

      <section className="section">
        <ScanCta />
      </section>
    </ContentPage>
  );
}
