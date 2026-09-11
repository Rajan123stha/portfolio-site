"use client";

import { Controller } from "react-hook-form";
import { Star } from "lucide-react";

import { CollectionEditor } from "@/components/admin/collection-editor";
import { Field, inputClass, textareaClass } from "@/components/admin/form-field";
import { IconPicker } from "@/components/admin/icon-picker";
import { RepeatableList } from "@/components/admin/repeatable-list";
import { Switch } from "@/components/ui/switch";
import {
  createService,
  deleteService,
  reorderServices,
  updateService,
} from "@/lib/actions/content";
import type { Service } from "@/db/schema";
import { resolveIcon } from "@/lib/design-tokens";
import { serviceSchema } from "@/lib/validators/content";

export function ServiceManager({ services }: { services: Service[] }) {
  return (
    <CollectionEditor
      items={services}
      schema={serviceSchema}
      noun="service"
      blank={{
        icon: "Monitor",
        title: "",
        summary: "",
        deliverables: [],
        note: "",
        featured: false,
        visible: true,
      }}
      toFormValues={(service) => ({
        icon: service.icon,
        title: service.title,
        summary: service.summary,
        deliverables: service.deliverables,
        note: service.note ?? "",
        featured: service.featured,
        visible: service.visible,
      })}
      create={createService}
      update={updateService}
      remove={deleteService}
      reorder={reorderServices}
      emptyTitle="No services yet"
      emptyDescription="Add what you take on — a website build, an app, an internal system — and the section appears on your site."
      deleteDescription={(service) =>
        `“${service.title}” will be removed from the What I offer section.`
      }
      summary={(service) => {
        const Icon = resolveIcon(service.icon);
        return (
          <span className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon aria-hidden className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {service.title}
                </span>
                {service.featured ? (
                  <Star
                    aria-label="Featured"
                    className="h-3 w-3 shrink-0 fill-primary text-primary"
                  />
                ) : null}
                {!service.visible ? (
                  <span className="shrink-0 rounded border border-border px-1.5 text-[10px] uppercase text-muted-foreground">
                    Hidden
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {service.deliverables.length} deliverable
                {service.deliverables.length === 1 ? "" : "s"}
                {service.note ? ` · ${service.note}` : null}
              </span>
            </span>
          </span>
        );
      }}
      fields={({ register, control, formState: { errors } }) => (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
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

            <Field label="Title" error={errors.title?.message} required>
              {(props) => (
                <input
                  {...register("title")}
                  {...props}
                  className={inputClass}
                  placeholder="Website development"
                />
              )}
            </Field>
          </div>

          <Field
            label="Summary"
            hint="One or two sentences. Lead with the outcome, not the tech."
            error={errors.summary?.message}
          >
            {(props) => (
              <textarea
                {...register("summary")}
                {...props}
                rows={3}
                className={textareaClass}
                placeholder="Marketing sites built to load fast, rank well, and stay easy to update."
              />
            )}
          </Field>

          <Controller
            control={control}
            name="deliverables"
            render={({ field }) => (
              <RepeatableList
                label="What's included"
                hint="Concrete deliverables, shown as a checklist on the card."
                variant="input"
                placeholder="CMS so you can edit content yourself"
                addLabel="Add deliverable"
                values={field.value ?? []}
                onChange={field.onChange}
                error={errors.deliverables?.message}
              />
            )}
          />

          <Field
            label="Badge"
            hint="Optional lead time or pricing note, e.g. “From 2 weeks”."
            error={errors.note?.message}
          >
            {(props) => (
              <input
                {...register("note")}
                {...props}
                className={inputClass}
                placeholder="From 2 weeks"
              />
            )}
          </Field>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Controller
                control={control}
                name="featured"
                render={({ field }) => (
                  <Switch
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              Featured
            </label>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <Controller
                control={control}
                name="visible"
                render={({ field }) => (
                  <Switch
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              Show on site
            </label>
          </div>
        </div>
      )}
    />
  );
}
