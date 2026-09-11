"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Github, ImageOff, Star } from "lucide-react";

import type {
  ProjectCategoryView,
  ProjectView,
  SectionView,
} from "@/lib/queries/public";
import { cn } from "@/lib/utils";
import { SectionGlow, SectionRules } from "./section-decor";
import { SectionHeading } from "./section-heading";

type ProjectsProps = {
  section: SectionView;
  categories: ProjectCategoryView[];
  projects: ProjectView[];
  index: number;
};

const ALL = "all";

export function Projects({
  section,
  categories,
  projects,
  index,
}: ProjectsProps) {
  const [active, setActive] = useState(ALL);

  /**
   * Only offer filters that would return something. An editor who hides every
   * AI project shouldn't leave behind a tab that renders an empty grid.
   */
  const tabs = useMemo(() => {
    const populated = new Set(
      projects.map((project) => project.category?.slug).filter(Boolean),
    );
    return [
      { slug: ALL, label: "All" },
      ...categories.filter((category) => populated.has(category.slug)),
    ];
  }, [categories, projects]);

  const filtered = useMemo(
    () =>
      active === ALL
        ? projects
        : projects.filter((project) => project.category?.slug === active),
    [active, projects],
  );

  return (
    <section
      id="projects"
      className="relative scroll-mt-24 overflow-hidden bg-background py-20 md:py-28"
    >
      <SectionRules />
      <SectionGlow variant="topRight" />

      <div className="container relative max-w-6xl">
        <div className="mb-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading section={section} index={index} />

          {tabs.length > 2 ? (
            <motion.div
              role="tablist"
              aria-label="Filter projects by category"
              className="flex flex-wrap gap-1.5 rounded-full border border-border bg-card p-1.5"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {tabs.map((tab) => {
                const selected = active === tab.slug;
                return (
                  <button
                    key={tab.slug}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActive(tab.slug)}
                    className={cn(
                      "relative rounded-full px-4 py-1.5 font-mono text-xs transition-colors",
                      selected
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {/*
                      A single shared layout element slides between tabs rather
                      than each tab animating its own background — that's what
                      makes the pill feel like one object moving.
                    */}
                    {selected ? (
                      <motion.span
                        layoutId="project-tab"
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-primary"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 32,
                        }}
                      />
                    ) : null}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </motion.div>
          ) : null}
        </div>

        <motion.div layout className="grid gap-6 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((project, i) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

/** Host shown in the mock browser's address bar. */
function displayHost(url: string | null): string {
  if (!url) return "localhost";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "localhost";
  }
}

function ProjectCard({ project }: { project: ProjectView }) {
  const { title, description, imageUrl, tech, demoUrl, codeUrl, featured } =
    project;

  const primaryHref = demoUrl ?? codeUrl;

  return (
    <article
      className={cn(
        "group/card relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-500",
        featured
          ? "border-primary/30 hover:border-primary/50"
          : "border-border hover:border-primary/40",
      )}
    >
      {/* Accent wash behind the screenshot, always on for featured work. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b to-transparent transition-opacity duration-500",
          featured
            ? "from-primary/[0.10] opacity-100"
            : "from-primary/[0.05] opacity-0 group-hover/card:opacity-100",
        )}
      />

      {/* ── Screenshot, framed as a browser window ── */}
      <div className="relative px-5 pt-5">
        <div className="overflow-hidden rounded-xl border border-border bg-elevated shadow-[0_12px_32px_-16px_rgba(0,0,0,0.45)] transition-transform duration-500 ease-out group-hover/card:-translate-y-1">
          {/*
            A chrome bar turns an arbitrary upload into a deliberate object.
            Screenshots arrive at every imaginable aspect ratio and rarely
            include the browser frame; without one they read as a stray image
            bleeding into the card. With one, even an awkward crop looks like a
            picture *of a website*, which is exactly what it is.
          */}
          <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
            <div aria-hidden className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400/70" />
              <span className="h-2 w-2 rounded-full bg-amber-400/70" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
            </div>
            <div className="mx-auto flex max-w-[60%] items-center rounded-md bg-background px-2.5 py-0.5">
              <span className="truncate font-mono text-[10px] text-muted-foreground">
                {displayHost(demoUrl)}
              </span>
            </div>

            {/*
              The featured marker lives in the chrome bar, not floating over
              the window: as an overlay it landed squarely on the traffic
              lights, and anywhere else on the screenshot it competes with the
              captured page for attention.
            */}
            {featured ? (
              <span className="flex shrink-0 items-center gap-1 text-primary">
                <Star aria-hidden className="h-3 w-3 fill-current" />
                <span className="font-mono text-[9px] uppercase tracking-wider">
                  Featured
                </span>
              </span>
            ) : (
              <span aria-hidden className="w-10 shrink-0" />
            )}
          </div>

          {/*
            22:10 rather than the usual 16:10. Website screenshots are wide and
            short — every image in this library measures between 2.06 and 2.53
            — so a 1.6 box left a third of the frame empty under a shrunken
            capture. Matching the shape of the real content means the common
            case fills the frame with almost nothing cropped.
          */}
          <div className="relative aspect-[22/10] overflow-hidden bg-background">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={`Screenshot of ${title}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                /*
                 * Anchored to the top so an unusually tall upload still shows
                 * the page header — the part that identifies a site — rather
                 * than a slice of its middle.
                 */
                className="object-cover object-top transition-transform duration-[900ms] ease-out group-hover/card:scale-[1.03] motion-reduce:transition-none"
              />
            ) : (
              <div
                aria-hidden
                className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground"
              >
                <ImageOff className="h-5 w-5" />
                <span className="font-mono text-xs">No preview</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Content ── */}
      <div className="relative flex flex-1 flex-col gap-4 p-6">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-balance">
              {/*
                Stretched link: the whole card is the click target for the
                primary action, while the explicit links below stay individually
                reachable because they sit above it in the stacking order.
              */}
              {primaryHref ? (
                <Link
                  href={primaryHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors before:absolute before:inset-0 before:z-0 before:content-[''] hover:text-primary"
                >
                  {title}
                </Link>
              ) : (
                title
              )}
            </h3>

            {project.category ? (
              <span className="mt-0.5 shrink-0 rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {project.category.label}
              </span>
            ) : null}
          </div>

          {description ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {tech.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {tech.map((item) => (
              <li
                key={item}
                className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        {demoUrl || codeUrl ? (
          <div className="relative z-10 mt-auto flex items-center gap-4 border-t border-border pt-4">
            {demoUrl ? (
              <ProjectLink href={demoUrl} label={`Live demo of ${title}`}>
                Live demo
                <ArrowUpRight
                  aria-hidden
                  className="h-3.5 w-3.5 transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                />
              </ProjectLink>
            ) : null}

            {codeUrl ? (
              <ProjectLink href={codeUrl} label={`Source code for ${title}`}>
                <Github aria-hidden className="h-3.5 w-3.5" />
                Source
              </ProjectLink>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ProjectLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="group/link inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
    >
      {children}
    </Link>
  );
}
