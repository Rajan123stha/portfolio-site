"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/result";
import { ConfirmButton } from "./confirm-button";
import { EmptyState } from "./page-header";
import { SortableList } from "./sortable-list";
import { SubmitButton } from "./submit-button";
import { useActionForm } from "./use-action-form";

type Identifiable = { id: string };

type CollectionEditorProps<
  TItem extends Identifiable,
  TSchema extends z.ZodTypeAny,
> = {
  items: TItem[];
  schema: TSchema;
  /** Values for a fresh row. */
  blank: z.input<TSchema>;
  /** Maps an existing row onto form values. */
  toFormValues: (item: TItem) => z.input<TSchema>;

  create: (values: z.input<TSchema>) => Promise<ActionResult<unknown>>;
  update: (id: string, values: z.input<TSchema>) => Promise<ActionResult<unknown>>;
  remove: (id: string) => Promise<ActionResult>;
  reorder?: (input: { ids: string[] }) => Promise<ActionResult>;

  /** The form body. Receives the live `react-hook-form` instance. */
  fields: (
    form: ReturnType<typeof useActionForm<TSchema>>["form"],
  ) => React.ReactNode;
  /** Collapsed summary line for an existing row. */
  summary: (item: TItem) => React.ReactNode;
  deleteDescription: (item: TItem) => string;

  noun: string;
  addLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

/**
 * Inline editor for a small ordered collection.
 *
 * Six of these lists — core stack, skills, highlights, nav, social and contact
 * links — differ only in their fields and labels. Sharing the shell keeps the
 * reorder, delete-confirm and empty states identical everywhere, and means a
 * fix to any of them lands in all six.
 *
 * Rows edit in place rather than on their own page: these are two-to-four field
 * records where a full navigation would cost more than it's worth.
 */
export function CollectionEditor<
  TItem extends Identifiable,
  TSchema extends z.ZodTypeAny,
>({
  items,
  schema,
  blank,
  toFormValues,
  create,
  update,
  remove,
  reorder,
  fields,
  summary,
  deleteDescription,
  noun,
  addLabel,
  emptyTitle,
  emptyDescription,
}: CollectionEditorProps<TItem, TSchema>) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const row = (item: TItem) =>
    editingId === item.id ? (
      <ItemForm
        schema={schema}
        defaultValues={toFormValues(item)}
        action={(values) => update(item.id, values)}
        onDone={() => {
          setEditingId(null);
          refresh();
        }}
        onCancel={() => setEditingId(null)}
        submitLabel="Save"
        fields={fields}
      />
    ) : (
      <div className="flex items-start gap-2">
        {/*
          The summary is a plain container, not a clickable row. Some summaries
          (skills, highlights) render their own nested lists with buttons in
          them, and a <button> inside a <button> is invalid HTML — the browser
          un-nests it and the click targets stop behaving predictably. Editing
          gets its own explicit control instead.
        */}
        <div className="min-w-0 flex-1">{summary(item)}</div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setEditingId(item.id)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Pencil aria-hidden className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>

        <ConfirmButton
          action={() => remove(item.id)}
          title={`Delete this ${noun}?`}
          description={deleteDescription(item)}
          onDone={refresh}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 aria-hidden className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </ConfirmButton>
      </div>
    );

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <EmptyState
          title={emptyTitle ?? `No ${noun}s yet`}
          description={
            emptyDescription ?? `Add your first ${noun} to get started.`
          }
        />
      ) : reorder ? (
        <SortableList items={items} onReorder={reorder}>
          {(item) => row(item)}
        </SortableList>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border bg-card p-3"
            >
              {row(item)}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">New {noun}</p>
          <ItemForm
            schema={schema}
            defaultValues={blank}
            action={create}
            onDone={() => {
              setAdding(false);
              refresh();
            }}
            onCancel={() => setAdding(false)}
            submitLabel={addLabel ?? `Add ${noun}`}
            fields={fields}
          />
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
          className="gap-1.5"
        >
          <Plus aria-hidden className="h-3.5 w-3.5" />
          {addLabel ?? `Add ${noun}`}
        </Button>
      )}
    </div>
  );
}

function ItemForm<TSchema extends z.ZodTypeAny>({
  schema,
  defaultValues,
  action,
  onDone,
  onCancel,
  submitLabel,
  fields,
}: {
  schema: TSchema;
  defaultValues: z.input<TSchema>;
  action: (values: z.input<TSchema>) => Promise<ActionResult<unknown>>;
  onDone: () => void;
  onCancel: () => void;
  submitLabel: string;
  fields: (
    form: ReturnType<typeof useActionForm<TSchema>>["form"],
  ) => React.ReactNode;
}) {
  const { form, onSubmit, isPending } = useActionForm({
    schema,
    defaultValues: defaultValues as never,
    action,
    onSuccess: onDone,
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {fields(form)}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <SubmitButton isPending={isPending} label={submitLabel} size="sm" />
      </div>
    </form>
  );
}
