import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SubpageShell } from "@/components/layout/subpage-shell";
import { ProjectTeaser } from "@/components/projects/project-teaser";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { sectionVisibility } from "@/lib/content/visibility";
import { getPortfolio, getSiteSettings } from "@/lib/queries/public";
import { listText } from "@/lib/seo/projects";
import { projectsIndexGraph } from "@/lib/seo/structured-data";

/**
 * Every case study on one page — the hub that links them together, and the
 * natural landing page for searches about the kind of work rather than one
 * specific project.
 */
export const revalidate = 3600;

const TITLE = "Projects & case studies";

function topStack(data: Awaited<ReturnType<typeof getPortfolio>>): string[] {
  const counts = new Map<string, number>();
  for (const project of data.projects) {
    for (const item of project.tech) counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([item]) => item);
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPortfolio();
  const description = `Case studies of web projects by ${data.profile.fullName}, built with ${listText(topStack(data))} — from CMS-driven platforms to AI tools.`;

  return {
    title: TITLE,
    description,
    alternates: { canonical: "/projects" },
    openGraph: { title: `${TITLE} — ${data.profile.fullName}`, description, url: "/projects" },
  };
}

export default async function ProjectsPage() {
  const [data, settings] = await Promise.all([getPortfolio(), getSiteSettings()]);
  if (!sectionVisibility(data).projects) notFound();

  const lede =
    data.sections.projects.subheading ||
    `Selected work by ${data.profile.fullName} — what each project needed, how it was built and what it runs on.`;

  return (
    <SubpageShell data={data} settings={settings}>
      <JsonLd data={projectsIndexGraph(data.projects, TITLE)} />

      <div className="container max-w-5xl pb-20 pt-10 md:pb-28 md:pt-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Projects" }]} />

        <header className="mt-8 max-w-3xl space-y-5">
          <p className="flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-border" />
            <span className="label-mono text-primary">{data.sections.projects.eyebrow || "Portfolio"}</span>
          </p>
          <h1 className="text-section font-semibold text-balance">{TITLE}</h1>
          <p className="text-lg leading-relaxed text-muted-foreground text-pretty">{lede}</p>
        </header>

        <ul className="mt-12 grid gap-5 md:grid-cols-2">
          {data.projects.map((project) => (
            <li key={project.slug}>
              <ProjectTeaser project={project} />
            </li>
          ))}
        </ul>
      </div>
    </SubpageShell>
  );
}
