"use client";

import { motion } from "framer-motion";

import { SpotlightCard } from "@/components/ui/spotlight-card";
import { resolveColor, resolveIcon } from "@/lib/design-tokens";
import type {
  SectionView,
  SkillGroupView,
  SkillLevelView,
} from "@/lib/queries/public";
import { SectionGlow, SectionRules } from "./section-decor";
import { SectionHeading } from "./section-heading";

type SkillsProps = {
  section: SectionView;
  levels: SkillLevelView[];
  groups: SkillGroupView[];
  index: number;
};

const list = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const row = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function Skills({ section, levels, groups, index }: SkillsProps) {
  return (
    <section
      id="skills"
      className="relative scroll-mt-24 overflow-hidden bg-background py-20 md:py-28"
    >
      <SectionRules />
      <SectionGlow variant="bottomLeft" />

      <div className="container relative max-w-6xl">
        <div className="mb-14 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading section={section} index={index} />

          {/* Legend sits beside the heading rather than above the grid, so the
              key is read before the thing it explains. */}
          {levels.length > 0 ? (
            <motion.ul
              className="flex flex-wrap items-center gap-x-5 gap-y-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {levels.map((level) => (
                <li key={level.id} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-full ${resolveColor(level.color)}`}
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {level.label}
                  </span>
                </li>
              ))}
            </motion.ul>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {groups.map((group, groupIndex) => {
            const Icon = resolveIcon(group.icon);

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: 0.1 * groupIndex }}
              >
                <SpotlightCard className="h-full p-7">
                  <div className="relative space-y-6">
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
                      <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground/60">
                        {String(group.skills.length).padStart(2, "0")}
                      </span>
                    </div>

                    <div aria-hidden className="h-px bg-border" />

                    <motion.ul
                      className="space-y-4"
                      variants={list}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                    >
                      {group.skills.map((skill) => (
                        <motion.li key={skill.id} variants={row} className="space-y-2">
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="text-sm font-medium text-foreground">
                              {skill.name}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {skill.level.label}
                            </span>
                          </div>
                          {/*
                            Decorative: the proficiency is already stated in
                            text beside it, so a progressbar role would only
                            make screen readers repeat themselves.
                          */}
                          {/*
                            The track needs its own contrast. `bg-muted` is
                            near-white in light mode, so on a white card the
                            unfilled portion vanished and the bar read as a
                            stray underline rather than a meter.
                          */}
                          <div
                            aria-hidden
                            className="h-1 w-full overflow-hidden rounded-full bg-foreground/[0.09]"
                          >
                            <motion.div
                              className={`h-full rounded-full ${resolveColor(skill.level.color)}`}
                              initial={{ width: 0 }}
                              whileInView={{ width: `${skill.level.percent}%` }}
                              viewport={{ once: true }}
                              transition={{
                                duration: 0.9,
                                ease: [0.16, 1, 0.3, 1],
                                delay: 0.15,
                              }}
                            />
                          </div>
                        </motion.li>
                      ))}
                    </motion.ul>
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
