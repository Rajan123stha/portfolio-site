import { Sparkles } from "lucide-react";

import { SpotlightCard } from "@/components/ui/spotlight-card";
import { resolveIcon } from "@/lib/design-tokens";
import type { HighlightGroupView, SectionView } from "@/lib/queries/public";
import { Reveal } from "./reveal";
import { SectionGlow, SectionRules } from "./section-decor";
import { SectionHeading } from "./section-heading";

type ValueProps = {
  section: SectionView;
  groups: HighlightGroupView[];
  index: number;
};

export function Value({ section, groups, index }: ValueProps) {
  return (
    <section
      id="whyMe"
      className="relative scroll-mt-24 overflow-hidden bg-background py-20 md:py-28"
    >
      <SectionRules />
      <SectionGlow variant="bottomRight" />

      <div className="container relative max-w-6xl">
        <SectionHeading section={section} index={index} className="mb-14" />

        <div className="grid gap-5 md:grid-cols-2">
          {groups.map((group, groupIndex) => {
            const Icon = resolveIcon(group.icon);

            return (
              <Reveal
                key={group.id}
                y={24}
                duration={0.55}
                delay={0.1 * groupIndex}
                margin={60}
              >
                <SpotlightCard className="h-full p-7">
                  <div className="relative flex h-full flex-col gap-6">
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-primary">
                        <Icon aria-hidden className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="label-mono text-muted-foreground">
                          {group.label}
                        </p>
                        <h3 className="text-lg font-semibold tracking-tight">
                          {group.title}
                        </h3>
                      </div>
                    </div>

                    <div aria-hidden className="h-px bg-border" />

                    <ul className="flex-1 space-y-4">
                      {group.highlights.map((highlight, highlightIndex) => {
                        const ItemIcon = resolveIcon(highlight.icon);
                        return (
                          <Reveal
                            key={highlight.id}
                            as="li"
                            x={-8}
                            y={0}
                            duration={0.4}
                            delay={highlightIndex * 0.07}
                            className="flex items-start gap-3"
                          >
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <ItemIcon aria-hidden className="h-3 w-3" />
                            </span>
                            <span className="text-sm leading-relaxed text-muted-foreground text-pretty">
                              {highlight.text}
                            </span>
                          </Reveal>
                        );
                      })}
                    </ul>
                  </div>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>

        {/*
          The footnote was previously tucked inside the last card, where it read
          as belonging to that card's list. Given full width it works as the
          section's closing statement, which is what the copy actually is.
        */}
        {section.note ? (
          <Reveal
            as="p"
            className="mt-5 flex items-center justify-center gap-2.5 rounded-2xl border border-primary/20 bg-primary/[0.05] px-6 py-4 text-center text-sm font-medium text-primary"
            y={12}
            duration={0.45}
            delay={0.2}
          >
            <Sparkles aria-hidden className="h-4 w-4 shrink-0" />
            {section.note}
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
