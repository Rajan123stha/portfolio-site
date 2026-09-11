import "server-only";

import type { Knowledge } from "./knowledge";
import type { SourceKind } from "./protocol";

/**
 * Which of a recruiter's standard questions the published content can answer.
 *
 * The assistant is only as good as its facts: when availability or location is
 * missing it will (correctly) say "the portfolio doesn't cover that". Showing
 * the owner these gaps up front turns a future "I don't know" into a field to
 * fill in today.
 */
export type CoverageItem = {
  label: string;
  question: string;
  covered: boolean;
  fixHref: string;
  fixLabel: string;
};

export function assessCoverage(knowledge: Knowledge): CoverageItem[] {
  const hasFact = (pattern: RegExp) => knowledge.facts.some((fact) => pattern.test(fact.text));
  const hasKind = (kind: SourceKind) => knowledge.sources.some((source) => source.kind === kind);
  const profile = { fixHref: "/admin/profile", fixLabel: "Profile & hero" };

  return [
    { label: "Availability", question: "Is {name} available?", covered: hasFact(/^Availability status/), ...profile },
    { label: "Roles open to", question: "What roles is {name} looking for?", covered: hasFact(/^Open to:/), ...profile },
    { label: "Location", question: "Where is {name} based?", covered: hasFact(/^Based in:/), ...profile },
    { label: "Experience length", question: "How experienced is {name}?", covered: hasFact(/^Professional experience:/), ...profile },
    { label: "Work history", question: "Where has {name} worked?", covered: hasKind("experience"), fixHref: "/admin/experience", fixLabel: "Experience" },
    { label: "Projects & stack", question: "Has {name} used this in production?", covered: hasKind("project"), fixHref: "/admin/projects", fixLabel: "Projects" },
    { label: "Skills", question: "What's {name}'s stack?", covered: hasKind("skills"), fixHref: "/admin/skills", fixLabel: "Skills" },
    { label: "Services", question: "What can I hire {name} for?", covered: hasKind("service"), fixHref: "/admin/services", fixLabel: "What I offer" },
    { label: "Downloadable CV", question: "Can I see a CV?", covered: hasFact(/^CV available/), ...profile },
  ];
}
