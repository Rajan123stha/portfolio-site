import "server-only";

/**
 * The public origin every absolute URL is built from: canonical links, Open
 * Graph URLs, the sitemap and structured data.
 *
 * `NEXT_PUBLIC_SITE_URL` wins when it's a real address. A value pointing at
 * localhost in a Vercel production build is treated as a mistake rather than
 * trusted — that exact misconfiguration shipped once and made every canonical
 * link on the live site read `http://localhost:3000`, telling search engines
 * the real pages were duplicates of an unreachable one. Vercel's own
 * production domain is used instead, so the worst case is a correct domain.
 */
export function siteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const isLocal = (value: string) => /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(value);

  if (configured && !(isLocal(configured) && vercelDomain)) return new URL(configured);
  if (vercelDomain) return new URL(`https://${vercelDomain}`);
  return new URL(configured || "http://localhost:3000");
}

/** An absolute URL on this site, for places that can't take a relative one. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, siteUrl()).toString();
}
