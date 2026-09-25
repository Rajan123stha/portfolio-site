import { getPortfolio } from "@/lib/queries/public";
import { clip, OG_SIZE, renderOgCard } from "@/lib/seo/og";
import { siteUrl } from "@/lib/seo/site";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Project case study";
export const revalidate = 3600;

/** The card shown when a case study is shared. */
export default async function ProjectImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { projects, profile } = await getPortfolio();
  const project = projects.find((item) => item.slug === slug);

  return renderOgCard({
    eyebrow: `Case study · ${profile.fullName}`,
    title: project?.title ?? profile.fullName,
    subtitle: project ? clip(project.description, 120) : undefined,
    tags: project?.tech ?? [],
    footer: siteUrl().host,
  });
}
