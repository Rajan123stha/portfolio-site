"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

import { resolveIcon } from "@/lib/design-tokens";
import type {
  CoreStackView,
  ProfileView,
  SectionView,
} from "@/lib/queries/public";
import { SectionGlow, SectionRules } from "./section-decor";
import { SectionHeading } from "./section-heading";

type AboutProps = {
  section: SectionView;
  profile: ProfileView;
  coreStack: CoreStackView[];
  index: number;
};

export function About({ section, profile, coreStack, index }: AboutProps) {
  return (
    <section
      id="about"
      className="relative scroll-mt-24 overflow-hidden bg-background py-20 md:py-28"
    >
      <SectionRules />
      <SectionGlow variant="topRight" />

      <div className="container relative max-w-6xl">
        <div className="grid gap-16 lg:grid-cols-[1fr_0.9fr] lg:gap-24">
          {/* ── Narrative ── */}
          <div className="space-y-8">
            <SectionHeading section={section} index={index} />

            <div className="space-y-5">
              {profile.aboutParagraphs.map((paragraph, i) => (
                <motion.p
                  key={i}
                  className="text-base leading-relaxed text-muted-foreground text-pretty md:text-[17px]"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.55, delay: 0.15 + i * 0.08 }}
                >
                  {paragraph}
                </motion.p>
              ))}
            </div>

            {profile.location ? (
              <motion.p
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.35 }}
              >
                <MapPin aria-hidden className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-xs text-muted-foreground">
                  {profile.location}
                </span>
              </motion.p>
            ) : null}
          </div>

          {/* ── Core stack ── */}
          {coreStack.length > 0 ? (
            <div className="space-y-5">
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <span className="label-mono text-muted-foreground">
                  {profile.coreStackTitle}
                </span>
                <span aria-hidden className="h-px flex-1 bg-border" />
              </motion.div>

              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {coreStack.map((item, i) => {
                  const Icon = resolveIcon(item.icon);
                  return (
                    <motion.li
                      key={item.id}
                      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-elevated"
                      initial={{ opacity: 0, x: 16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.45, delay: 0.2 + i * 0.07 }}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary transition-colors group-hover:border-primary/40">
                        <Icon aria-hidden className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {item.label}
                      </span>
                      {/* Index doubles as a quiet ordinal for the list. */}
                      <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground/60">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
