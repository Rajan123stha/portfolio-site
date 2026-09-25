import { SpotlightCard } from "@/components/ui/spotlight-card";
import { resolveIcon } from "@/lib/design-tokens";
import type { SectionView, SkillGroupView } from "@/lib/queries/public";
import { Reveal } from "./reveal";
import { SectionGlow, SectionRules } from "./section-decor";
import { SectionHeading } from "./section-heading";

type SkillsProps = {
  section: SectionView;
  groups: SkillGroupView[];
  index: number;
};

/**
 * Skills as a grouped set of chips.
 *
 * The proficiency meters this replaced claimed a precision nobody has —
 * "React 100%, TypeScript 62%" invites the reader to compare numbers that were
 * never measured, and reads as padding to anyone hiring. A named set per
 * category says the same thing honestly and scans faster.
 */
export function Skills({ section, groups, index }: SkillsProps) {
  return (
    <section
      id="skills"
      className="relative scroll-mt-24 overflow-hidden bg-background py-20 md:py-28"
    >
      <SectionRules />
      <SectionGlow variant="bottomLeft" />

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
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-primary">
                        <Icon aria-hidden className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <p className="label-mono text-muted-foreground">
                          {group.label}
                        </p>
                        <h3 className="text-lg font-semibold tracking-tight">
                          {group.title}
                        </h3>
                      </div>
                      <span className="ml-auto shrink-0 rounded-full border border-border px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {group.skills.length}
                      </span>
                    </div>

                    <div aria-hidden className="h-px bg-border" />

                    <ul className="flex flex-wrap gap-2">
                      {group.skills.map((skill, skillIndex) => (
                        <Reveal
                          key={skill.id}
                          as="li"
                          y={8}
                          duration={0.35}
                          delay={skillIndex * 0.035}
                        >
                          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary">
                            <span
                              aria-hidden
                              className="h-1 w-1 rounded-full bg-primary/60"
                            />
                            {skill.name}
                          </span>
                        </Reveal>
                      ))}
                    </ul>
                  </div>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
