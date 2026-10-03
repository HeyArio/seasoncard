import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ColourGrid, ContentPage, Crumbs, Faq, JsonLd, ScanCta } from "@/components/ContentBits";
import { getSeason } from "@/lib/seasons";
import { CONTENT_UPDATED, articleLd, breadcrumbLd, comparisonPairs, faqLd, findPair, pairAnswer, samplePalette, seasonUrl, traitDiffs } from "@/lib/seo";

type Props = { params: Promise<{ pair: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return comparisonPairs().map((p) => ({ pair: p.slug }));
}

function load(slug: string) {
  const p = findPair(slug);
  if (!p) return null;
  return { p, a: getSeason(p.a).season, b: getSeason(p.b).season };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params;
  const d = load(pair);
  if (!d) return {};
  const title = `${d.a.name} vs ${d.b.name}: the difference, explained`;
  const description = pairAnswer(d.a, d.b);
  return { title, description, alternates: { canonical: `/compare/${pair}` }, openGraph: { title, description, url: `/compare/${pair}` } };
}

export default async function ComparePage({ params }: Props) {
  const { pair } = await params;
  const d = load(pair);
  if (!d) notFound();
  const { a, b } = d;
  const diffs = traitDiffs(a, b);
  const key = diffs.filter((x) => !x.same);
  const answer = pairAnswer(a, b);

  const faq = [
    { q: `What is the difference between ${a.name} and ${b.name}?`, a: answer },
    { q: `Can I be between ${a.name} and ${b.name}?`, a: `Yes. Neighbouring seasons share a lot, and many people sit near the border. That's why Season Card shows your closest season and a runner-up.` },
    {
      q: `How do I tell if I'm ${a.name} or ${b.name}?`,
      a: `Focus on ${key.map((x) => x.key).join(" and ")}. In daylight, compare a colour from each palette under your chin, for example ${samplePalette(a)[0]?.name.toLowerCase()} (${a.name}) and ${samplePalette(b)[0]?.name.toLowerCase()} (${b.name}), and see which makes your skin look more even.`,
    },
  ];

  return (
    <ContentPage>
      <JsonLd
        data={[
          breadcrumbLd([["Season Card", "/"], ["12 colour seasons", "/seasons"], [`${a.name} vs ${b.name}`, `/compare/${pair}`]]),
          articleLd({ title: `${a.name} vs ${b.name}`, description: answer, path: `/compare/${pair}`, updated: CONTENT_UPDATED }),
          faqLd(faq),
        ]}
      />
      <Crumbs items={[["Seasons", "/seasons"], [`${a.name} vs ${b.name}`]]} />
      <h1 style={{ marginTop: 12 }}>{a.name} vs {b.name}</h1>
      <p className="lede-answer">{answer}</p>

      <section className="section">
        <h2 className="section-title">Side by side</h2>
        <table className="compare-table">
          <thead>
            <tr><th></th><th>{a.name}</th><th>{b.name}</th></tr>
          </thead>
          <tbody>
            {diffs.map((x) => (
              <tr key={x.key} className={x.same ? "" : "is-diff"}>
                <th scope="row">{x.key}</th>
                <td>{x.a}</td>
                <td>{x.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="xsmall muted" style={{ marginTop: 6 }}>Highlighted rows are where they differ.</p>
      </section>

      {[a, b].map((s) => (
        <section key={s.id} className="section">
          <h2 className="section-title">{s.name} colours</h2>
          <p style={{ marginBottom: 10 }}>{s.tagline} <Link href={seasonUrl(s.id)}>More about {s.name} →</Link></p>
          <ColourGrid items={samplePalette(s).slice(0, 6)} />
        </section>
      ))}

      <section className="section">
        <ScanCta title={`${a.name} or ${b.name}?`} note="Your free result shows your closest season and a runner-up, because neighbours are close. One daylight selfie; your photo never leaves your phone." />
      </section>

      <Faq items={faq} />
    </ContentPage>
  );
}
