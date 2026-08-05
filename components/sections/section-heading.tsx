"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { SectionView } from "@/lib/queries/public";

type SectionHeadingProps = {
  section: SectionView;
  /**
   * Position in the page, rendered as `01`, `02`… A running index is the
   * cheapest way to make a long scroll feel authored rather than assembled.
   */
  index?: number;
  className?: string;
  as?: "h1" | "h2";
  align?: "left" | "center";
};

/**
 * The eyebrow / heading / lede block shared by every section.
 *
 * Previously each section carried its own copy of this markup and four
 * near-identical `motion` configs. Extracting it means the page rhythm is
 * defined once and every heading stays in step.
 */
export function SectionHeading({
  section,
  index,
  className,
  as: Heading = "h2",
  align = "left",
}: SectionHeadingProps) {
  const { eyebrow, heading, headingAccent, subheading } = section;

  if (!eyebrow && !heading && !subheading) return null;

  const centered = align === "center";

  return (
    <div
      className={cn(
        "space-y-5",
        centered && "flex flex-col items-center text-center",
        className,
      )}
    >
      {eyebrow ? (
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4 }}
        >
          {typeof index === "number" ? (
            <span className="label-mono text-primary/60 tabular-nums">
              {String(index).padStart(2, "0")}
            </span>
          ) : null}
          <span aria-hidden className="h-px w-8 bg-border" />
          <span className="label-mono text-primary">{eyebrow}</span>
        </motion.div>
      ) : null}

      {heading ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.06 }}
        >
          <Heading className="text-section font-semibold text-balance">
            {heading}
            {headingAccent ? (
              <>
                {" "}
                {/*
                  The accent phrase is the only coloured text in a heading, so
                  it carries the emphasis on its own without a weight change.
                */}
                <span className="bg-gradient-to-r from-primary to-accent-2 bg-clip-text text-transparent">
                  {headingAccent}
                </span>
              </>
            ) : null}
          </Heading>
        </motion.div>
      ) : null}

      {subheading ? (
        <motion.p
          className={cn(
            "max-w-xl text-base leading-relaxed text-muted-foreground text-pretty",
            centered && "mx-auto",
          )}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.12 }}
        >
          {subheading}
        </motion.p>
      ) : null}
    </div>
  );
}
