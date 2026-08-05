import { ScrollProgress } from "@/components/layout/scroll-progress";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { About } from "@/components/sections/about";
import { Contact } from "@/components/sections/contact";
import { Experience } from "@/components/sections/experience";
import { Hero } from "@/components/sections/hero";
import { Projects } from "@/components/sections/projects";
import { Skills } from "@/components/sections/skills";
import { Value } from "@/components/sections/value";
import { getPortfolio, getSiteSettings } from "@/lib/queries/public";

/**
 * Rendered per request rather than prerendered at build time.
 *
 * Static generation would bake the page into the build output, but it also
 * makes the build require live database credentials — so a transient Neon
 * outage, a CI job, or a preview deploy without secrets would fail the build
 * outright.
 *
 * Nothing is given up by rendering dynamically, because the cost that matters
 * is the database round-trip and `unstable_cache` has already removed it: a
 * warm request reads the whole page payload from the data cache and never
 * touches Postgres. Invalidation is then a single explicit mechanism —
 * `revalidateTag` from the admin actions — instead of also having to reason
 * about the full route cache.
 */
export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  /**
   * Both reads are guaranteed to resolve to complete content: anything the
   * database doesn't supply is filled from `lib/content/defaults.ts`, so a
   * brand-new install renders a finished page rather than an empty shell.
   */
  const [data, settings] = await Promise.all([
    getPortfolio(),
    getSiteSettings(),
  ]);

  const { sections, profile } = data;

  /**
   * Section numbers are assigned from what actually renders, so hiding a
   * section closes the gap instead of leaving `01 · 03 · 04` on the page.
   */
  let counter = 0;
  const nextIndex = () => (counter += 1);

  const show = {
    about: sections.about.visible,
    skills: sections.skills.visible && data.skillGroups.length > 0,
    experience: sections.experience.visible && data.experiences.length > 0,
    projects: sections.projects.visible && data.projects.length > 0,
    value: sections.value.visible && data.highlightGroups.length > 0,
    contact: sections.contact.visible,
  };

  /** Flattened skill names, feeding the hero's marquee strip. */
  const tech = data.skillGroups.flatMap((group) =>
    group.skills.map((skill) => skill.name),
  );

  return (
    <>
      <ScrollProgress />

      <SiteHeader
        settings={settings}
        navItems={data.navItems}
        socialLinks={data.socialLinks}
      />

      <main>
        {sections.hero.visible ? (
          <Hero profile={profile} section={sections.hero} tech={tech} />
        ) : null}

        {show.about ? (
          <About
            section={sections.about}
            profile={profile}
            coreStack={data.coreStack}
            index={nextIndex()}
          />
        ) : null}

        {show.skills ? (
          <Skills
            section={sections.skills}
            levels={data.skillLevels}
            groups={data.skillGroups}
            index={nextIndex()}
          />
        ) : null}

        {show.experience ? (
          <Experience
            section={sections.experience}
            experiences={data.experiences}
            index={nextIndex()}
          />
        ) : null}

        {show.projects ? (
          <Projects
            section={sections.projects}
            categories={data.projectCategories}
            projects={data.projects}
            index={nextIndex()}
          />
        ) : null}

        {show.value ? (
          <Value
            section={sections.value}
            groups={data.highlightGroups}
            index={nextIndex()}
          />
        ) : null}

        {show.contact ? (
          <Contact
            section={sections.contact}
            links={data.contactLinks}
            index={nextIndex()}
          />
        ) : null}
      </main>

      <SiteFooter
        settings={settings}
        navItems={data.navItems}
        socialLinks={data.socialLinks}
        year={new Date().getFullYear()}
      />
    </>
  );
}
