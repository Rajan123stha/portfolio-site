import "server-only";

import { sectionVisibility } from "@/lib/content/visibility";
import type { PortfolioData } from "@/lib/queries/public";
import type { AssistantSource, SourceKind } from "./protocol";

/**
 * The assistant's entire world: the published portfolio, flattened into short,
 * individually numbered facts.
 *
 * Numbering is what makes grounding checkable. The model is required to cite a
 * fact ID after every claim, and because each ID maps back to a known sentence
 * the server can verify the citation exists, show the visitor the exact source
 * text, and test the claim's numbers and names against it. Free-form context
 * would leave nothing to check against.
 *
 * Built from the same cached payload the page renders, so a CMS edit reaches
 * the assistant the moment it reaches the site — and a section hidden on the
 * site is absent here too.
 */

export type Fact = {
  /** `F1`, `F2`, … — short enough for a model to reproduce exactly. */
  id: string;
  text: string;
  source: AssistantSource;
};

export type Knowledge = {
  facts: Fact[];
  sources: AssistantSource[];
  byId: ReadonlyMap<string, Fact>;
  /** Every URL the portfolio publishes — the only links the widget makes clickable. */
  links: string[];
  owner: { fullName: string; firstName: string };
};

export function buildKnowledge(data: PortfolioData): Knowledge {
  const show = sectionVisibility(data);
  const { profile } = data;

  const fullName = clean(profile.fullName) || "the site owner";
  const firstName = fullName.split(" ")[0] ?? fullName;

  const facts: Fact[] = [];
  const sources: AssistantSource[] = [];
  const links = new Set<string>();

  /** Registers a source and returns a function that adds facts to it. */
  const open = (
    kind: SourceKind,
    key: string,
    label: string,
    href: string,
    fallbackHref = href,
  ) => {
    const source: AssistantSource = {
      id: `${kind}:${key}`,
      kind,
      label: truncate(clean(label), 80),
      href,
      fallbackHref,
    };
    sources.push(source);

    return (...lines: Array<string | null | undefined | false>) => {
      for (const line of lines) {
        const text = line ? clean(line) : "";
        if (!text) continue;
        facts.push({ id: `F${facts.length + 1}`, text: sentence(text), source });
      }
    };
  };

  const link = (href: string | null | undefined): string | null => {
    const value = href?.trim();
    if (!value) return null;
    links.add(value);
    return value;
  };

  // ── Profile ────────────────────────────────────────────────────────────────
  // The name is always known; everything else only if the hero is on the page.
  const addProfile = open("profile", "main", "Profile", "#intro", "#about");
  addProfile(`Full name: ${fullName}`);

  if (show.hero) {
    const experience = [profile.experienceYears, profile.experienceLabel]
      .filter(Boolean)
      .join(" ");
    const cvUrl = link(profile.cvUrl);

    addProfile(
      profile.heroBio,
      profile.location && `Based in: ${profile.location}`,
      profile.experienceYears && `Professional experience: ${experience}`,
      profile.availabilityVisible &&
        profile.availabilityLabel &&
        `Availability status shown on the site: ${profile.availabilityLabel}`,
      profile.openTo.length > 0 && `Open to: ${list(profile.openTo)}`,
      cvUrl && `CV available to download: ${cvUrl}`,
    );
  }

  // ── About ──────────────────────────────────────────────────────────────────
  if (show.about) {
    const addAbout = open("about", "main", "About", "#about");
    addAbout(...profile.aboutParagraphs);
    if (data.coreStack.length > 0) {
      const title = profile.coreStackTitle || "Core stack";
      addAbout(`${title}: ${list(data.coreStack.map((item) => item.label))}`);
    }
  }

  // ── Services ───────────────────────────────────────────────────────────────
  if (show.services) {
    for (const service of data.services) {
      const add = open("service", service.id, service.title, "#services");
      add(
        `Service offered: ${service.title} — ${service.summary}`,
        service.deliverables.length > 0 &&
          `${service.title} includes: ${list(service.deliverables)}`,
        service.note && `${service.title}: ${service.note}`,
      );
    }
  }

  // ── Skills ─────────────────────────────────────────────────────────────────
  if (show.skills) {
    for (const group of data.skillGroups) {
      if (group.skills.length === 0) continue;
      const add = open("skills", group.id, `Skills · ${group.title}`, "#skills");
      add(
        `Listed ${group.title} skills: ${list(group.skills.map((skill) => skill.name))}`,
      );
    }
  }

  // ── Experience ─────────────────────────────────────────────────────────────
  if (show.experience) {
    for (const role of data.experiences) {
      const add = open(
        "experience",
        role.id,
        `${role.title} · ${role.company}`,
        `#experience-${role.id}`,
        "#experience",
      );
      add(
        `Role: ${role.title} at ${role.company} (${role.period})`,
        role.employmentType &&
          `${role.title} at ${role.company} was ${role.employmentType}`,
        role.summary,
        ...role.bullets.map((bullet) => `At ${role.company}: ${bullet}`),
      );
    }
  }

  // ── Projects ───────────────────────────────────────────────────────────────
  if (show.projects) {
    for (const project of data.projects) {
      const add = open(
        "project",
        project.slug,
        project.title,
        `#project-${project.slug}`,
        "#projects",
      );
      const category = project.category ? ` (${project.category.label})` : "";
      const featured = project.featured ? ", a featured project" : "";
      const demoUrl = link(project.demoUrl);
      const codeUrl = link(project.codeUrl);

      add(
        `Project: ${project.title}${category}${featured}`,
        project.description,
        project.tech.length > 0 &&
          `${project.title} was built with: ${list(project.tech)}`,
        demoUrl && `${project.title} live site: ${demoUrl}`,
        codeUrl && `${project.title} source code: ${codeUrl}`,
      );
    }
  }

  // ── Why work with me ───────────────────────────────────────────────────────
  if (show.value) {
    for (const group of data.highlightGroups) {
      if (group.highlights.length === 0) continue;
      const add = open("highlight", group.id, group.title, "#whyMe");
      add(...group.highlights.map((item) => `${group.title}: ${item.text}`));
    }
  }

  // ── Contact ────────────────────────────────────────────────────────────────
  // Social links live in the header and footer, so they're known even when the
  // contact section itself is hidden.
  const addContact = open("contact", "main", "Contact", "#contact");
  if (show.contact) {
    addContact(
      `Visitors can message ${firstName} with the contact form in the Contact section of this page`,
      ...data.contactLinks.map((item) => {
        link(item.href);
        return `${item.label}: ${item.value}`;
      }),
    );
  }
  addContact(
    ...data.socialLinks.map((item) => {
      const href = link(item.href);
      return href && `${item.label}: ${href}`;
    }),
  );

  return {
    facts,
    // A source that ended up with no facts (e.g. contact with no links) is noise.
    sources: sources.filter((source) =>
      facts.some((fact) => fact.source === source),
    ),
    byId: new Map(facts.map((fact) => [fact.id, fact])),
    links: [...links],
    owner: { fullName, firstName },
  };
}

/**
 * The facts as the model sees them, grouped under their source so it can tell
 * "listed as a skill" apart from "used in this project".
 */
export function renderFacts(knowledge: Knowledge): string {
  return knowledge.sources
    .map((source) => {
      const lines = knowledge.facts
        .filter((fact) => fact.source === source)
        .map((fact) => `[${fact.id}] ${fact.text}`);
      return `## ${kindLabel(source.kind)}: ${source.label}\n${lines.join("\n")}`;
    })
    .join("\n\n");
}

const KIND_LABELS: Record<SourceKind, string> = {
  profile: "Profile",
  about: "About",
  service: "Service",
  skills: "Skills list",
  experience: "Work experience",
  project: "Project",
  highlight: "Strengths",
  contact: "Contact",
};

export function kindLabel(kind: SourceKind): string {
  return KIND_LABELS[kind];
}

// ── Text helpers ─────────────────────────────────────────────────────────────

/** Collapses whitespace; CMS text often carries stray newlines. */
function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Ends a fact with punctuation so adjacent facts can't read as one sentence. */
function sentence(text: string): string {
  return /[.!?:)]$/.test(text) ? text : `${text}.`;
}

function list(items: string[]): string {
  return items.map(clean).filter(Boolean).join(", ");
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
