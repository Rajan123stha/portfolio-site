"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Github, ImageOff, Star } from "lucide-react";

import { SpotlightCard } from "@/components/ui/spotlight-card";
import type {
  ProjectCategoryView,
  ProjectView,
  SectionView,
} from "@/lib/queries/public";
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
                    className={`relative rounded-full px-4 py-1.5 font-mono text-xs transition-colors ${
                      selected
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
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
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    ) : null}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </motion.div>
          ) : null}
        </div>

        <motion.div layout className="grid gap-5 md:grid-cols-2">
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

function ProjectCard({ project }: { project: ProjectView }) {
  const { title, description, imageUrl, tech, demoUrl, codeUrl, featured } =
    project;

  const primaryHref = demoUrl ?? codeUrl;

  return (
    <SpotlightCard as="article" className="flex h-full flex-col">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-border bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`Screenshot of ${title}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-top transition-transform duration-700 ease-out group-hover/spotlight:scale-[1.04] motion-reduce:transition-none"
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

        {featured ? (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/90 px-2.5 py-1 backdrop-blur-md">
            <Star aria-hidden className="h-3 w-3 fill-primary text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-wider">
              Featured
            </span>
          </span>
        ) : null}

        {project.category ? (
          <span className="absolute right-4 top-4 rounded-full border border-border bg-background/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur-md">
            {project.category.label}
          </span>
        ) : null}
      </div>

      <div className="relative flex flex-1 flex-col gap-4 p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold leading-snug tracking-tight text-balance">
            {/*
              Stretched link: the whole card is the click target for the primary
              action, while the explicit buttons below stay individually
              reachable because they sit above it in the stacking order.
            */}
            {primaryHref ? (
              <Link
                href={primaryHref}
                target="_blank"
                rel="noopener noreferrer"
                className="before:absolute before:inset-0 before:z-0 before:content-[''] hover:text-primary"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </h3>

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
    </SpotlightCard>
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
