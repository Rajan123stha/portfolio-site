"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";
import { Building2, ChevronDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { Field, inputClass, textareaClass } from "@/components/admin/form-field";
import { EmptyState } from "@/components/admin/page-header";
import { RepeatableList } from "@/components/admin/repeatable-list";
import { SortableList } from "@/components/admin/sortable-list";
import { SubmitButton } from "@/components/admin/submit-button";
import { useActionForm } from "@/components/admin/use-action-form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  createExperience,
  deleteExperience,
  reorderExperiences,
  setExperienceVisible,
  updateExperience,
} from "@/lib/actions/content";
import type { Experience } from "@/db/schema";
import { experienceSchema, type ExperienceInput } from "@/lib/validators/content";
import { cn } from "@/lib/utils";

const BLANK: ExperienceInput = {
  title: "",
  company: "",
  period: "",
  employmentType: "",
  summary: "",
  bullets: [],
  visible: true,
};

export function ExperienceManager({
  experiences,
}: {
  experiences: Experience[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      {experiences.length === 0 ? (
        <EmptyState
          title="No roles yet"
          description="Add your first role and it'll appear on the timeline straight away."
        />
      ) : (
        <SortableList items={experiences} onReorder={reorderExperiences}>
          {(experience) => (
            <ExperienceRow
              experience={experience}
              onChanged={() => router.refresh()}
            />
          )}
        </SortableList>
      )}

      {adding ? (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">New role</h2>
          <ExperienceForm
            defaultValues={BLANK}
            submitLabel="Add role"
            action={createExperience}
            onDone={() => {
              setAdding(false);
              router.refresh();
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setAdding(true)}
          className="gap-1.5"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Add role
        </Button>
      )}
    </div>
  );
}

function ExperienceRow({
  experience,
  onChanged,
}: {
  experience: Experience;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(experience.visible);
  const [, startToggle] = useTransition();

  const onToggle = (next: boolean) => {
    setVisible(next);
    startToggle(async () => {
      const result = await setExperienceVisible(experience.id, next);
      if (!result.ok) {
        setVisible(!next);
        toast.error(result.error);
        return;
      }
      onChanged();
    });
  };

  return (
    <div className={cn(!visible && "opacity-60")}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <ChevronDown
            aria-hidden
            className={cn(
              "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">
              {experience.title || "Untitled role"}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 aria-hidden className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {experience.company} · {experience.period}
              </span>
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <Switch
            checked={visible}
            onCheckedChange={onToggle}
            aria-label={`${visible ? "Hide" : "Show"} ${experience.title}`}
          />
          <ConfirmButton
            action={() => deleteExperience(experience.id)}
            title="Delete this role?"
            description={`“${experience.title}” at ${experience.company} will be removed from your timeline. This can't be undone.`}
            onDone={onChanged}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
            <span className="sr-only">Delete {experience.title}</span>
          </ConfirmButton>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 border-t border-border pt-4">
          <ExperienceForm
            defaultValues={{
              title: experience.title,
              company: experience.company,
              period: experience.period,
              employmentType: experience.employmentType,
              summary: experience.summary,
              bullets: experience.bullets,
              visible: experience.visible,
            }}
            submitLabel="Save role"
            action={(values) => updateExperience(experience.id, values)}
            onDone={onChanged}
          />
        </div>
      ) : null}
    </div>
  );
}

function ExperienceForm({
  defaultValues,
  submitLabel,
  action,
  onDone,
  onCancel,
}: {
  defaultValues: ExperienceInput;
  submitLabel: string;
  action: (values: ExperienceInput) => Promise<
    import("@/lib/actions/result").ActionResult<unknown>
  >;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { form, onSubmit, isPending } = useActionForm({
    schema: experienceSchema,
    defaultValues,
    action,
    onSuccess: onDone,
    resetOnSuccess: Boolean(onCancel),
  });

  const {
    register,
    control,
    formState: { errors, isDirty },
  } = form;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Job title" error={errors.title?.message} required>
          {(props) => (
            <input
              {...register("title")}
              {...props}
              className={inputClass}
              placeholder="Frontend Developer"
            />
          )}
        </Field>

        <Field label="Company" error={errors.company?.message} required>
          {(props) => (
            <input
              {...register("company")}
              {...props}
              className={inputClass}
              placeholder="dgMarket"
            />
          )}
        </Field>

        <Field
          label="Period"
          hint="Free text, so open-ended roles read naturally."
          error={errors.period?.message}
          required
        >
          {(props) => (
            <input
              {...register("period")}
              {...props}
              className={inputClass}
              placeholder="June 2025 — Present"
            />
          )}
        </Field>

        <Field label="Employment type" error={errors.employmentType?.message}>
          {(props) => (
            <input
              {...register("employmentType")}
              {...props}
              className={inputClass}
              placeholder="Full-time"
            />
          )}
        </Field>
      </div>

      <Field label="Summary" error={errors.summary?.message}>
        {(props) => (
          <textarea
            {...register("summary")}
            {...props}
            rows={3}
            className={textareaClass}
            placeholder="What the role involved, in a sentence or two."
          />
        )}
      </Field>

      <Controller
        control={control}
        name="bullets"
        render={({ field }) => (
          <RepeatableList
            label="Achievements"
            hint="Lead with the outcome. One bullet per line item."
            values={field.value ?? []}
            onChange={field.onChange}
            addLabel="Add achievement"
            error={errors.bullets?.message}
          />
        )}
      />

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <SubmitButton
          isPending={isPending}
          isDirty={onCancel ? undefined : isDirty}
          label={submitLabel}
        />
      </div>
    </form>
  );
}
