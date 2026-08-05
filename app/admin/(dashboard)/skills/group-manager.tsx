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
  createSkill,
  createSkillGroup,
  deleteSkill,
  deleteSkillGroup,
  reorderSkillGroups,
  reorderSkills,
  updateSkill,
  updateSkillGroup,
} from "@/lib/actions/content";
import type { Skill, SkillGroup, SkillLevel } from "@/db/schema";
import { resolveColor, resolveIcon } from "@/lib/design-tokens";
import { skillGroupSchema, skillSchema } from "@/lib/validators/content";

type GroupWithSkills = SkillGroup & {
  skills: (Skill & { level: SkillLevel })[];
};

export function GroupManager({
  groups,
  levels,
}: {
  groups: GroupWithSkills[];
  levels: SkillLevel[];
}) {
  return (
    <Panel
      title="Skill groups"
      description="Each group renders as one card. Drag groups or the skills inside them to reorder."
    >
      <CollectionEditor
        items={groups}
        schema={skillGroupSchema}
        noun="group"
        blank={{ icon: "Code2", label: "", title: "", visible: true }}
        toFormValues={(group) => ({
          icon: group.icon,
          label: group.label,
          title: group.title,
          visible: group.visible,
        })}
        create={createSkillGroup}
        update={updateSkillGroup}
        remove={deleteSkillGroup}
        reorder={reorderSkillGroups}
        emptyTitle="No skill groups yet"
        emptyDescription="Add a group — “Dev Stack”, say — then fill it with skills."
        deleteDescription={(group) =>
          `“${group.title}” and its ${group.skills.length} skill${group.skills.length === 1 ? "" : "s"} will be deleted.`
        }
        summary={(group) => <GroupSummary group={group} levels={levels} />}
        fields={({ register, control, formState: { errors } }) => (
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
                  placeholder="Programming"
                />
              )}
            </Field>

            <Field label="Title" error={errors.title?.message} required>
              {(props) => (
                <input
                  {...register("title")}
                  {...props}
                  className={inputClass}
                  placeholder="Dev Stack"
                />
              )}
            </Field>
          </div>
        )}
      />
    </Panel>
  );
}

/**
 * The collapsed row for a group doubles as the entry point to its skills, so
 * the whole card is manageable without leaving the page.
 */
function GroupSummary({
  group,
  levels,
}: {
  group: GroupWithSkills;
  levels: SkillLevel[];
}) {
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
            {group.label} · {group.skills.length} skill
            {group.skills.length === 1 ? "" : "s"}
          </span>
        </span>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <SkillList group={group} levels={levels} />
      </div>
    </div>
  );
}

function SkillList({
  group,
  levels,
}: {
  group: GroupWithSkills;
  levels: SkillLevel[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const defaultLevelId = levels[0]?.id ?? "";

  if (levels.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Add a proficiency tier above before adding skills.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {group.skills.length === 0 ? (
        <EmptyState
          title="No skills in this group"
          description="Add the first one below."
        />
      ) : (
        <SortableList items={group.skills} onReorder={reorderSkills}>
          {(skill) =>
            editingId === skill.id ? (
              <SkillForm
                levels={levels}
                defaultValues={{
                  groupId: group.id,
                  levelId: skill.levelId,
                  name: skill.name,
                }}
                submitLabel="Save"
                action={(values) => updateSkill(skill.id, values)}
                onDone={() => {
                  setEditingId(null);
                  router.refresh();
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(skill.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span
                    aria-hidden
                    className={`h-2 w-2 shrink-0 rounded-full ${resolveColor(skill.level.color)}`}
                  />
                  <span className="truncate text-sm text-foreground">
                    {skill.name}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {skill.level.label}
                  </span>
                </button>

                <ConfirmButton
                  action={() => deleteSkill(skill.id)}
                  title="Delete this skill?"
                  description={`“${skill.name}” will be removed from ${group.title}.`}
                  onDone={() => router.refresh()}
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 aria-hidden className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete {skill.name}</span>
                </ConfirmButton>
              </div>
            )
          }
        </SortableList>
      )}

      {adding ? (
        <SkillForm
          levels={levels}
          defaultValues={{
            groupId: group.id,
            levelId: defaultLevelId,
            name: "",
          }}
          submitLabel="Add skill"
          action={createSkill}
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
          Add skill
        </Button>
      )}
    </div>
  );
}

function SkillForm({
  levels,
  defaultValues,
  submitLabel,
  action,
  onDone,
  onCancel,
}: {
  levels: SkillLevel[];
  defaultValues: { groupId: string; levelId: string; name: string };
  submitLabel: string;
  action: (values: {
    groupId: string;
    levelId: string;
    name: string;
  }) => Promise<import("@/lib/actions/result").ActionResult<unknown>>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { form, onSubmit, isPending } = useActionForm({
    schema: skillSchema,
    defaultValues,
    action,
    onSuccess: onDone,
  });

  const {
    register,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={onSubmit} className="space-y-2" noValidate>
      <input type="hidden" {...register("groupId")} />

      <div className="flex flex-wrap gap-2">
        <input
          {...register("name")}
          aria-label="Skill name"
          aria-invalid={Boolean(errors.name)}
          placeholder="React"
          className={`${inputClass} min-w-[8rem] flex-1`}
        />

        <select
          {...register("levelId")}
          aria-label="Proficiency"
          className={`${inputClass} w-auto`}
        >
          {levels.map((level) => (
            <option key={level.id} value={level.id}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

      {errors.name?.message ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {errors.name.message}
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
