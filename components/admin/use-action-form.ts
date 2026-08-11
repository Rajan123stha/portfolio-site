"use client";

import { useTransition } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";

type UseActionFormOptions<TSchema extends z.ZodTypeAny, TData> = {
  schema: TSchema;
  defaultValues: DefaultValues<z.input<TSchema>>;
  /** The server action to call with validated values. */
  action: (values: z.input<TSchema>) => Promise<ActionResult<TData>>;
  onSuccess?: (data: TData) => void;
  /** Clear the form after a successful save — used by "add" forms. */
  resetOnSuccess?: boolean;
  formOptions?: Omit<
    UseFormProps<z.input<TSchema>>,
    "resolver" | "defaultValues"
  >;
};

type UseActionFormReturn<TSchema extends z.ZodTypeAny> = {
  form: UseFormReturn<z.input<TSchema>>;
  /** Wire straight to `<form onSubmit={...}>`. */
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  isPending: boolean;
};

/**
 * Binds a Zod schema, `react-hook-form` and a server action together.
 *
 * The same schema validates in the browser (instant feedback) and again inside
 * the action (the check that actually counts). When the server rejects a field
 * the client couldn't catch — a duplicate slug, say — the error is mapped back
 * onto that input rather than surfacing as an anonymous toast.
 *
 * Submission runs inside a transition so React keeps the form interactive and
 * `isPending` stays accurate across the action *and* the router refresh it
 * triggers, which a local `useState` flag would miss.
 */
export function useActionForm<TSchema extends z.ZodTypeAny, TData = unknown>({
  schema,
  defaultValues,
  action,
  onSuccess,
  resetOnSuccess = false,
  formOptions,
}: UseActionFormOptions<TSchema, TData>): UseActionFormReturn<TSchema> {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.input<TSchema>>({
    ...formOptions,
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit((values) =>
    // `handleSubmit` returns before the transition settles; that's fine, the
    // UI tracks progress through `isPending` rather than this promise.
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await action(values as z.input<TSchema>);

        if (!result.ok) {
          const entries = Object.entries(result.fieldErrors ?? {});

          for (const [field, messages] of entries) {
            form.setError(field as Path<z.input<TSchema>>, {
              type: "server",
              message: messages[0],
            });
          }

          // Only toast when nothing landed on a field, otherwise the same
          // problem is reported twice.
          if (entries.length === 0) toast.error(result.error);
          resolve();
          return;
        }

        if (result.message) toast.success(result.message);

        /*
         * Rebase the form's baseline onto what was just persisted.
         *
         * `isDirty` is computed against `defaultValues`, which `useForm` keeps
         * from first render — so without this the form stayed "dirty" forever
         * after a save and the button never settled back to "Saved", implying
         * unsaved work that didn't exist. "Add" forms clear instead.
         */
        form.reset(resetOnSuccess ? defaultValues : values);

        onSuccess?.(result.data);
        resolve();
      });
    }),

    /*
     * Client-side validation failures must never be silent.
     *
     * `handleSubmit` simply doesn't invoke the submit handler when the schema
     * rejects, so a field whose error has nowhere to render produces a Save
     * button that looks broken — exactly what happened when image pickers held
     * a `/public` path that the URL validator refused. Inline messages are
     * still the primary channel; this is the backstop that guarantees the user
     * always learns *something* went wrong, and where.
     */
    (fieldErrors) => {
      const problems = collectMessages(fieldErrors);
      if (problems.length === 0) return;

      toast.error(
        problems.length === 1
          ? problems[0]
          : `${problems.length} fields need attention`,
        {
          description:
            problems.length > 1 ? problems.slice(0, 3).join(" · ") : undefined,
        },
      );

      // Bring the first offending control into view; it may be inside a
      // collapsed panel or far up a long form.
      form.setFocus(Object.keys(fieldErrors)[0] as Path<z.input<TSchema>>, {
        shouldSelect: false,
      });
    },
  );

  return { form, onSubmit, isPending };
}

/**
 * Flattens react-hook-form's nested error tree into readable messages.
 *
 * Errors for array fields arrive as sparse arrays of objects (`bullets[2].text`),
 * so a shallow `Object.values` would yield `[object Object]` for exactly the
 * cases most likely to be missing an inline error slot.
 */
function collectMessages(errors: unknown, depth = 0): string[] {
  if (!errors || typeof errors !== "object" || depth > 4) return [];

  const record = errors as Record<string, unknown>;
  const message = record.message;

  if (typeof message === "string" && message.length > 0) return [message];

  return Object.values(record).flatMap((value) =>
    collectMessages(value, depth + 1),
  );
}

/** Narrows `unknown` form values to a record for generic field helpers. */
export type AnyFieldValues = FieldValues;
