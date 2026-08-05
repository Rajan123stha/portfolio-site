/**
 * Cache tags for the public site.
 *
 * Public reads go through `unstable_cache`, so the homepage is served from the
 * data cache instead of hitting Neon on every request. Admin mutations call
 * `revalidateContent()` to drop those entries, which is what makes an edit show
 * up immediately rather than after a timed revalidation window.
 *
 * The tags are coarse on purpose. This is a single-page portfolio: the cost of
 * rebuilding one cache entry is a handful of queries, and fine-grained
 * invalidation would only add ways to forget a tag and ship stale content.
 */
export const CACHE_TAGS = {
  /** Everything the public page renders. */
  content: "portfolio:content",
  /** Branding and SEO, read separately by `generateMetadata`. */
  settings: "portfolio:settings",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const ALL_CACHE_TAGS: CacheTag[] = Object.values(CACHE_TAGS);
