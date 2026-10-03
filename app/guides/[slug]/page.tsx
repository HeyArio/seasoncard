import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentPage, Crumbs, Faq, JsonLd, ScanCta } from "@/components/ContentBits";
import { GUIDES, findGuide } from "@/lib/guides";
import { getSeason } from "@/lib/seasons";
import { CONTENT_UPDATED, articleLd, breadcrumbLd, faqLd, seasonUrl } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const g = findGuide(slug);
  if (!g) return {};
  return { title: g.title, description: g.description, alternates: { canonical: `/guides/${slug}` }, openGraph: { title: g.title, description: g.description, url: `/guides/${slug}` } };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const g = findGuide(slug);
  if (!g) notFound();
  const path = `/guides/${slug}`;

  return (
    <ContentPage>
      <JsonLd
        data={[
          breadcrumbLd([["Season Card", "/"], ["Guides", "/guides"], [g.title, path]]),
          articleLd({ title: g.title, description: g.description, path, updated: CONTENT_UPDATED }),
          faqLd(g.faq),
        ]}
      />
      <Crumbs items={[["Guides", "/guides"], [g.title]]} />
      <h1 style={{ marginTop: 12 }}>{g.title}</h1>
      <p className="lede-answer">{g.answer}</p>

      {g.sections.map((s) => (
        <section key={s.h} className="section">
          <h2 className="section-title">{s.h}</h2>
          {s.p.map((p) => <p key={p.slice(0, 32)} style={{ marginBottom: 10 }}>{p}</p>)}
          {s.list ? (
            <ul className="bullets">
              {s.list.map((li) => <li key={li}>{li}</li>)}
            </ul>
          ) : null}
        </section>
      ))}

      <section className="section">
        <ScanCta />
      </section>

      <Faq items={g.faq} />

      <section className="section">
        <h2 className="section-title">Related seasons</h2>
        <ul className="link-list">
          {g.related.map((id) => (
            <li key={id}><Link href={seasonUrl(id)}>{getSeason(id).season.name} colour palette</Link></li>
          ))}
        </ul>
      </section>
    </ContentPage>
  );
}
