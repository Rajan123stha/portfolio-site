"use client";

import { Controller } from "react-hook-form";

import { CollectionEditor } from "@/components/admin/collection-editor";
import { ColorPicker } from "@/components/admin/color-picker";
import { Field, inputClass } from "@/components/admin/form-field";
import {
  createSkillLevel,
  deleteSkillLevel,
  reorderSkillLevels,
  updateSkillLevel,
} from "@/lib/actions/content";
import type { SkillLevel } from "@/db/schema";
import { resolveColor } from "@/lib/design-tokens";
import { skillLevelSchema } from "@/lib/validators/content";

export function LevelEditor({ levels }: { levels: SkillLevel[] }) {
  return (
    <CollectionEditor
      items={levels}
      schema={skillLevelSchema}
      noun="tier"
      blank={{ label: "", percent: 50, color: "primary" }}
      toFormValues={(level) => ({
        label: level.label,
        percent: level.percent,
        color: level.color,
      })}
      create={createSkillLevel}
      update={updateSkillLevel}
      remove={deleteSkillLevel}
      reorder={reorderSkillLevels}
      emptyTitle="No tiers yet"
      emptyDescription="Skills need at least one tier before they can be rated."
      deleteDescription={(level) =>
        `“${level.label}” can only be deleted once no skill uses it. Reassign those skills first.`
      }
      summary={(level) => (
        <span className="flex items-center gap-3">
          <span
            aria-hidden
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${resolveColor(level.color)}`}
          />
          <span className="text-sm font-medium text-foreground">
            {level.label}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {level.percent}%
          </span>
        </span>
      )}
      fields={({ register, control, formState: { errors } }) => (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <Field label="Name" error={errors.label?.message} required>
              {(props) => (
                <input
                  {...register("label")}
                  {...props}
                  className={inputClass}
                  placeholder="Advanced"
                />
              )}
            </Field>

            <Field label="Bar fill %" error={errors.percent?.message} required>
              {(props) => (
                <input
                  {...register("percent")}
                  {...props}
                  type="number"
                  min={0}
                  max={100}
                  className={inputClass}
                />
              )}
            </Field>
          </div>

          <Field label="Colour" error={errors.color?.message}>
            {() => (
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <ColorPicker value={field.value} onChange={field.onChange} />
                )}
              />
            )}
          </Field>
        </div>
      )}
    />
  );
}
