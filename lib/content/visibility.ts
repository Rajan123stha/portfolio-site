import type { PortfolioData } from "@/lib/queries/public";

/**
 * Which sections the public page actually renders.
 *
 * Shared by the page and the AI assistant's knowledge base so the two can never
 * disagree: anything hidden on the site must also be unknown to the assistant,
 * otherwise the chat would quietly reveal content the owner chose to hide.
 *
 * A collection section also needs at least one row — an empty heading with
 * nothing under it is treated as hidden.
 */
export function sectionVisibility({
  sections,
  services,
  skillGroups,
  experiences,
  projects,
  highlightGroups,
}: PortfolioData) {
  return {
    hero: sections.hero.visible,
    about: sections.about.visible,
    services: sections.services.visible && services.length > 0,
    skills: sections.skills.visible && skillGroups.length > 0,
    experience: sections.experience.visible && experiences.length > 0,
    projects: sections.projects.visible && projects.length > 0,
    value: sections.value.visible && highlightGroups.length > 0,
    contact: sections.contact.visible,
  };
}

export type SectionVisibility = ReturnType<typeof sectionVisibility>;
