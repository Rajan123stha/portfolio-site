import { renderIcon } from "@/lib/seo/icon";

/**
 * `/favicon.ico` is requested by browsers and crawlers regardless of the
 * <link rel="icon"> tags, and it was answering 404 — noise in every crawl
 * report. Served as PNG, which every browser accepts under this name.
 */
export const dynamic = "force-static";

export function GET() {
  return renderIcon(48);
}
