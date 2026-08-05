"use client";

import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Save button that reports its own state.
 *
 * Disabled while pending so a double-click can't submit twice, and it keeps its
 * width steady between labels so the surrounding layout doesn't jump.
 */
export function SubmitButton({
  isPending,
  isDirty,
  label = "Save changes",
  pendingLabel = "Saving…",
  className,
  ...props
}: {
  isPending: boolean;
  /** When provided, a pristine form shows "Saved" instead of an active button. */
  isDirty?: boolean;
  label?: string;
  pendingLabel?: string;
} & Omit<React.ComponentProps<typeof Button>, "children">) {
  const settled = isDirty === false && !isPending;

  return (
    <Button
      type="submit"
      disabled={isPending || settled}
      className={cn("min-w-[9rem] gap-2", className)}
      {...props}
    >
      {isPending ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : settled ? (
        <Check aria-hidden className="h-4 w-4" />
      ) : null}
      {isPending ? pendingLabel : settled ? "Saved" : label}
    </Button>
  );
}
