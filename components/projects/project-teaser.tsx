import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { ProjectView } from "@/lib/queries/public";

/** Compact link to a project's case study, for indexes and "more projects". */
export function ProjectTeaser({ project }: { project: ProjectView }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
    >
      {project.category ? (
        <span className="label-mono text-muted-foreground">{project.category.label}</span>
      ) : null}
      <span className="font-semibold leading-snug tracking-tight group-hover:text-primary">{project.title}</span>
      {project.description ? (
        <span className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{project.description}</span>
      ) : null}
      <span className="mt-auto inline-flex items-center gap-1.5 font-mono text-xs font-medium text-primary">
        Read the case study
        <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
