"use client";

import { CollectionEditor } from "@/components/admin/collection-editor";
import { Field, inputClass } from "@/components/admin/form-field";
import {
  createProjectCategory,
  deleteProjectCategory,
  reorderProjectCategories,
  updateProjectCategory,
} from "@/lib/actions/projects";
import type { ProjectCategory } from "@/db/schema";
import { projectCategorySchema } from "@/lib/validators/content";

export function CategoryEditor({
  categories,
}: {
  categories: ProjectCategory[];
}) {
  return (
    <CollectionEditor
      items={categories}
      schema={projectCategorySchema}
      noun="category"
      blank={{ slug: "", label: "" }}
      toFormValues={(category) => ({
        slug: category.slug,
        label: category.label,
      })}
      create={createProjectCategory}
      update={updateProjectCategory}
      remove={deleteProjectCategory}
      reorder={reorderProjectCategories}
      emptyTitle="No categories yet"
      emptyDescription="Without categories every project shows under a single All tab."
      deleteDescription={(category) =>
        `The “${category.label}” tab will disappear. Its projects stay, but become uncategorised.`
      }
      summary={(category) => (
        <>
          <span className="block text-sm font-medium text-foreground">
            {category.label}
          </span>
          <span className="block font-mono text-xs text-muted-foreground">
            {category.slug}
          </span>
        </>
      )}
      fields={({ register, formState: { errors } }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Label" error={errors.label?.message} required>
            {(props) => (
              <input
                {...register("label")}
                {...props}
                className={inputClass}
                placeholder="Full Stack"
              />
            )}
          </Field>

          <Field
            label="Slug"
            hint="Lowercase, hyphenated."
            error={errors.slug?.message}
            required
          >
            {(props) => (
              <input
                {...register("slug")}
                {...props}
                className={inputClass}
                placeholder="fullstack"
              />
            )}
          </Field>
        </div>
      )}
    />
  );
}
