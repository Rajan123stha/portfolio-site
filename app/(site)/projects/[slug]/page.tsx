import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Github, Mail, Sparkles } from "lucide-react";

import { SubpageShell } from "@/components/layout/subpage-shell";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ProjectTeaser } from "@/components/projects/project-teaser";
import { sectionVisibility } from "@/lib/content/visibility";
import { getPortfolio, getSiteSettings } from "@/lib/queries/public";
import { listText, paragraphs, projectDescription, relatedProjects } from "@/lib/seo/projects";
import { projectGraph } from "@/lib/seo/structured-data";

/**
 * A project's own page — the case study behind the card on the homepage.
 *
 * On a single-page portfolio every project competes for one URL. A page each
 * gives every project its own title, description and address to rank for
 * searches about that kind of work ("Next.js travel booking system",
 * "tender management platform"), and gives visitors somewhere to read more
 * than the three lines a card holds.
 *
 * Prerendered for every visible project and regenerated whenever the content
 * changes; a project added later renders on its first visit.
 */
export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const [data, settings] = await Promise.all([getPortfolio(), getSiteSettings()]);
  // A hidden projects section hides its pages too.
  if (!sectionVisibility(data).projects) return null;

  const index = data.projects.findIndex((project) => project.slug === slug);
  if (index === -1) return null;

  return { data, settings, project: data.projects[index], index };
}

export async function generateStaticParams() {
  const data = await getPortfolio();
  return data.projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await load(slug);
  if (!loaded) return {};

  const { project } = loaded;
  const description = projectDescription(project);
  const path = `/projects/${project.slug}`;

  return {
    title: project.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: `${project.title} — case study`,
      description,
      url: path,
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.title} — case study`,
      description,
    },
  };
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const loaded = await load(slug);
  if (!loaded) notFound();

  const { data, settings, project, index } = loaded;
  const { profile } = data;
  const firstName = profile.fullName.split(" ")[0] ?? profile.fullName;

  const sections = [
    { heading: "The challenge", body: paragraphs(project.challenge) },
    { heading: "How it was built", body: paragraphs(project.approach) },
    { heading: "The outcome", body: paragraphs(project.outcome) },
  ].filter((section) => section.body.length > 0);

  const related = relatedProjects(project, data.projects);
  const previous = data.projects[index - 1] ?? null;
  const next = data.projects[index + 1] ?? null;

  return (
    <SubpageShell data={data} settings={settings}>
      <JsonLd data={projectGraph(project, projectDescription(project))} />

      <article className="container max-w-5xl pb-20 pt-10 md:pb-28 md:pt-14">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Projects", href: "/projects" },
            { label: project.title },
          ]}
        />

        {/* ── Header ── */}
        <header className="mt-8 max-w-3xl space-y-5">
          <p className="flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-border" />
            <span className="label-mono text-primary">
              Case study{project.category ? ` · ${project.category.label}` : ""}
            </span>
          </p>

          <h1 className="text-section font-semibold text-balance">{project.title}</h1>

          {project.description ? (
            <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
              {project.description}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-1">
            {project.demoUrl ? (
              <ExternalButton href={project.demoUrl} primary>
                Visit the live site
                <ArrowUpRight aria-hidden className="h-4 w-4" />
              </ExternalButton>
            ) : null}
            {project.codeUrl ? (
              <ExternalButton href={project.codeUrl}>
                <Github aria-hidden className="h-4 w-4" />
                Source code
              </ExternalButton>
            ) : null}
          </div>
        </header>

        {/* ── Screenshot ── */}
        {project.imageUrl ? (
          <figure className="mt-12 overflow-hidden rounded-2xl border border-border bg-elevated shadow-[0_24px_60px_-30px_rgba(0,0,0,0.5)]">
            <div aria-hidden className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            </div>
            <div className="relative aspect-[22/10]">
              <Image
                src={project.imageUrl}
                alt={project.imageAlt || `Screenshot of ${project.title}`}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover object-top"
              />
            </div>
          </figure>
        ) : null}

        {/* ── Body ── */}
        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-16">
          <div className="space-y-12">
            {sections.map((section) => (
              <section key={section.heading} className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">{section.heading}</h2>
                {section.body.map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex} className="leading-relaxed text-muted-foreground text-pretty">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}

            {project.tech.length > 0 ? (
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">Technology</h2>
                <p className="leading-relaxed text-muted-foreground text-pretty">
                  {project.title} was built with {listText(project.tech)}.{" "}
                  <Link href="/#skills" className="font-medium text-primary hover:underline">
                    See {firstName}’s full stack
                  </Link>
                  .
                </p>
              </section>
            ) : null}

            {/* ── Call to action ── */}
            <section className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-6 md:p-8">
              <h2 className="text-xl font-semibold tracking-tight">
                Need something like this built?
              </h2>
              <p className="mt-2 leading-relaxed text-muted-foreground text-pretty">
                {firstName} takes on websites, web apps and internal systems — from first design to
                deployment.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/#contact"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Mail aria-hidden className="h-4 w-4" />
                  Get in touch
                </Link>
                <Link
                  href="/#services"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40"
                >
                  <Sparkles aria-hidden className="h-4 w-4" />
                  What I offer
                </Link>
              </div>
            </section>
          </div>

          {/* ── Facts ── */}
          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
            <dl className="space-y-5 rounded-2xl border border-border bg-card p-5">
              {project.category ? <Fact label="Type" value={project.category.label} /> : null}
              <Fact label="Built by" value={profile.fullName} href="/" />
              {project.demoUrl ? <Fact label="Live site" value={hostOf(project.demoUrl)} href={project.demoUrl} external /> : null}
              {project.tech.length > 0 ? (
                <div className="space-y-2">
                  <dt className="label-mono text-muted-foreground">Stack</dt>
                  <dd>
                    <ul className="flex flex-wrap gap-1.5">
                      {project.tech.map((item) => (
                        <li
                          key={item}
                          className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
            </dl>
          </aside>
        </div>

        {/* ── Related ── */}
        {related.length > 0 ? (
          <section className="mt-20 border-t border-border pt-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">More projects</h2>
              <Link href="/projects" className="text-sm font-medium text-primary hover:underline">
                All case studies
              </Link>
            </div>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {related.map((item) => (
                <li key={item.slug}>
                  <ProjectTeaser project={item} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ── Previous / next ── */}
        {previous || next ? (
          <nav aria-label="More case studies" className="mt-14 grid gap-4 sm:grid-cols-2">
            {previous ? (
              <Link
                href={`/projects/${previous.slug}`}
                className="group rounded-2xl border border-border p-5 transition-colors hover:border-primary/40"
              >
                <span className="flex items-center gap-1.5 label-mono text-muted-foreground">
                  <ArrowLeft aria-hidden className="h-3 w-3" /> Previous
                </span>
                <span className="mt-2 block font-medium group-hover:text-primary">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/projects/${next.slug}`}
                className="group rounded-2xl border border-border p-5 text-right transition-colors hover:border-primary/40"
              >
                <span className="flex items-center justify-end gap-1.5 label-mono text-muted-foreground">
                  Next <ArrowRight aria-hidden className="h-3 w-3" />
                </span>
                <span className="mt-2 block font-medium group-hover:text-primary">{next.title}</span>
              </Link>
            ) : null}
          </nav>
        ) : null}
      </article>
    </SubpageShell>
  );
}

function Fact({ label, value, href, external }: { label: string; value: string; href?: string; external?: boolean }) {
  return (
    <div className="space-y-1">
      <dt className="label-mono text-muted-foreground">{label}</dt>
      <dd className="text-sm">
        {href ? (
          <a
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="font-medium text-foreground hover:text-primary"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function ExternalButton({ href, primary, children }: { href: string; primary?: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        primary
          ? "inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          : "inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40"
      }
    >
      {children}
    </a>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
