"use client";

import { Controller } from "react-hook-form";

import { CollectionEditor } from "@/components/admin/collection-editor";
import { Field, inputClass } from "@/components/admin/form-field";
import { IconPicker } from "@/components/admin/icon-picker";
import {
  createCoreStackItem,
  deleteCoreStackItem,
  reorderCoreStackItems,
  updateCoreStackItem,
} from "@/lib/actions/content";
import type { CoreStackItem } from "@/db/schema";
import { resolveIcon } from "@/lib/design-tokens";
import { coreStackItemSchema } from "@/lib/validators/content";

export function CoreStackEditor({ items }: { items: CoreStackItem[] }) {
  return (
    <CollectionEditor
      items={items}
      schema={coreStackItemSchema}
      noun="item"
      blank={{ icon: "Code2", label: "", visible: true }}
      toFormValues={(item) => ({
        icon: item.icon,
        label: item.label,
        visible: item.visible,
      })}
      create={createCoreStackItem}
      update={updateCoreStackItem}
      remove={deleteCoreStackItem}
      reorder={reorderCoreStackItems}
      emptyTitle="No core stack items"
      emptyDescription="The list beside your About text is empty."
      deleteDescription={(item) => `“${item.label}” will be removed from the list.`}
      summary={(item) => {
        const Icon = resolveIcon(item.icon);
        return (
          <span className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon aria-hidden className="h-3.5 w-3.5" />
            </span>
            <span className="truncate text-sm text-foreground">{item.label}</span>
          </span>
        );
      }}
      fields={({ register, control, formState: { errors } }) => (
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

          <Field label="Label" error={errors.label?.message} required>
            {(props) => (
              <input
                {...register("label")}
                {...props}
                className={inputClass}
                placeholder="React / Next.js & TypeScript"
              />
            )}
          </Field>
        </div>
      )}
    />
  );
}
