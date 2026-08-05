"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { CollectionEditor } from "@/components/admin/collection-editor";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Field, inputClass } from "@/components/admin/form-field";
import { IconPicker } from "@/components/admin/icon-picker";
import { EmptyState, Panel } from "@/components/admin/page-header";
import { SortableList } from "@/components/admin/sortable-list";
import { SubmitButton } from "@/components/admin/submit-button";
import { useActionForm } from "@/components/admin/use-action-form";
import { Button } from "@/components/ui/button";
import {
  createHighlight,
  createHighlightGroup,
  deleteHighlight,
  deleteHighlightGroup,
  reorderHighlightGroups,
  reorderHighlights,
  updateHighlight,
  updateHighlightGroup,
} from "@/lib/actions/content";
import type { Highlight, HighlightGroup } from "@/db/schema";
import { resolveIcon } from "@/lib/design-tokens";
import { highlightGroupSchema, highlightSchema } from "@/lib/validators/content";

type GroupWithItems = HighlightGroup & { highlights: Highlight[] };

export function HighlightManager({ groups }: { groups: GroupWithItems[] }) {
  return (
    <Panel
      title="Highlight cards"
      description="Each card gets a header and a list of points. The section's note renders as a badge on the last card."
    >
      <CollectionEditor
        items={groups}
        schema={highlightGroupSchema}
        noun="card"
        blank={{ slug: "", icon: "Rocket", label: "", title: "" }}
        toFormValues={(group) => ({
          slug: group.slug,
          icon: group.icon,
          label: group.label,
          title: group.title,
        })}
        create={createHighlightGroup}
        update={updateHighlightGroup}
        remove={deleteHighlightGroup}
        reorder={reorderHighlightGroups}
        emptyTitle="No cards yet"
        emptyDescription="Add a card — “Why Hire Me”, for instance — then list your points."
        deleteDescription={(group) =>
          `“${group.title}” and its ${group.highlights.length} point${group.highlights.length === 1 ? "" : "s"} will be deleted.`
        }
        summary={(group) => <GroupSummary group={group} />}
        fields={({ register, control, formState: { errors } }) => (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[8rem_1fr_1fr]">
              <Field label="Icon" error={errors.icon?.message}>
                {(props) => (
                  <Controller
                    control={control}
                    name="icon"
                    render={({ field }) => (
                      <IconPicker
                        value={field.value}
                        onChange={field.onChange}
                        {...props}
                      />
                    )}
                  />
                )}
              </Field>

              <Field label="Kicker" error={errors.label?.message} required>
                {(props) => (
                  <input
                    {...register("label")}
                    {...props}
                    className={inputClass}
                    placeholder="What I Bring"
                  />
                )}
              </Field>

              <Field label="Title" error={errors.title?.message} required>
                {(props) => (
                  <input
                    {...register("title")}
                    {...props}
                    className={inputClass}
                    placeholder="Why Hire Me"
                  />
                )}
              </Field>
            </div>

            <Field
              label="Slug"
              hint="Internal identifier. Lowercase, hyphenated."
              error={errors.slug?.message}
              required
            >
              {(props) => (
                <input
                  {...register("slug")}
                  {...props}
                  className={inputClass}
                  placeholder="strengths"
                />
              )}
            </Field>
          </div>
        )}
      />
    </Panel>
  );
}

function GroupSummary({ group }: { group: GroupWithItems }) {
  const Icon = resolveIcon(group.icon);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon aria-hidden className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">
            {group.title}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {group.label} · {group.highlights.length} point
            {group.highlights.length === 1 ? "" : "s"}
          </span>
        </span>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <HighlightList group={group} />
      </div>
    </div>
  );
}

function HighlightList({ group }: { group: GroupWithItems }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {group.highlights.length === 0 ? (
        <EmptyState
          title="No points in this card"
          description="Add the first one below."
        />
      ) : (
        <SortableList items={group.highlights} onReorder={reorderHighlights}>
          {(highlight) =>
            editingId === highlight.id ? (
              <HighlightForm
                defaultValues={{
                  groupId: group.id,
                  icon: highlight.icon,
                  text: highlight.text,
                }}
                submitLabel="Save"
                action={(values) => updateHighlight(highlight.id, values)}
                onDone={() => {
                  setEditingId(null);
                  router.refresh();
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <HighlightRow
                highlight={highlight}
                onEdit={() => setEditingId(highlight.id)}
                onChanged={() => router.refresh()}
              />
            )
          }
        </SortableList>
      )}

      {adding ? (
        <HighlightForm
          defaultValues={{ groupId: group.id, icon: "CheckCircle2", text: "" }}
          submitLabel="Add point"
          action={createHighlight}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAdding(true)}
          className="gap-1.5 text-xs"
        >
          <Plus aria-hidden className="h-3 w-3" />
          Add point
        </Button>
      )}
    </div>
  );
}

function HighlightRow({
  highlight,
  onEdit,
  onChanged,
}: {
  highlight: Highlight;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const Icon = resolveIcon(highlight.icon);

  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-start gap-2 text-left"
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
          <Icon aria-hidden className="h-3 w-3" />
        </span>
        <span className="text-sm leading-snug text-foreground">
          {highlight.text}
        </span>
      </button>

      <ConfirmButton
        action={() => deleteHighlight(highlight.id)}
        title="Delete this point?"
        description={`“${highlight.text}” will be removed from the card.`}
        onDone={onChanged}
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 aria-hidden className="h-3.5 w-3.5" />
        <span className="sr-only">Delete point</span>
      </ConfirmButton>
    </div>
  );
}

function HighlightForm({
  defaultValues,
  submitLabel,
  action,
  onDone,
  onCancel,
}: {
  defaultValues: { groupId: string; icon: string; text: string };
  submitLabel: string;
  action: (values: {
    groupId: string;
    icon: string;
    text: string;
  }) => Promise<import("@/lib/actions/result").ActionResult<unknown>>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { form, onSubmit, isPending } = useActionForm({
    schema: highlightSchema,
    defaultValues: defaultValues as never,
    action,
    onSuccess: onDone,
  });

  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={onSubmit} className="space-y-2" noValidate>
      <input type="hidden" {...register("groupId")} />

      <div className="flex flex-wrap gap-2">
        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <div className="w-32 shrink-0">
              <IconPicker value={field.value} onChange={field.onChange} />
            </div>
          )}
        />

        <input
          {...register("text")}
          aria-label="Point"
          aria-invalid={Boolean(errors.text)}
          placeholder="Strong foundation in React…"
          className={`${inputClass} min-w-[10rem] flex-1`}
        />
      </div>

      {errors.text?.message ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {errors.text.message}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <SubmitButton isPending={isPending} label={submitLabel} size="sm" />
      </div>
    </form>
  );
}
