"use client";

import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";

import { Field, inputClass, textareaClass } from "@/components/admin/form-field";
import { ImageField } from "@/components/admin/image-field";
import { Panel } from "@/components/admin/page-header";
import { RepeatableList } from "@/components/admin/repeatable-list";
import { SubmitButton } from "@/components/admin/submit-button";
import { useActionForm } from "@/components/admin/use-action-form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createProject, updateProject } from "@/lib/actions/projects";
import type { Project, ProjectCategory } from "@/db/schema";
import { slugify } from "@/lib/validators/common";
import { projectSchema, type ProjectInput } from "@/lib/validators/content";

const BLANK: ProjectInput = {
  title: "",
  slug: "",
  categoryId: null,
  description: "",
  imageUrl: null,
  imagePublicId: null,
  tech: [],
  demoUrl: null,
  codeUrl: null,
  featured: false,
  visible: true,
};

export function ProjectForm({
  project,
  categories,
}: {
  project: Project | null;
  categories: ProjectCategory[];
}) {
  const router = useRouter();
  const isNew = project === null;

  const { form, onSubmit, isPending } = useActionForm({
    schema: projectSchema,
    defaultValues: project
      ? {
          title: project.title,
          slug: project.slug,
          categoryId: project.categoryId,
          description: project.description,
          imageUrl: project.imageUrl,
          imagePublicId: project.imagePublicId,
          tech: project.tech,
          demoUrl: project.demoUrl,
          codeUrl: project.codeUrl,
          featured: project.featured,
          visible: project.visible,
        }
      : BLANK,
    action: (values) =>
      isNew ? createProject(values) : updateProject(project.id, values),
    onSuccess: () => {
      // A new project has no page of its own yet, so return to the list.
      if (isNew) router.push("/admin/projects");
      router.refresh();
    },
  });

  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = form;

  /**
   * Derive the slug from the title, but only while it's untouched. Once a
   * project is published its slug is a stable identifier, so silently rewriting
   * it on every title tweak would be wrong.
   */
  const syncSlug = (title: string) => {
    if (!isNew) return;
    const current = getValues("slug");
    if (!current || current === slugify(watch("title"))) {
      setValue("slug", slugify(title), { shouldValidate: true });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Panel title="Details">
        <Field label="Title" error={errors.title?.message} required>
          {(props) => (
            <input
              {...register("title", {
                onChange: (event) => syncSlug(event.target.value),
              })}
              {...props}
              className={inputClass}
              placeholder="dgMarket – Tender Management Platform"
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Slug"
            hint="Lowercase, hyphen-separated. Must be unique."
            error={errors.slug?.message}
            required
          >
            {(props) => (
              <input
                {...register("slug")}
                {...props}
                className={inputClass}
                placeholder="dgmarket-tender-platform"
              />
            )}
          </Field>

          <Field label="Category" error={errors.categoryId?.message}>
            {(props) => (
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <select
                    {...props}
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value || null)}
                    className={inputClass}
                  >
                    <option value="">Uncategorised</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            )}
          </Field>
        </div>

        <Field
          label="Description"
          hint="The card clamps to three lines, so front-load what matters."
          error={errors.description?.message}
        >
          {(props) => (
            <textarea
              {...register("description")}
              {...props}
              rows={5}
              className={textareaClass}
            />
          )}
        </Field>

        <Controller
          control={control}
          name="tech"
          render={({ field }) => (
            <RepeatableList
              label="Tech badges"
              hint="Shown as pills on the card."
              variant="input"
              placeholder="Next.js"
              addLabel="Add technology"
              values={field.value ?? []}
              onChange={field.onChange}
              error={errors.tech?.message}
            />
          )}
        />
      </Panel>

      <Panel title="Media">
        <Controller
          control={control}
          name="imageUrl"
          render={({ field }) => (
            <ImageField
              label="Cover image"
              hint="Landscape screenshots look best — the card crops to 16:9."
              value={field.value ?? null}
              publicId={watch("imagePublicId") ?? null}
              onChange={({ url, publicId }) => {
                field.onChange(url);
                setValue("imagePublicId", publicId, { shouldDirty: true });
              }}
            />
          )}
        />
      </Panel>

      <Panel title="Links">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Live demo"
            hint="Leave blank to hide the button."
            error={errors.demoUrl?.message}
          >
            {(props) => (
              <input
                {...register("demoUrl")}
                {...props}
                className={inputClass}
                placeholder="https://example.com"
              />
            )}
          </Field>

          <Field
            label="Source code"
            hint="Leave blank to hide the button."
            error={errors.codeUrl?.message}
          >
            {(props) => (
              <input
                {...register("codeUrl")}
                {...props}
                className={inputClass}
                placeholder="https://github.com/…"
              />
            )}
          </Field>
        </div>
      </Panel>

      <Panel title="Visibility">
        <ToggleRow
          control={control}
          name="visible"
          title="Show on the site"
          description="Hidden projects stay here but disappear from the public grid."
        />
        <ToggleRow
          control={control}
          name="featured"
          title="Featured"
          description="Adds a badge to the card."
        />
      </Panel>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <SubmitButton
          isPending={isPending}
          isDirty={isNew ? undefined : isDirty}
          label={isNew ? "Create project" : "Save project"}
        />
      </div>
    </form>
  );
}

function ToggleRow({
  control,
  name,
  title,
  description,
}: {
  control: ReturnType<typeof useActionForm<typeof projectSchema>>["form"]["control"];
  name: "visible" | "featured";
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
            aria-label={title}
          />
        )}
      />
    </div>
  );
}
