import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/r/", "/api/", "/checkout", "/result"] }],
    sitemap: `${publicSiteUrl()}/sitemap.xml`,
  };
}
