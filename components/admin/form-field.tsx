"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  /** Guidance shown under the label, before the user gets it wrong. */
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
};

/**
 * One labelled control.
 *
 * The child is a render prop rather than plain children so the generated id and
 * the ARIA wiring reach the input itself. Cloning children to inject props
 * would work until someone wraps their input in a `<div>` and the label
 * silently stops pointing anywhere.
 */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-sm font-medium text-foreground"
      >
        {label}
        {required ? (
          <span aria-hidden className="text-destructive">
            *
          </span>
        ) : null}
      </label>

      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby":
          [hintId, errorId].filter(Boolean).join(" ") || undefined,
      })}

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Shared input styling, so every control in the admin looks like one system. */
export const controlClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive";

export const inputClass = cn(controlClass, "h-10");

export const textareaClass = cn(controlClass, "min-h-[96px] resize-y leading-relaxed");
