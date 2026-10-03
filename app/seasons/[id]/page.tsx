import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ColourGrid, ContentPage, Crumbs, Faq, JsonLd, ScanCta } from "@/components/ContentBits";
import { getSeason, isSeasonId, seasonName } from "@/lib/seasons";
import { SEASON_IDS } from "@/lib/schemas";
import { CONTENT_UPDATED, articleLd, breadcrumbLd, faqLd, pairsFor, samplePalette, seasonAnswer, seasonUrl } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return SEASON_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!isSeasonId(id)) return {};
  const { season: s } = getSeason(id);
  const title = `${s.name} colour palette: colours, traits and what to avoid`;
  const description = `${seasonAnswer(s)} See ${s.name} colours, colours to avoid and best metals, then check if you're ${s.name} with a free selfie scan.`;
  return {
    title,
    description,
    alternates: { canonical: seasonUrl(id) },
    openGraph: { title: `${s.name} colour palette`, description, url: seasonUrl(id) },
  };
}

export default async function SeasonPage({ params }: Props) {
  const { id } = await params;
  if (!isSeasonId(id)) notFound();
  const { season: s } = getSeason(id);
  const sample = samplePalette(s);
  const avoid = s.avoid.slice(0, 2);
  const pairs = pairsFor(id);
  const t = s.traits;

  const faq = [
    { q: `What colours look best on ${s.name}?`, a: `${s.name} suits colours that are ${t.undertone.toLowerCase()}, ${t.depth.toLowerCase()} and ${t.chroma.toLowerCase()}, such as ${sample.slice(0, 5).map((c) => c.name.toLowerCase()).join(", ")}.` },
    { q: `What colours should ${s.name} avoid?`, a: avoid.map((c) => `${c.name}: ${c.why}`).join(" ") },
    { q: `Gold or silver for ${s.name}?`, a: `Best: ${s.metals.best}. Also good: ${s.metals.good.toLowerCase()}. Usually skip: ${s.metals.skip.toLowerCase()}.` },
    { q: `How do I know if I'm ${s.name}?`, a: `${s.name} colouring is ${t.undertone.toLowerCase()} in undertone, ${t.depth.toLowerCase()} in depth, ${t.contrast.toLowerCase()} in contrast and ${t.chroma.toLowerCase()} in chroma. A daylight selfie scan measures all four and shows your closest season plus a runner-up.` },
  ];

  return (
    <ContentPage>
      <JsonLd
        data={[
          breadcrumbLd([["Season Card", "/"], ["12 colour seasons", "/seasons"], [s.name, seasonUrl(id)]]),
          articleLd({ title: `${s.name} colour palette`, description: seasonAnswer(s), path: seasonUrl(id), updated: CONTENT_UPDATED }),
          faqLd(faq),
        ]}
      />
      <Crumbs items={[["Seasons", "/seasons"], [s.name]]} />
      <p className="eyebrow" style={{ marginTop: 12 }}>{seasonName(s.family)} family</p>
      <h1>{s.name} colour palette</h1>
      <p className="lede-answer">{seasonAnswer(s)}</p>

      <div className="trait-grid">
        {(["undertone", "depth", "contrast", "chroma"] as const).map((k) => (
          <div key={k} className="card card-flat">
            <div className="xsmall muted" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{k}</div>
            <div style={{ fontWeight: 700 }}>{t[k]}</div>
          </div>
        ))}
      </div>

      <section className="section">
        <h2 className="section-title">What {s.name} looks like</h2>
        <p>{s.description}</p>
      </section>

      <section className="section">
        <h2 className="section-title">{sample.length} {s.name} colours</h2>
        <p className="muted small" style={{ marginBottom: 10 }}>A sample from the 36-colour {s.name} palette.</p>
        <ColourGrid items={sample} />
      </section>

      <section className="section">
        <h2 className="section-title">Colours {s.name} should avoid</h2>
        {avoid.map((c) => (
          <p key={c.name} className="peek-avoid">
            <span className="peek-dot peek-dot-inline" style={{ background: c.hex }} />
            <span><strong>{c.name}.</strong> {c.why}</span>
          </p>
        ))}
      </section>

      <section className="section">
        <h2 className="section-title">Best metals</h2>
        <p><strong>Best:</strong> {s.metals.best}. <strong>Good:</strong> {s.metals.good}. <strong>Skip:</strong> {s.metals.skip}.</p>
      </section>

      {pairs.length ? (
        <section className="section">
          <h2 className="section-title">Often confused with</h2>
          <ul className="link-list">
            {pairs.map((p) => {
              const other = p.a === id ? p.b : p.a;
              return (
                <li key={p.slug}>
                  <Link href={`/compare/${p.slug}`}>{s.name} vs {getSeason(other).season.name}</Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="section">
        <ScanCta title={`Are you ${s.name}?`} note={`One daylight selfie measures your undertone, depth, contrast and chroma, and shows your closest season plus a runner-up. Free, and your photo never leaves your phone.`} />
      </section>

      <Faq items={faq} />
    </ContentPage>
  );
}
