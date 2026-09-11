import { PageHeader } from "@/components/admin/page-header";
import { getSections } from "@/lib/queries/admin";
import { sectionKey, type Section, type SectionKey } from "@/db/schema";
import { SectionCard } from "./section-card";

export const metadata = { title: "Section headers" };

/** Labels and guidance per section, so each card explains what it controls. */
const SECTION_META: Record<
  SectionKey,
  { title: string; description: string; anchor: string }
> = {
  hero: {
    title: "Hero",
    description:
      "The opening panel. Its text comes from Profile & hero — this only controls whether it renders.",
    anchor: "#top",
  },
  about: {
    title: "About",
    description: "Heading above your intro paragraphs and core stack.",
    anchor: "#about",
  },
  services: {
    title: "What I offer",
    description: "Heading above the services grid.",
    anchor: "#services",
  },
  skills: {
    title: "Skills",
    description: "Heading above the skills grid.",
    anchor: "#skills",
  },
  experience: {
    title: "Experience",
    description: "Heading above your career timeline.",
    anchor: "#experience",
  },
  projects: {
    title: "Projects",
    description: "Heading above the filterable project grid.",
    anchor: "#projects",
  },
  value: {
    title: "Why work with me",
    description:
      "Heading above the two highlight cards. The note becomes the badge on the last card.",
    anchor: "#whyMe",
  },
  contact: {
    title: "Contact",
    description:
      "The lede appears beside the form; the note is the bold closing line under it.",
    anchor: "#contact",
  },
};

function blank(key: SectionKey): Section {
  const now = new Date();
  return {
    key,
    eyebrow: "",
    heading: "",
    headingAccent: null,
    subheading: null,
    note: null,
    visible: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export default async function SectionsPage() {
  const rows = await getSections();
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return (
    <>
      <PageHeader
        title="Section headers"
        description="The eyebrow, heading and lede that introduce each part of the page — plus whether it appears at all."
      />

      <div className="space-y-4">
        {/* Driven by the enum, so a section added to the schema shows up here. */}
        {sectionKey.enumValues.map((key) => (
          <SectionCard
            key={key}
            meta={SECTION_META[key]}
            section={byKey.get(key) ?? blank(key)}
          />
        ))}
      </div>
    </>
  );
}
