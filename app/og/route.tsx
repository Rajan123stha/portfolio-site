import { getPortfolio, getSiteSettings } from "@/lib/queries/public";
import { clip, renderOgCard } from "@/lib/seo/og";
import { siteUrl } from "@/lib/seo/site";

/**
 * The site's default share image, used whenever no image has been uploaded in
 * Settings. Static and regenerated with the rest of the site on every edit.
 */
export const revalidate = 3600;

export async function GET() {
  const [{ profile, skillGroups }, settings] = await Promise.all([
    getPortfolio(),
    getSiteSettings(),
  ]);

  return renderOgCard({
    eyebrow: profile.location || settings.brandName,
    title: profile.fullName,
    subtitle: clip(profile.headline || settings.metaDescription, 110),
    tags: skillGroups.flatMap((group) => group.skills.map((skill) => skill.name)).slice(0, 4),
    footer: siteUrl().host,
  });
}
