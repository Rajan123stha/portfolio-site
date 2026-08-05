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
        if (resetOnSuccess) form.reset(defaultValues);
        onSuccess?.(result.data);
        resolve();
      });
    }),
  );

  return { form, onSubmit, isPending };
}

/** Narrows `unknown` form values to a record for generic field helpers. */
export type AnyFieldValues = FieldValues;
