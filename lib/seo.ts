import { getSeason, type Season, type Swatch } from "./seasons";
import { SEASON_IDS, type SeasonIdT } from "./schemas";
import { publicSiteUrl } from "./site";

/** Free sample shown on public pages: 12 colourful shades spread across the 36 (the full palette stays in the paid report). */
const SAMPLE_AT = [6, 8, 11, 13, 16, 18, 21, 23, 26, 28, 31, 33];

export function samplePalette(s: Season): Swatch[] {
  return SAMPLE_AT.map((i) => s.palette[i]).filter(Boolean);
}

export function allSeasons(): Season[] {
  return SEASON_IDS.map((id) => getSeason(id).season);
}

export function seasonUrl(id: string): string {
  return `/seasons/${id}`;
}

/** One-sentence, answer-first summary used as the lede and meta description. */
export function seasonAnswer(s: Season): string {
  const t = s.traits;
  return `${s.name} is a ${t.undertone.toLowerCase()}, ${t.depth.toLowerCase()}, ${t.contrast.toLowerCase()}-contrast, ${t.chroma.toLowerCase()} colour season: ${s.tagline.replace(/\.$/, "").toLowerCase()}.`;
}

// ---------- Comparisons (neighbouring seasons) ----------

export interface Pair {
  slug: string;
  a: SeasonIdT;
  b: SeasonIdT;
}

export function comparisonPairs(): Pair[] {
  const seen = new Set<string>();
  const out: Pair[] = [];
  for (const s of allSeasons()) {
    for (const n of s.neighbors) {
      if (!(SEASON_IDS as readonly string[]).includes(n)) continue;
      const [a, b] = [s.id, n as SeasonIdT].sort() as [SeasonIdT, SeasonIdT];
      const slug = `${a}-vs-${b}`;
      if (seen.has(slug)) continue;
      seen.add(slug);
      out.push({ slug, a, b });
    }
  }
  return out;
}

export function findPair(slug: string): Pair | undefined {
  return comparisonPairs().find((p) => p.slug === slug);
}

export function pairsFor(id: string): Pair[] {
  return comparisonPairs().filter((p) => p.a === id || p.b === id);
}

const TRAIT_LABEL: Record<keyof Season["traits"], string> = {
  undertone: "undertone",
  depth: "depth",
  contrast: "contrast",
  chroma: "chroma (how bright or muted)",
};

export interface TraitDiff {
  key: keyof Season["traits"];
  label: string;
  a: string;
  b: string;
  same: boolean;
}

export function traitDiffs(a: Season, b: Season): TraitDiff[] {
  return (Object.keys(TRAIT_LABEL) as (keyof Season["traits"])[]).map((key) => ({
    key,
    label: TRAIT_LABEL[key],
    a: a.traits[key],
    b: b.traits[key],
    same: a.traits[key] === b.traits[key],
  }));
}

export function pairAnswer(a: Season, b: Season): string {
  const d = traitDiffs(a, b);
  const shared = d.filter((x) => x.same).map((x) => x.key);
  const diff = d.filter((x) => !x.same);
  const sharedTxt = shared.length ? `They share the same ${shared.join(" and ")}. ` : "";
  const diffTxt = diff.map((x) => `${x.key}: ${a.name} is ${x.a.toLowerCase()}, ${b.name} is ${x.b.toLowerCase()}`).join("; ");
  return `${a.name} and ${b.name} are neighbouring colour seasons. ${sharedTxt}The difference is ${diffTxt}.`;
}

// ---------- JSON-LD helpers ----------

export function abs(path: string): string {
  return `${publicSiteUrl()}${path}`;
}

export function breadcrumbLd(items: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
  };
}

export function faqLd(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function articleLd(opts: { title: string; description: string; path: string; updated: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    mainEntityOfPage: abs(opts.path),
    dateModified: opts.updated,
    author: { "@type": "Organization", name: "Season Card", url: abs("/") },
    publisher: { "@type": "Organization", name: "Season Card", url: abs("/") },
  };
}

export const CONTENT_UPDATED = "2026-10-03";
