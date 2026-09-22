import "server-only";

import type { PortfolioData, ProjectView, SiteSettingsView } from "@/lib/queries/public";
import { absoluteUrl } from "./site";

/**
 * schema.org descriptions of the site, embedded as JSON-LD.
 *
 * The most useful one is the Person. A search for this name returns several
 * different developers who share it; a Person entity with a job title, a
 * location and `sameAs` links to the GitHub and LinkedIn profiles is how a
 * search engine tells which one this site is about — and it's what can earn a
 * knowledge panel for the name.
 *
 * Every node has a stable `@id`, so pages reference the same Person instead of
 * redefining it.
 */

type Node = Record<string, unknown>;

const PERSON_ID = () => absoluteUrl("/#person");
const WEBSITE_ID = () => absoluteUrl("/#website");

export function homeGraph(data: PortfolioData, settings: SiteSettingsView): Node {
  const { profile } = data;
  const home = absoluteUrl("/");

  const sameAs = data.socialLinks
    .map((link) => link.href)
    .filter((href) => /^https?:\/\//.test(href));

  const email = data.contactLinks
    .map((link) => link.href)
    .find((href) => href.startsWith("mailto:"))
    ?.slice("mailto:".length);

  const [locality, country] = profile.location.split(",").map((part) => part.trim());
  const currentRole = data.experiences.find((role) => /present|current|now/i.test(role.period));

  const person: Node = {
    "@type": "Person",
    "@id": PERSON_ID(),
    name: profile.fullName,
    url: home,
    jobTitle: profile.headline || undefined,
    description: profile.heroBio || undefined,
    image: profile.avatarUrl ? absoluteUrl(profile.avatarUrl) : undefined,
    email: email ? `mailto:${email}` : undefined,
    address: locality
      ? { "@type": "PostalAddress", addressLocality: locality, addressCountry: country || undefined }
      : undefined,
    worksFor: currentRole ? { "@type": "Organization", name: currentRole.company } : undefined,
    knowsAbout: data.skillGroups.flatMap((group) => group.skills.map((skill) => skill.name)),
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };

  return graph([
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID(),
      url: home,
      name: profile.fullName,
      description: settings.metaDescription,
      inLanguage: "en",
      publisher: { "@id": PERSON_ID() },
    },
    {
      "@type": "ProfilePage",
      "@id": absoluteUrl("/#profile"),
      url: home,
      name: settings.metaTitle,
      isPartOf: { "@id": WEBSITE_ID() },
      mainEntity: { "@id": PERSON_ID() },
    },
    person,
  ]);
}

export function projectGraph(project: ProjectView, description: string): Node {
  const url = absoluteUrl(`/projects/${project.slug}`);

  return graph([
    {
      "@type": "CreativeWork",
      "@id": `${url}#project`,
      url,
      name: project.title,
      headline: project.title,
      description,
      image: project.imageUrl ? absoluteUrl(project.imageUrl) : undefined,
      genre: project.category?.label,
      keywords: project.tech.join(", ") || undefined,
      author: { "@id": PERSON_ID() },
      creator: { "@id": PERSON_ID() },
      isPartOf: { "@id": WEBSITE_ID() },
      // The live product this case study describes.
      sameAs: [project.demoUrl, project.codeUrl].filter(Boolean),
    },
    breadcrumbs([
      { name: "Home", path: "/" },
      { name: "Projects", path: "/projects" },
      { name: project.title, path: `/projects/${project.slug}` },
    ]),
  ]);
}

export function projectsIndexGraph(projects: ProjectView[], title: string): Node {
  const url = absoluteUrl("/projects");

  return graph([
    {
      "@type": "CollectionPage",
      "@id": `${url}#page`,
      url,
      name: title,
      isPartOf: { "@id": WEBSITE_ID() },
      about: { "@id": PERSON_ID() },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: projects.map((project, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(`/projects/${project.slug}`),
          name: project.title,
        })),
      },
    },
    breadcrumbs([
      { name: "Home", path: "/" },
      { name: "Projects", path: "/projects" },
    ]),
  ]);
}

function breadcrumbs(items: Array<{ name: string; path: string }>): Node {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

function graph(nodes: Node[]): Node {
  return { "@context": "https://schema.org", "@graph": nodes.map(prune) };
}

/** Drops empty fields; validators flag `"jobTitle": ""` as an error. */
function prune(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(prune).filter((item) => item !== undefined);
    return items.length > 0 ? items : undefined;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, prune(item)] as const)
      .filter(([, item]) => item !== undefined && item !== "");
    return Object.fromEntries(entries);
  }
  return value;
}
