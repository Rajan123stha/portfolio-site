"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

import { SpotlightCard } from "@/components/ui/spotlight-card";
import { resolveIcon } from "@/lib/design-tokens";
import type { SectionView, ServiceView } from "@/lib/queries/public";
import { cn } from "@/lib/utils";
import { SectionGlow, SectionRules } from "./section-decor";
import { SectionHeading } from "./section-heading";

type ServicesProps = {
  section: SectionView;
  services: ServiceView[];
  index: number;
};

const list = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35 } },
};

/**
 * What a client can actually buy.
 *
 * The rest of the page answers "who is this person" — this answers "what would
 * I be paying for", which is the question anyone arriving with a budget has.
 * Each card leads with the outcome, then names the concrete deliverables, so
 * the offer is legible without a call.
 */
export function Services({ section, services, index }: ServicesProps) {
  return (
    <section
      id="services"
      className="relative scroll-mt-24 overflow-hidden bg-background py-20 md:py-28"
    >
      <SectionRules />
      <SectionGlow variant="topLeft" />

      <div className="container relative max-w-6xl">
        <SectionHeading section={section} index={index} className="mb-14" />

        <div className="grid gap-5 sm:grid-cols-2">
          {services.map((service, serviceIndex) => {
            const Icon = resolveIcon(service.icon);

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: 0.07 * serviceIndex }}
              >
                <SpotlightCard
                  className={cn(
                    "h-full",
                    // The featured offer gets a warmer edge rather than a
                    // bigger card — resizing one tile would break the grid.
                    service.featured && "border-primary/30",
                  )}
                >
                  <div className="relative flex h-full flex-col gap-5 p-7">
                    <div className="flex items-start gap-4">
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
                          service.featured
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border bg-background text-primary",
                        )}
                      >
                        <Icon aria-hidden className="h-[18px] w-[18px]" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold leading-snug tracking-tight text-balance">
                          {service.title}
                        </h3>
                        {service.note ? (
                          <p className="mt-1 inline-flex items-center rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {service.note}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {service.summary ? (
                      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                        {service.summary}
                      </p>
                    ) : null}

                    {service.deliverables.length > 0 ? (
                      <motion.ul
                        className="mt-auto space-y-2.5 border-t border-border pt-5"
                        variants={list}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                      >
                        {service.deliverables.map((deliverable) => (
                          <motion.li
                            key={deliverable}
                            variants={item}
                            className="flex items-start gap-2.5"
                          >
                            <span
                              aria-hidden
                              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                            >
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            </span>
                            <span className="text-[13px] leading-relaxed text-muted-foreground">
                              {deliverable}
                            </span>
                          </motion.li>
                        ))}
                      </motion.ul>
                    ) : null}
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>

        {/* One shared call to action — a button per card would compete with
            itself and give the reader four identical decisions to make. */}
        <motion.div
          className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-7 text-center sm:flex-row sm:justify-between sm:text-left"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.15 }}
        >
          <div>
            <p className="text-base font-semibold tracking-tight">
              Not sure which one you need?
            </p>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              Tell me what you are trying to build and I will tell you what it
              takes.
            </p>
          </div>

          <Link
            href="#contact"
            className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start a conversation
            <ArrowUpRight
              aria-hidden
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
