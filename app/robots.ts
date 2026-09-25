import type { MetadataRoute } from "next";

import { absoluteUrl, siteUrl } from "@/lib/seo/site";

/**
 * The admin panel and the APIs have nothing for a search engine: the panel is
 * behind a login and already sends `noindex`, and the APIs only accept POSTs.
 * Keeping crawlers out of both spends their visits on pages that can rank.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl().origin,
  };
}
