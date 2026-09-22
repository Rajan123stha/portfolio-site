import type { Metadata } from "next";

import { LazyAssistantWidget } from "@/components/assistant/assistant-widget-lazy";
import { ScrollProgress } from "@/components/layout/scroll-progress";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { About } from "@/components/sections/about";
import { Contact } from "@/components/sections/contact";
import { Experience } from "@/components/sections/experience";
import { Hero } from "@/components/sections/hero";
import { Projects } from "@/components/sections/projects";
import { Services } from "@/components/sections/services";
import { Skills } from "@/components/sections/skills";
import { Value } from "@/components/sections/value";
import {
  ASSISTANT_LIMITS,
  getTurnstileConfig,
  isAssistantConfigured,
} from "@/lib/assistant/config";
import { buildKnowledge } from "@/lib/assistant/knowledge";
import { defaultWelcome, resolveQuestions } from "@/lib/assistant/suggestions";
import { sectionVisibility } from "@/lib/content/visibility";
import { JsonLd } from "@/components/seo/json-ld";
import { getPortfolio, getSiteSettings } from "@/lib/queries/public";
import { homeGraph } from "@/lib/seo/structured-data";

/**
 * Statically rendered and served from the CDN, regenerated on change.
 *
 * This page used to render on every request. The data was cached, but each
 * visit still paid for a server render — a 2.8s time-to-first-byte on the live
 * site, which delays everything a visitor (and a crawler measuring Core Web
 * Vitals) sees. As static HTML it arrives from the nearest edge instead.
 *
 * Freshness is unchanged: every admin save calls `revalidateContent()`, which
 * regenerates the page on the next request, and the hourly `revalidate` is only
 * a backstop. A build without database access still succeeds — the queries
 * fall back to bundled content — and the backstop replaces that version with
 * real content within the hour.
 */
export const revalidate = 3600;

/** Title, description and share image come from the root layout. */
export const metadata: Metadata = { alternates: { canonical: "/" } };

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

  const show = sectionVisibility(data);

  /** Flattened skill names, feeding the hero's marquee strip. */
  const tech = data.skillGroups.flatMap((group) =>
    group.skills.map((skill) => skill.name),
  );

  /**
   * The assistant renders only when it's switched on *and* a provider key
   * exists, so enabling it before configuring a key can't ship a dead button.
   */
  const assistant =
    settings.assistantEnabled && isAssistantConfigured() ? buildKnowledge(data) : null;
  const assistantName = assistant?.owner.firstName ?? "";

  return (
    <>
      <JsonLd data={homeGraph(data, settings)} />
      <ScrollProgress />

      <SiteHeader
        settings={settings}
        navItems={data.navItems}
        socialLinks={data.socialLinks}
        contactLinks={data.contactLinks}
        cvUrl={profile.cvUrl}
      />

      <main>
        {show.hero ? (
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

        {show.services ? (
          <Services
            section={sections.services}
            services={data.services}
            index={nextIndex()}
          />
        ) : null}

        {show.skills ? (
          <Skills
            section={sections.skills}
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

      {assistant ? (
        <LazyAssistantWidget
          firstName={assistantName}
          avatarUrl={profile.avatarUrl}
          availability={
            show.hero && profile.availabilityVisible && profile.availabilityLabel
              ? profile.availabilityLabel
              : null
          }
          welcome={settings.assistantWelcome || defaultWelcome(assistantName)}
          questions={resolveQuestions(settings.assistantQuestions, assistantName)}
          links={assistant.links}
          factCount={assistant.facts.length}
          turnLimit={ASSISTANT_LIMITS.turnsPerConversation}
          // The site key is public by design; the secret stays on the server.
          turnstileSiteKey={getTurnstileConfig()?.siteKey ?? null}
        />
      ) : null}
    </>
  );
}
