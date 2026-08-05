"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { CollectionEditor } from "@/components/admin/collection-editor";
import { Field, inputClass } from "@/components/admin/form-field";
import { IconPicker } from "@/components/admin/icon-picker";
import { Switch } from "@/components/ui/switch";
import {
  createContactLink,
  createNavItem,
  createSocialLink,
  deleteContactLink,
  deleteNavItem,
  deleteSocialLink,
  reorderContactLinks,
  reorderNavItems,
  reorderSocialLinks,
  updateContactLink,
  updateNavItem,
  updateSocialLink,
} from "@/lib/actions/content";
import type { ContactLink, NavItem, SocialLink } from "@/db/schema";
import { resolveIcon } from "@/lib/design-tokens";
import {
  contactLinkSchema,
  navItemSchema,
  socialLinkSchema,
} from "@/lib/validators/content";

/**
 * The three link lists. They share `CollectionEditor`, so only their fields and
 * summaries differ.
 */

/** Header/footer placement, common to menu items and social links. */
function PlacementToggles({
  control,
}: {
  // Both schemas expose the same two boolean fields; typing the control loosely
  // here avoids duplicating this block per schema.
  control: UseFormReturn<{
    showInHeader?: boolean;
    showInFooter?: boolean;
  }>["control"];
}) {
  return (
    <div className="flex flex-wrap gap-4">
      {(["showInHeader", "showInFooter"] as const).map((name) => (
        <label
          key={name}
          className="flex items-center gap-2 text-sm text-foreground"
        >
          <Controller
            control={control}
            name={name}
            render={({ field }) => (
              <Switch
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
              />
            )}
          />
          {name === "showInHeader" ? "Header" : "Footer"}
        </label>
      ))}
    </div>
  );
}

function placementSummary(item: { showInHeader: boolean; showInFooter: boolean }) {
  const places = [
    item.showInHeader && "header",
    item.showInFooter && "footer",
  ].filter(Boolean);

  return places.length > 0 ? places.join(" + ") : "hidden";
}

// ── Menu ─────────────────────────────────────────────────────────────────────

export function NavItemEditor({ items }: { items: NavItem[] }) {
  return (
    <CollectionEditor
      items={items}
      schema={navItemSchema}
      noun="menu item"
      blank={{ label: "", href: "#", showInHeader: true, showInFooter: true }}
      toFormValues={(item) => ({
        label: item.label,
        href: item.href,
        showInHeader: item.showInHeader,
        showInFooter: item.showInFooter,
      })}
      create={createNavItem}
      update={updateNavItem}
      remove={deleteNavItem}
      reorder={reorderNavItems}
      emptyTitle="No menu items"
      emptyDescription="Your header navigation is empty."
      deleteDescription={(item) =>
        `“${item.label}” will be removed from the menu.`
      }
      summary={(item) => (
        <>
          <span className="block text-sm font-medium text-foreground">
            {item.label}
          </span>
          <span className="block truncate font-mono text-xs text-muted-foreground">
            {item.href} · {placementSummary(item)}
          </span>
        </>
      )}
      fields={({ register, control, formState: { errors } }) => (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Label" error={errors.label?.message} required>
              {(props) => (
                <input
                  {...register("label")}
                  {...props}
                  className={inputClass}
                  placeholder="Projects"
                />
              )}
            </Field>

            <Field
              label="Link"
              hint="An anchor like #projects, or a full URL."
              error={errors.href?.message}
              required
            >
              {(props) => (
                <input
                  {...register("href")}
                  {...props}
                  className={inputClass}
                  placeholder="#projects"
                />
              )}
            </Field>
          </div>

          <PlacementToggles control={control as never} />
        </div>
      )}
    />
  );
}

// ── Social ───────────────────────────────────────────────────────────────────

export function SocialLinkEditor({ links }: { links: SocialLink[] }) {
  return (
    <CollectionEditor
      items={links}
      schema={socialLinkSchema}
      noun="social link"
      blank={{
        icon: "Github",
        label: "",
        href: "",
        showInHeader: true,
        showInFooter: true,
      }}
      toFormValues={(link) => ({
        icon: link.icon,
        label: link.label,
        href: link.href,
        showInHeader: link.showInHeader,
        showInFooter: link.showInFooter,
      })}
      create={createSocialLink}
      update={updateSocialLink}
      remove={deleteSocialLink}
      reorder={reorderSocialLinks}
      emptyTitle="No social links"
      emptyDescription="Add GitHub, LinkedIn, or anywhere else you want to point people."
      deleteDescription={(link) => `The ${link.label} link will be removed.`}
      summary={(link) => {
        const Icon = resolveIcon(link.icon);
        return (
          <span className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon aria-hidden className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                {link.label}
              </span>
              <span className="block truncate font-mono text-xs text-muted-foreground">
                {link.href} · {placementSummary(link)}
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

            <Field label="Label" error={errors.label?.message} required>
              {(props) => (
                <input
                  {...register("label")}
                  {...props}
                  className={inputClass}
                  placeholder="GitHub"
                />
              )}
            </Field>
          </div>

          <Field label="Link" error={errors.href?.message} required>
            {(props) => (
              <input
                {...register("href")}
                {...props}
                className={inputClass}
                placeholder="https://github.com/yourname"
              />
            )}
          </Field>

          <PlacementToggles control={control as never} />
        </div>
      )}
    />
  );
}

// ── Contact ──────────────────────────────────────────────────────────────────

export function ContactLinkEditor({ links }: { links: ContactLink[] }) {
  return (
    <CollectionEditor
      items={links}
      schema={contactLinkSchema}
      noun="contact method"
      blank={{ icon: "Mail", label: "", value: "", href: "", visible: true }}
      toFormValues={(link) => ({
        icon: link.icon,
        label: link.label,
        value: link.value,
        href: link.href,
        visible: link.visible,
      })}
      create={createContactLink}
      update={updateContactLink}
      remove={deleteContactLink}
      reorder={reorderContactLinks}
      emptyTitle="No contact methods"
      emptyDescription="Visitors can still use the form, but nothing else is listed."
      deleteDescription={(link) =>
        `The ${link.label} card will be removed from the contact section.`
      }
      summary={(link) => {
        const Icon = resolveIcon(link.icon);
        return (
          <span className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon aria-hidden className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                {link.label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {link.value}
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

            <Field label="Label" error={errors.label?.message} required>
              {(props) => (
                <input
                  {...register("label")}
                  {...props}
                  className={inputClass}
                  placeholder="Email"
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Display text"
              hint="What visitors read on the card."
              error={errors.value?.message}
              required
            >
              {(props) => (
                <input
                  {...register("value")}
                  {...props}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              )}
            </Field>

            <Field
              label="Link"
              hint="mailto:, tel:, or a URL."
              error={errors.href?.message}
              required
            >
              {(props) => (
                <input
                  {...register("href")}
                  {...props}
                  className={inputClass}
                  placeholder="mailto:you@example.com"
                />
              )}
            </Field>
          </div>
        </div>
      )}
    />
  );
}
