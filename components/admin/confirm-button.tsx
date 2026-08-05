"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/result";

type ConfirmButtonProps = {
  /** The action to run once confirmed. */
  action: () => Promise<ActionResult>;
  title: string;
  description: string;
  confirmLabel?: string;
  onDone?: () => void;
  children: React.ReactNode;
  /** Rendered as the trigger; defaults to a destructive ghost button. */
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
};

/**
 * Gate for irreversible actions.
 *
 * Deletes in this panel are permanent — there's no trash to restore from — so
 * every one of them goes through an explicit confirmation that names what will
 * be lost. The dialog stays open while the action runs so a slow request can't
 * be mistaken for a no-op and clicked twice.
 */
export function ConfirmButton({
  action,
  title,
  description,
  confirmLabel = "Delete",
  onDone,
  children,
  variant = "ghost",
  size = "icon",
  className,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const result = await action();

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (result.message) toast.success(result.message);
      setOpen(false);
      onDone?.();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant={variant} size={size} className={className}>
          {children}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            // Prevent Radix's default close-on-select: the dialog should stay
            // put until the action actually resolves.
            onClick={(event) => {
              event.preventDefault();
              run();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <Loader2 aria-hidden className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
