import "server-only";

import type { ProjectView } from "@/lib/queries/public";
import { clip } from "./og";

/**
 * Meta description for a project page: its own description, plus the stack
 * when the description is short — technology names are what people search for.
 * Kept under ~155 characters, where Google truncates snippets.
 */
export function projectDescription(project: ProjectView): string {
  const stack = project.tech.slice(0, 4).join(", ");
  const base = project.description.trim() || `${project.title}, a ${project.category?.label ?? "web"} project.`;
  const withStack = base.length < 110 && stack ? `${base} Built with ${stack}.` : base;
  return clip(withStack, 155);
}

/** Case-study text is stored as plain paragraphs separated by blank lines. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * Up to three other projects worth reading next: most shared technologies
 * first, then the same category. Links between related pages are how both
 * readers and crawlers find the rest of the work.
 */
export function relatedProjects(project: ProjectView, all: ProjectView[]): ProjectView[] {
  const stack = new Set(project.tech.map((item) => item.toLowerCase()));

  return all
    .filter((other) => other.slug !== project.slug)
    .map((other) => ({
      other,
      score:
        other.tech.filter((item) => stack.has(item.toLowerCase())).length * 2 +
        (other.category && other.category.slug === project.category?.slug ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ other }) => other);
}

/** "A, B and C" */
export function listText(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
