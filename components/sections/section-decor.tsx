import { cn } from "@/lib/utils";

/**
 * Ambient background treatment shared by every section.
 *
 * All of it is `aria-hidden` and `pointer-events-none` — decoration only, never
 * announced and never clickable.
 */

/** Hairline that fades out at both ends, separating stacked sections. */
export function SectionRules({
  top = true,
  bottom = false,
}: {
  top?: boolean;
  bottom?: boolean;
}) {
  return (
    <>
      {top ? (
        <div
          aria-hidden
          className="rule-fade pointer-events-none absolute inset-x-0 top-0"
        />
      ) : null}
      {bottom ? (
        <div
          aria-hidden
          className="rule-fade pointer-events-none absolute inset-x-0 bottom-0"
        />
      ) : null}
    </>
  );
}

/**
 * Placement variants are literal class strings rather than composed at runtime,
 * so Tailwind's compiler can see every one of them.
 */
const GLOW_VARIANTS = {
  topRight: "-top-40 -right-32 h-[520px] w-[520px]",
  topLeft: "-top-40 -left-32 h-[480px] w-[480px]",
  bottomRight: "-bottom-40 -right-24 h-[440px] w-[440px]",
  bottomLeft: "-bottom-40 -left-24 h-[440px] w-[440px]",
} as const;

export function SectionGlow({
  variant,
  className,
}: {
  variant: keyof typeof GLOW_VARIANTS;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute rounded-full bg-primary/[0.07] blur-[120px]",
        GLOW_VARIANTS[variant],
        className,
      )}
    />
  );
}

/**
 * Vertical rules marking the content column, like a printed grid left visible.
 * Desktop only — at narrow widths they'd sit on top of the text.
 */
export function ColumnRules() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 mx-auto hidden max-w-6xl lg:block"
    >
      <div className="absolute inset-y-0 left-6 w-px bg-border/40" />
      <div className="absolute inset-y-0 right-6 w-px bg-border/40" />
    </div>
  );
}
