import { SpotlightCard } from "@/components/ui/spotlight-card";
import type { ExperienceView, SectionView } from "@/lib/queries/public";
import { Reveal } from "./reveal";
import { SectionGlow, SectionRules } from "./section-decor";
import { SectionHeading } from "./section-heading";

type ExperienceProps = {
  section: SectionView;
  experiences: ExperienceView[];
  index: number;
};

export function Experience({ section, experiences, index }: ExperienceProps) {
  return (
    <section
      id="experience"
      className="relative scroll-mt-24 overflow-hidden bg-background py-20 md:py-28"
    >
      <SectionRules />
      <SectionGlow variant="topLeft" />

      <div className="container relative max-w-6xl">
        <SectionHeading section={section} index={index} className="mb-14" />

        {/*
          Two-column timeline: the period is set in mono in its own column on
          desktop, so dates align vertically and scan as a column of their own
          instead of being buried in each card's header.
        */}
        <ol className="relative space-y-0">
          {experiences.map((experience, i) => (
            <Reveal
              as="li"
              key={experience.id}
              id={`experience-${experience.id}`}
              className="group relative grid scroll-mt-28 gap-4 rounded-2xl pb-10 md:grid-cols-[180px_1fr] md:gap-10"
              y={24}
              duration={0.55}
              delay={0.08 * i}
            >
              {/* Meta column */}
              <div className="relative md:pt-1">
                <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-2">
                  <span className="font-mono text-xs text-primary">
                    {experience.period}
                  </span>
                  {experience.employmentType ? (
                    <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {experience.employmentType}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Spine + card */}
              <div className="relative pl-6 md:pl-8">
                <span
                  aria-hidden
                  className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background"
                />
                {/*
                  The connector stops short of the last item, so the timeline
                  ends on the final role rather than trailing into whitespace.
                */}
                {i < experiences.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-[5px] top-6 w-px bg-border"
                  />
                ) : null}

                <SpotlightCard className="p-6">
                  <div className="relative space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold leading-snug tracking-tight">
                        {experience.title}
                      </h3>
                      <p className="text-sm font-medium text-primary">
                        {experience.company}
                      </p>
                    </div>

                    {experience.summary ? (
                      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                        {experience.summary}
                      </p>
                    ) : null}

                    {experience.bullets.length > 0 ? (
                      <ul className="space-y-2.5 border-t border-border pt-4">
                        {experience.bullets.map((bullet, bulletIndex) => (
                          <li
                            key={bulletIndex}
                            className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                          >
                            <span
                              aria-hidden
                              className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/70"
                            />
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </SpotlightCard>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
