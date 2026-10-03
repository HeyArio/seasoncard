import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site";
import { GUIDES } from "@/lib/guides";
import { SEASON_IDS } from "@/lib/schemas";
import { CONTENT_UPDATED, comparisonPairs } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicSiteUrl();
  const lastModified = CONTENT_UPDATED;
  const core = ["", "/scan", "/seasons", "/guides"].map((p) => ({ url: `${base}${p}`, lastModified, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 }));
  const seasons = SEASON_IDS.map((id) => ({ url: `${base}/seasons/${id}`, lastModified, changeFrequency: "monthly" as const, priority: 0.8 }));
  const compare = comparisonPairs().map((p) => ({ url: `${base}/compare/${p.slug}`, lastModified, changeFrequency: "monthly" as const, priority: 0.7 }));
  const guides = GUIDES.map((g) => ({ url: `${base}/guides/${g.slug}`, lastModified, changeFrequency: "monthly" as const, priority: 0.7 }));
  const legal = ["/privacy", "/terms", "/refund"].map((p) => ({ url: `${base}${p}`, changeFrequency: "yearly" as const, priority: 0.3 }));
  return [...core, ...seasons, ...compare, ...guides, ...legal];
}
