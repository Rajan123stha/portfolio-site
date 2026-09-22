import type { MetadataRoute } from "next";

import { sectionVisibility } from "@/lib/content/visibility";
import { getPortfolio } from "@/lib/queries/public";
import { contentFreshness } from "@/lib/seo/freshness";
import { absoluteUrl } from "@/lib/seo/site";

/** Regenerated with the rest of the site whenever content is saved. */
export const revalidate = 3600;

/**
 * Every public page. Project pages are listed only while the projects section
 * is visible — a hidden section's pages return 404, and a sitemap pointing at
 * 404s is exactly the crawl error it exists to prevent.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [data, dates] = await Promise.all([getPortfolio(), contentFreshness()]);
  const showProjects = sectionVisibility(data).projects;

  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: dates.home, changeFrequency: "monthly", priority: 1 },
  ];

  if (showProjects) {
    const projectDates = data.projects
      .map((project) => dates.projects.get(project.slug))
      .filter((date): date is Date => date !== undefined);

    entries.push({
      url: absoluteUrl("/projects"),
      lastModified: projectDates.length > 0 ? new Date(Math.max(...projectDates.map((date) => date.getTime()))) : undefined,
      changeFrequency: "monthly",
      priority: 0.8,
    });

    for (const project of data.projects) {
      entries.push({
        url: absoluteUrl(`/projects/${project.slug}`),
        lastModified: dates.projects.get(project.slug),
        changeFrequency: "yearly",
        priority: project.featured ? 0.7 : 0.6,
      });
    }
  }

  return entries;
}
